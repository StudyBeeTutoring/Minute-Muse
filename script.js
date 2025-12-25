/* 
   MINUTE MUSE - SMART EDITION
   Detects: Tropical vs Temperate, North vs South
*/

(() => {
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elNew = document.getElementById('new-quote');
  const elGreeting = document.getElementById('greeting');
  const elSeasonBadge = document.getElementById('season-badge');

  // State
  let lastPeriod = null;
  let currentQuoteData = null;
  let climateMode = 'north'; // 'north', 'south', or 'tropical'
  let imageData = null; 

  // --- CONFIG ---

  const TROPICAL_ZONES = [
    'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Bangkok', 'Asia/Jakarta', 
    'Asia/Manila', 'Asia/Ho_Chi_Minh', 'Asia/Phnom_Penh', 'Asia/Yangon',
    'Pacific/Honolulu', 'America/Bogota', 'America/Panama', 'America/Caracas',
    'Africa/Lagos', 'Africa/Nairobi', 'Asia/Colombo', 'Indian/Maldives'
  ];

  // Helper to guess if a zone is tropical based on partial match
  function isTropical(tz) {
    // Exact match
    if (TROPICAL_ZONES.includes(tz)) return true;
    // Heuristic: If specific keywords appear (unreliable but helpful backup)
    if (tz.includes("Kolkata") || tz.includes("Darwin")) return true;
    return false;
  }

  const PERIODS_CONFIG = {
    dawn: { label: 'Dawn' },
    morning: { label: 'Morning' },
    afternoon: { label: 'Afternoon' },
    evening: { label: 'Evening' },
    night: { label: 'Night' }
  };

  const FALLBACK_TEMPLATES = [
    "The clock showed {time}, and the world held its breath.",
    "It was {time}. A quiet moment in a busy world.",
    "At exactly {time}, the light shifted in the room.",
    "She looked at the time: {time}. The day was still hers.",
    "He checked his watch. {time}. Time to begin."
  ];

  // --- LOGIC: LOCATION ---

  function detectClimate() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // 1. Check for Tropical (Singapore, etc)
    if (isTropical(tz)) {
      climateMode = 'tropical';
      elSeasonBadge.textContent = `Tropical Weather in ${tz.split('/')[1].replace('_', ' ')}`;
      return;
    }

    // 2. If not tropical, check Hemisphere
    // Southern Hemisphere triggers
    const southernRegions = ['Australia', 'Johannesburg', 'Sao_Paulo', 'Santiago', 'Auckland', 'Pacific/Auckland', 'Africa/Windhoek'];
    let isSouth = southernRegions.some(r => tz.includes(r)) || tz.startsWith("Australia/");

    if (isSouth) {
      climateMode = 'south';
      // We don't need to calculate "Winter/Summer" here because the JSON 
      // already contains the correct images for the South right now.
      elSeasonBadge.textContent = `Southern Hemisphere • ${tz.split('/')[1] || 'South'}`;
    } else {
      climateMode = 'north';
      elSeasonBadge.textContent = `Northern Hemisphere • ${tz.split('/')[1] || 'North'}`;
    }
  }

  function getPeriod(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  function getGreeting(h) {
    if (h < 5) return "Good Night, Dreamer";
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    if (h < 22) return "Good Evening";
    return "Sleep Well";
  }

  // --- DATA LOADING ---

  async function loadImages() {
    try {
      const res = await fetch('images.json');
      if (!res.ok) throw new Error("JSON not found");
      imageData = await res.json();
    } catch (e) {
      console.warn("Using fallback gradients.");
    }
  }

  async function fetchRealQuote(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const url = `https://raw.githubusercontent.com/JohannesNE/literature-clock/master/docs/times/${hh}_${mm}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('No quote');
      return await res.json();
    } catch (e) { return null; }
  }

  function getFallbackQuote(date) {
    const t = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const tmpl = FALLBACK_TEMPLATES[Math.floor(Math.random() * FALLBACK_TEMPLATES.length)];
    return {
      text: tmpl.replace("{time}", t),
      author: "The Narrator",
      title: "Life, Unscripted"
    };
  }

  // --- UI UPDATES ---

  function updateBackground(period) {
    // 1. Check if we have data for the user's climate mode
    if (imageData && imageData[climateMode] && imageData[climateMode][period]) {
      
      const images = imageData[climateMode][period];
      
      // 2. Pick a random one from the 3 available options
      // This ensures even if the period is the same, clicking "New Now" might cycle the image
      const randomUrl = images[Math.floor(Math.random() * images.length)];
      
      const img = new Image();
      img.onload = () => { document.body.style.backgroundImage = `url("${randomUrl}")`; };
      img.src = randomUrl;
    } else {
      document.body.style.backgroundImage = `linear-gradient(to bottom, #0f2027, #2c5364)`;
    }
  }

  function updateDisplay(quoteData, periodLabel) {
    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      let qText = quoteData.text.replace(/<br>/g, ' '); 
      elQuote.innerHTML = `“${qText}”`;
      
      if (quoteData.title) {
        elAuthor.innerHTML = `<span class="author-name">${quoteData.author}</span><br><em>${quoteData.title}</em>`;
      } else {
        elAuthor.textContent = quoteData.author;
      }
      elPeriod.textContent = periodLabel;

      elQuote.classList.remove('fade-out');
      elAuthor.classList.remove('fade-out');
      elQuote.classList.add('fade-in');
      elAuthor.classList.add('fade-in');

      setTimeout(() => {
        elQuote.classList.remove('fade-in');
        elAuthor.classList.remove('fade-in');
      }, 800);
    }, 500);
  }

  async function performUpdate(force = false) {
    const now = new Date();
    const h = now.getHours();
    const period = getPeriod(h);

    elGreeting.textContent = getGreeting(h);

    // Update background if period changed OR force (New Now button)
    if (force || period !== lastPeriod) {
      lastPeriod = period;
      detectClimate(); // Re-check climate (edge case: user changed timezone)
      updateBackground(period);
    }

    if (!currentQuoteData || force || now.getSeconds() === 0) {
      currentQuoteData = await fetchRealQuote(now);
    }

    let finalQuote;
    if (currentQuoteData && currentQuoteData.length) {
      const r = currentQuoteData[Math.floor(Math.random() * currentQuoteData.length)];
      finalQuote = {
        text: `${r.quote_first} ${r.quote_time_case} ${r.quote_last}`,
        author: r.author,
        title: r.title
      };
    } else {
      finalQuote = getFallbackQuote(now);
    }

    updateDisplay(finalQuote, PERIODS_CONFIG[period].label);
    const hh = String(h).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    elTime.textContent = `${hh}:${mm}`;
  }

  // --- INIT ---

  (async function init() {
    // Load JSON
    await loadImages();
    detectClimate();
    await performUpdate(true);
    
    elNew.addEventListener('click', () => performUpdate(true));
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            performUpdate(true);
        }
    });

    setInterval(() => {
      const now = new Date();
      elNext.textContent = `Next page in ${60 - now.getSeconds()}s`;
      if(now.getSeconds() === 0) performUpdate();
    }, 1000);
  })();

})();
