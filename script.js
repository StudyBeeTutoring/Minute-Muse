/* 
   MINUTE MUSE - COZY EDITION
   Includes: Real-time Book Quotes, Seasonal Awareness, Hemisphere Detection
*/

(() => {
  // --- DOM ELEMENTS ---
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elNew = document.getElementById('new-quote');
  const elGreeting = document.getElementById('greeting');
  const elSeasonBadge = document.getElementById('season-badge');

  // --- STATE ---
  let lastPeriod = null;
  let currentQuoteData = null;
  let currentSeason = 'neutral';
  let userHemisphere = 'north'; // default

  // --- FALLBACK QUOTES (If API fails) ---
  const FALLBACK_TEMPLATES = [
    "The clock showed {time}, and the world held its breath.",
    "It was {time}. A quiet moment in a busy world.",
    "At exactly {time}, the light shifted in the room.",
    "She looked at the time: {time}. The day was still hers.",
    "He checked his watch. {time}. Time to begin."
  ];

  // --- CONFIGURATION ---
  const PERIODS = {
    dawn: { label: 'Dawn', baseQuery: 'sunrise,mist,fog' },
    morning: { label: 'Morning', baseQuery: 'morning,coffee,window,sunlight' },
    afternoon: { label: 'Afternoon', baseQuery: 'library,books,afternoon,light' },
    evening: { label: 'Evening', baseQuery: 'sunset,lamp,cozy,street' },
    night: { label: 'Night', baseQuery: 'night,stars,moon,candle' }
  };

  const SEASONS = {
    winter: { label: 'Winter', query: 'snow,winter,cold,fireplace' },
    spring: { label: 'Spring', query: 'flowers,spring,green,garden' },
    summer: { label: 'Summer', query: 'summer,beach,sun,warm' },
    autumn: { label: 'Autumn', query: 'autumn,leaves,rain,orange' }
  };

  // --- LOGIC: TIME & SEASON ---

  function getPeriod(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  function detectLocationAndSeason() {
    const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
    
    // 1. Guess Hemisphere from Timezone
    // (Most timezones in format "Region/City")
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const southernRegions = ['Australia', 'Africa/Johannesburg', 'America/Sao_Paulo', 'Pacific', 'Atlantic/Stanley'];
    
    // Simple check: if timezone string starts with 'Australia' or is in list -> South
    // This is a rough heuristic.
    let isSouth = southernRegions.some(r => tz.includes(r));
    
    // Refined check: specific handling can be complex, defaulting to North mostly unless specific keywords found
    if (tz.includes("Australia") || tz.includes("New_Zealand") || tz.includes("Argentina") || tz.includes("Chile") || tz.includes("South_Africa")) {
      isSouth = true;
    }
    
    userHemisphere = isSouth ? 'south' : 'north';

    // 2. Determine Season based on Month + Hemisphere
    // Northern: Winter (11,0,1), Spring (2,3,4), Summer (5,6,7), Autumn (8,9,10)
    // Southern: Summer (11,0,1), Autumn (2,3,4), Winter (5,6,7), Spring (8,9,10)
    
    if (month === 11 || month === 0 || month === 1) currentSeason = isSouth ? 'summer' : 'winter';
    else if (month >= 2 && month <= 4) currentSeason = isSouth ? 'autumn' : 'spring';
    else if (month >= 5 && month <= 7) currentSeason = isSouth ? 'winter' : 'summer';
    else currentSeason = isSouth ? 'spring' : 'autumn';

    // Update Badge
    elSeasonBadge.textContent = `${SEASONS[currentSeason].label} in ${tz.split('/')[1] || 'Your Area'}`;
  }

  function getGreeting(h) {
    if (h < 5) return "Good Night, Owl";
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    if (h < 22) return "Good Evening";
    return "Sleep Well";
  }

  // --- LOGIC: IMAGES ---

  function buildBackgroundUrl(period) {
    // Combine Period keywords + Season keywords
    const pData = PERIODS[period];
    const sData = SEASONS[currentSeason];
    
    const query = `${pData.baseQuery},${sData.query}`;
    const randomLock = Math.floor(Math.random() * 5000);
    
    // LoremFlickr allows searching by keywords
    return `https://loremflickr.com/1600/900/${encodeURIComponent(query)}?lock=${randomLock}`;
  }

  function preloadAndSetBackground(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        document.body.style.backgroundImage = `url("${url}")`;
        resolve();
      };
      img.onerror = () => {
        // Fallback: Just a dark gradient
        document.body.style.backgroundImage = `linear-gradient(to bottom, #111, #222)`;
        resolve();
      };
      img.src = url;
    });
  }

  // --- LOGIC: QUOTES ---

  async function fetchRealQuote(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const url = `https://raw.githubusercontent.com/JohannesNE/literature-clock/master/docs/times/${hh}_${mm}.json`;

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('No quote');
      return await res.json();
    } catch (e) {
      return null;
    }
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

  function updateDisplay(quoteData, periodLabel) {
    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      // Build quote HTML
      let qText = quoteData.text;
      // Simple clean up
      qText = qText.replace(/<br>/g, ' '); 

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

    // Update Greetings
    elGreeting.textContent = getGreeting(h);

    // Determine if we need image update
    if (force || period !== lastPeriod) {
      lastPeriod = period;
      detectLocationAndSeason(); // Refresh season logic
      const bgUrl = buildBackgroundUrl(period);
      preloadAndSetBackground(bgUrl);
    }

    // Fetch Quote
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

    updateDisplay(finalQuote, PERIODS[period].label);
    
    // Reset clock text immediately
    const hh = String(h).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    elTime.textContent = `${hh}:${mm}`;
  }

  // --- INIT ---

  // Detect season once on load
  detectLocationAndSeason();

  // Button Listeners
  elNew.addEventListener('click', () => performUpdate(true));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      performUpdate(true);
    }
  });

  // Timers
  (async function init() {
    await performUpdate(true);

    // Update Seconds Countdown
    setInterval(() => {
      const now = new Date();
      elNext.textContent = `Next page in ${60 - now.getSeconds()}s`;
      if(now.getSeconds() === 0) performUpdate();
    }, 1000);
  })();

})();
