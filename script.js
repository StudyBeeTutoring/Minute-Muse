/* 
   MINUTE MUSE - COZY EDITION (Fixed Images)
   Includes: Real-time Book Quotes, Seasonal Awareness, AI Background Generation
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
  let userHemisphere = 'north'; 

  // --- FALLBACK QUOTES ---
  const FALLBACK_TEMPLATES = [
    "The clock showed {time}, and the world held its breath.",
    "It was {time}. A quiet moment in a busy world.",
    "At exactly {time}, the light shifted in the room.",
    "She looked at the time: {time}. The day was still hers.",
    "He checked his watch. {time}. Time to begin."
  ];

  // --- CONFIGURATION ---
  // We use these descriptions to build a prompt for the AI
  const PERIODS = {
    dawn: { label: 'Dawn', prompt: 'calm serene sunrise, morning mist, soft golden light, cinematic lighting' },
    morning: { label: 'Morning', prompt: 'cozy morning aesthetic, sunlight streaming through window, coffee cup, morning vibe' },
    afternoon: { label: 'Afternoon', prompt: 'bright afternoon, beautiful architecture, library, study vibe, sunbeams' },
    evening: { label: 'Evening', prompt: 'sunset hour, golden hour, warm lighting, cozy living room, street lights turning on' },
    night: { label: 'Night', prompt: 'starry night sky, moonlight, cozy dark room, candle light, cinematic blue and orange tones' }
  };

  const SEASONS = {
    winter: { label: 'Winter', prompt: 'winter season, snow outside, frost on window, fireplace, cold atmosphere' },
    spring: { label: 'Spring', prompt: 'spring season, blooming flowers, green nature, fresh air, rain outside' },
    summer: { label: 'Summer', prompt: 'summer season, warm sun, beach breeze, vibrant colors, clear sky' },
    autumn: { label: 'Autumn', prompt: 'autumn season, falling orange leaves, rainy mood, cozy sweater weather' }
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
    const month = new Date().getMonth(); 
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Simple Hemisphere Detection
    let isSouth = false;
    const southernRegions = ['Australia', 'Johannesburg', 'Sao_Paulo', 'Santiago', 'Auckland'];
    if (southernRegions.some(r => tz.includes(r))) isSouth = true;
    
    userHemisphere = isSouth ? 'south' : 'north';

    // Assign Season
    if (month === 11 || month === 0 || month === 1) currentSeason = isSouth ? 'summer' : 'winter';
    else if (month >= 2 && month <= 4) currentSeason = isSouth ? 'autumn' : 'spring';
    else if (month >= 5 && month <= 7) currentSeason = isSouth ? 'winter' : 'summer';
    else currentSeason = isSouth ? 'spring' : 'autumn';

    elSeasonBadge.textContent = `${SEASONS[currentSeason].label} in ${tz.split('/')[1] || 'Your Area'}`;
  }

  function getGreeting(h) {
    if (h < 5) return "Good Night, Dreamer";
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    if (h < 22) return "Good Evening";
    return "Sleep Well";
  }

  // --- LOGIC: IMAGES (UPDATED TO USE AI GENERATION) ---

  function buildBackgroundUrl(period) {
    const pData = PERIODS[period];
    const sData = SEASONS[currentSeason];
    
    // Construct a rich prompt for the AI
    // e.g. "cinematic photography of winter season, snow outside... starry night sky..."
    const prompt = `cinematic photography of ${sData.prompt}, ${pData.prompt}, highly detailed, 8k, scenery, no people`;
    
    // Add a random seed so the image changes when we want it to
    const seed = Math.floor(Math.random() * 10000);
    
    // Pollinations API URL structure
    // We request 1600x900 size, and nologo=true
    return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1600&height=900&nologo=true&seed=${seed}&model=flux`;
  }

  function preloadAndSetBackground(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Apply image
        document.body.style.backgroundImage = `url("${url}")`;
        resolve();
      };
      
      img.onerror = () => {
        // Fallback if AI fails: Dark Gradient
        document.body.style.backgroundImage = `linear-gradient(to bottom, #0f2027, #203a43, #2c5364)`;
        resolve();
      };
      
      img.src = url;
    });
  }

  // --- LOGIC: QUOTES (UNCHANGED) ---

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
      let qText = quoteData.text;
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

    elGreeting.textContent = getGreeting(h);

    // Update Background if period changed or forced
    if (force || period !== lastPeriod) {
      lastPeriod = period;
      detectLocationAndSeason(); 
      const bgUrl = buildBackgroundUrl(period);
      // We don't await here to let quotes load fast, background will snap in when ready
      preloadAndSetBackground(bgUrl);
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

    updateDisplay(finalQuote, PERIODS[period].label);
    
    const hh = String(h).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    elTime.textContent = `${hh}:${mm}`;
  }

  // --- INIT ---

  detectLocationAndSeason();

  elNew.addEventListener('click', () => performUpdate(true));
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      performUpdate(true);
    }
  });

  (async function init() {
    await performUpdate(true);
    setInterval(() => {
      const now = new Date();
      elNext.textContent = `Next page in ${60 - now.getSeconds()}s`;
      if(now.getSeconds() === 0) performUpdate();
    }, 1000);
  })();

})();
