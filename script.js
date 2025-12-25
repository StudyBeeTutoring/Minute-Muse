(() => {
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elNew = document.getElementById('new-quote');
  const elGreeting = document.getElementById('greeting');
  const elSeasonBadge = document.getElementById('season-badge');
  const elPhotoCredit = document.getElementById('photo-credit'); // NEW

  let lastPeriod = null;
  let currentQuoteData = null;
  let climateMode = 'north'; 
  let imageData = null; 

  const TROPICAL_ZONES = [
    'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Bangkok', 'Asia/Jakarta', 
    'Asia/Manila', 'Asia/Ho_Chi_Minh', 'Asia/Phnom_Penh', 
    'Pacific/Honolulu', 'America/Bogota', 'Africa/Lagos'
  ];

  function isTropical(tz) {
    if (TROPICAL_ZONES.includes(tz)) return true;
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
    "At exactly {time}, the light shifted in the room."
  ];

  function detectClimate() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isTropical(tz)) {
      climateMode = 'tropical';
      elSeasonBadge.textContent = `Tropical Weather in ${tz.split('/')[1].replace('_', ' ')}`;
      return;
    }
    const southernRegions = ['Australia', 'Johannesburg', 'Sao_Paulo', 'Santiago', 'Auckland', 'Africa/Windhoek'];
    let isSouth = southernRegions.some(r => tz.includes(r)) || tz.startsWith("Australia/");

    if (isSouth) {
      climateMode = 'south';
      elSeasonBadge.textContent = `Southern Hemisphere • ${tz.split('/')[1]}`;
    } else {
      climateMode = 'north';
      elSeasonBadge.textContent = `Northern Hemisphere • ${tz.split('/')[1]}`;
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

  async function loadImages() {
    try {
      const res = await fetch('images.json');
      if (!res.ok) throw new Error("JSON not found");
      imageData = await res.json();
    } catch (e) { console.warn("Fallback"); }
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
    return { text: tmpl.replace("{time}", t), author: "The Narrator", title: "Life, Unscripted" };
  }

  // --- UPDATED BACKGROUND LOGIC ---
  function updateBackground(period) {
    if (imageData && imageData[climateMode] && imageData[climateMode][period]) {
      const images = imageData[climateMode][period];
      
      // Get random IMAGE OBJECT (contains url, name, link)
      const imgObj = images[Math.floor(Math.random() * images.length)];
      
      // 1. Set Background
      const img = new Image();
      img.onload = () => { document.body.style.backgroundImage = `url("${imgObj.url}")`; };
      img.src = imgObj.url;

      // 2. Set Credit with Unsplash Referral links (required by API TOS)
      elPhotoCredit.innerHTML = `Photo by <a href="${imgObj.link}?utm_source=MinuteMuse&utm_medium=referral" target="_blank">${imgObj.name}</a> on <a href="https://unsplash.com/?utm_source=MinuteMuse&utm_medium=referral" target="_blank">Unsplash</a>`;
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

    if (force || period !== lastPeriod) {
      lastPeriod = period;
      detectClimate(); 
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

  (async function init() {
    await loadImages();
    detectClimate();
    await performUpdate(true);
    elNew.addEventListener('click', () => performUpdate(true));
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); performUpdate(true); }
    });
    setInterval(() => {
      const now = new Date();
      elNext.textContent = `Next page in ${60 - now.getSeconds()}s`;
      if(now.getSeconds() === 0) performUpdate();
    }, 1000);
  })();
})();
