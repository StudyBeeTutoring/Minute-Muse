(() => {
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elNew = document.getElementById('new-quote');

  let lastPeriod = null;

  // Map period key to a friendly label + keywords for background
  const PERIODS = {
    dawn: { label: 'Dawn', query: 'sunrise,nature' },
    morning: { label: 'Morning', query: 'sunlight,coffee' },
    afternoon: { label: 'Afternoon', query: 'city,architecture' },
    evening: { label: 'Evening', query: 'sunset,street' },
    night: { label: 'Night', query: 'stars,night,lamp' }
  };

  // Utility: determine time-of-day bucket
  function getPeriod(d = new Date()) {
    const h = d.getHours();
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  // FIXED: Use LoremFlickr instead of the broken Unsplash Source
  function buildBackgroundUrl(period) {
    const q = PERIODS[period]?.query || 'nature';
    // Add a random lock number to ensure the image changes when we want it to
    const randomLock = Math.floor(Math.random() * 1000);
    return `https://loremflickr.com/1600/900/${q}?lock=${randomLock}`;
  }

  // Preload new background image
  function preloadAndSetBackground(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        document.body.style.backgroundImage = `linear-gradient(180deg, rgba(6,12,28,0.20), rgba(6,12,28,0.65)), url("${url}")`;
        resolve();
      };
      img.onerror = () => {
        // Fallback gradient
        document.body.style.backgroundImage = `linear-gradient(135deg, #08357a, #0b2b1a)`;
        resolve();
      };
      img.src = url;
    });
  }

  function updateQuoteDisplay({ text, author }, periodLabel) {
    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      // Logic for quotes: text is now the story sentence
      elQuote.textContent = `“${text}”`; 
      elAuthor.textContent = `— ${author}`;
      elPeriod.textContent = periodLabel;

      elQuote.classList.remove('fade-out');
      elAuthor.classList.remove('fade-out');
      elQuote.classList.add('fade-in');
      elAuthor.classList.add('fade-in');

      setTimeout(() => {
        elQuote.classList.remove('fade-in');
        elAuthor.classList.remove('fade-in');
      }, 500);
    }, 220);
  }

  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    elTime.textContent = `${hh}:${mm}`;
    elNext.textContent = `Next story in ${60 - now.getSeconds()}s`;
  }

  // Main update routine
  async function performUpdate(force = false) {
    const now = new Date();
    const period = getPeriod(now);
    const periodData = PERIODS[period];

    // If period changed OR force clicked, change background
    if (force || period !== lastPeriod) {
      lastPeriod = period;
      const bgUrl = buildBackgroundUrl(period);
      // We don't await this if it's just a minute tick to avoid blocking, 
      // but for "New Now" (force) we might want to.
      preloadAndSetBackground(bgUrl);
    }

    // ALWAYS generate a new quote with the current EXACT time
    // This is the core change: pass 'now' to the generator
    const quoteData = QuoteGenerator.get(period, now);
    
    updateQuoteDisplay(quoteData, periodData.label);
    
    updateClock();
  }

  function scheduleMinuteUpdates() {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    setTimeout(() => {
      performUpdate();
      setInterval(() => {
        performUpdate();
      }, 60 * 1000);
    }, msToNextMinute);
  }

  elNew.addEventListener('click', () => {
    // Force true means get new background AND quote
    performUpdate(true);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      performUpdate(true);
    }
  });

  (async function init() {
    // Initial load
    await performUpdate(true);
    scheduleMinuteUpdates();
    setInterval(updateClock, 1000);
  })();
})();
