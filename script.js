(() => {
  // --- DOM ELEMENTS ---
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elGreeting = document.getElementById('greeting');
  const elSeasonBadge = document.getElementById('season-badge');
  const elPhotoCredit = document.getElementById('photo-credit');
  const elRain = document.getElementById('rain-effect');

  // Toolbar
  const btnSound = document.getElementById('btn-sound');
  const btnZen = document.getElementById('btn-zen');
  const btnJournal = document.getElementById('btn-journal');
  const btnNew = document.getElementById('new-quote');

  // Journal
  const elJournalOverlay = document.getElementById('journal-overlay');
  const elJournalText = document.getElementById('journal-text');
  const btnCloseJournal = document.getElementById('btn-close-journal');

  // Audio
  const audioRain = document.getElementById('audio-rain');
  const audioFire = document.getElementById('audio-fire');
  const audioNature = document.getElementById('audio-nature');

  // --- STATE ---
  let lastPeriod = null;
  let currentQuoteData = null;
  let climateMode = 'north'; 
  let imageData = null;
  let isMuted = true;
  let isZen = false;

  const PERIODS_CONFIG = {
    dawn: { label: 'Dawn' },
    morning: { label: 'Morning' },
    afternoon: { label: 'Afternoon' },
    evening: { label: 'Evening' },
    night: { label: 'Night' }
  };

  const FALLBACK_TEMPLATES = [
    "The clock showed {time}, and the world held its breath.",
    "It was {time}. A quiet moment in a busy world."
  ];

  // --- 1. FEATURES LOGIC ---

  // AUDIO MANAGER
  function updateAmbience() {
    // Stop all first
    audioRain.pause();
    audioFire.pause();
    audioNature.pause();

    // Turn off visual rain by default
    if(elRain) elRain.style.opacity = '0';

    if (isMuted) {
      btnSound.innerHTML = '<span class="icon">🔇</span>';
      return;
    }

    btnSound.innerHTML = '<span class="icon">🔊</span>';

    // Play based on Climate
    if (climateMode === 'tropical') {
      audioRain.volume = 0.3;
      audioRain.play();
      // Turn on visual rain!
      if(elRain) elRain.style.opacity = '0.4'; 
    } else if (climateMode === 'north') {
      // Winter -> Fireplace
      audioFire.volume = 0.4;
      audioFire.play();
    } else {
      // Summer/South -> Nature
      audioNature.volume = 0.2;
      audioNature.play();
    }
  }

  btnSound.addEventListener('click', () => {
    isMuted = !isMuted;
    updateAmbience();
  });

  // ZEN MODE
  btnZen.addEventListener('click', () => {
    isZen = !isZen;
    document.body.classList.toggle('zen-active', isZen);
  });

  // JOURNAL
  btnJournal.addEventListener('click', () => {
    elJournalText.value = localStorage.getItem('minuteMuseJournal') || "";
    elJournalOverlay.classList.remove('hidden');
  });

  btnCloseJournal.addEventListener('click', () => {
    localStorage.setItem('minuteMuseJournal', elJournalText.value);
    elJournalOverlay.classList.add('hidden');
  });

  // --- 2. CORE LOGIC (Location & Time) ---

  function detectClimate() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const city = tz.split('/')[1] || tz;
      const locationName = city.replace(/_/g, ' ');

      const TROPICAL_KEYWORDS = ['Singapore','Jakarta','Bangkok','Ho_Chi_Minh','Kuala_Lumpur','Manila','Phnom_Penh','Yangon','Colombo','Maldives','Honolulu','Fiji','Jamaica','Bogota','Lagos','Nairobi'];
      const SOUTHERN_KEYWORDS = ['Australia','New_Zealand','Auckland','Sydney','Johannesburg','Cape_Town','Buenos_Aires','Santiago','Sao_Paulo'];

      let detected = 'north';
      if (TROPICAL_KEYWORDS.some(k => tz.includes(k))) detected = 'tropical';
      else if (SOUTHERN_KEYWORDS.some(k => tz.includes(k))) detected = 'south';

      climateMode = detected;

      // Update Badge
      if (detected === 'tropical') elSeasonBadge.textContent = `Tropical Climate • ${locationName}`;
      else elSeasonBadge.textContent = `${detected === 'north' ? 'Northern' : 'Southern'} Hemisphere • ${locationName}`;
      
    } catch (e) {
      climateMode = 'north'; 
    }
  }

  function getPeriod(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  // --- 3. DATA & UI ---

  async function loadImages() {
    try {
      const res = await fetch(`images.json?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error("JSON not found");
      imageData = await res.json();
    } catch (e) { console.warn("Fallback mode"); }
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

  function updateBackground(period) {
    if (imageData && imageData[climateMode] && Array.isArray(imageData[climateMode][period])) {
      const images = imageData[climateMode][period];
      const imgObj = images[Math.floor(Math.random() * images.length)];
      if(imgObj && imgObj.url) {
        const img = new Image();
        img.onload = () => { document.body.style.backgroundImage = `url("${imgObj.url}")`; };
        img.src = imgObj.url;
        elPhotoCredit.innerHTML = `Photo by <a href="${imgObj.link}?utm_source=MinuteMuse&utm_medium=referral" target="_blank">${imgObj.name}</a> on <a href="https://unsplash.com/?utm_source=MinuteMuse&utm_medium=referral" target="_blank">Unsplash</a>`;
        return;
      }
    }
    document.body.style.backgroundImage = `linear-gradient(to bottom, #0f2027, #2c5364)`;
  }

  function updateDisplay(quoteData, periodLabel) {
    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      let qText = quoteData.text ? quoteData.text.replace(/<br>/g, ' ') : "Thinking..."; 
      elQuote.innerHTML = `“${qText}”`;
      if (quoteData.title) elAuthor.innerHTML = `<span class="author-name">${quoteData.author}</span><br><em>${quoteData.title}</em>`;
      else elAuthor.textContent = quoteData.author || "Unknown";
      
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

    const g = h < 5 ? "Good Night" : h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : h < 22 ? "Good Evening" : "Sleep Well";
    elGreeting.textContent = g;

    if (force || period !== lastPeriod) {
      lastPeriod = period;
      detectClimate(); 
      updateBackground(period);
      // Re-trigger audio check in case environment changed
      if(!isMuted) updateAmbience();
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
    await loadImages();
    detectClimate();
    await performUpdate(true);
    
    btnNew.addEventListener('click', () => performUpdate(true));
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
