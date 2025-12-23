(() => {
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elNew = document.getElementById('new-quote');

  let lastIndex = null;
  let lastPeriod = null;

  // Map period key to a friendly label + image query for background
  const PERIODS = {
    dawn: { label: 'Dawn', query: 'sunrise,soft,calm' },
    morning: { label: 'Morning', query: 'morning,sunlight,coffee' },
    afternoon: { label: 'Afternoon', query: 'bright,afternoon,city' },
    evening: { label: 'Evening', query: 'sunset,orange,calm' },
    night: { label: 'Night', query: 'stars,night,quiet' }
  };

  // Utility: determine time-of-day bucket
  function getPeriod(d = new Date()) {
    const h = d.getHours();
    // Dawn: 5-7
    if (h >= 5 && h < 8) return 'dawn';
    // Morning: 8-11
    if (h >= 8 && h < 12) return 'morning';
    // Afternoon: 12-16
    if (h >= 12 && h < 17) return 'afternoon';
    // Evening: 17-19
    if (h >= 17 && h < 20) return 'evening';
    // Night: 20-4
    return 'night';
  }

  // Pick a random quote from a period, avoid repeating the immediate previous index when possible
  function pickQuoteFor(period) {
    const list = QUOTES[period] || QUOTES['morning'];
    if (!list.length) return { text: '', author: '' };
    let idx;
    if (list.length === 1) idx = 0;
    else {
      idx = Math.floor(Math.random() * list.length);
      // try a couple times to avoid immediate repeat
      if (lastIndex !== null && list.length > 1) {
        let attempts = 0;
        while (idx === lastIndex && attempts < 6) {
          idx = Math.floor(Math.random() * list.length);
          attempts++;
        }
      }
    }
    lastIndex = idx;
    return list[idx];
  }

  // Build Unsplash source URL for period and a cache-busting timestamp to allow some refresh
  function buildBackgroundUrl(period) {
    const q = PERIODS[period]?.query || 'inspiration';
    // Use source.unsplash.com for simple, varied backgrounds matching keywords
    // size chosen to be large but reasonable; no .jpg extension required
    return `https://source.unsplash.com/1600x900/?${encodeURIComponent(q)}`;
  }

  // Preload new background image (returns Promise). Use fade transition when swapping.
  function preloadAndSetBackground(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // apply background with overlay using CSS (body style)
        // add a subtle gradient overlay on top of the image for readability
        document.body.style.backgroundImage = `linear-gradient(180deg, rgba(6,12,28,0.20), rgba(6,12,28,0.65)), url("${url}")`;
        resolve();
      };
      img.onerror = () => {
        // If loading fails, fallback to a gradient background
        document.body.style.backgroundImage = `linear-gradient(135deg, #08357a, #0b2b1a)`;
        resolve();
      };
      // start loading
      img.src = url;
    });
  }

  // Smoothly update quote text and author (fade)
  function updateQuoteDisplay({ text, author }, periodLabel) {
    // Fade out
    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      elQuote.textContent = `“${text}”`;
      elAuthor.textContent = author ? `— ${author}` : '';
      elPeriod.textContent = periodLabel;
      // Fade in
      elQuote.classList.remove('fade-out');
      elAuthor.classList.remove('fade-out');
      elQuote.classList.add('fade-in');
      elAuthor.classList.add('fade-in');

      // Remove fade-in after transition to keep DOM clean
      setTimeout(() => {
        elQuote.classList.remove('fade-in');
        elAuthor.classList.remove('fade-in');
      }, 500);
    }, 220);
  }

  // Update time display and next-change countdown text
  function updateClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    elTime.textContent = `${hh}:${mm}`;

    const secondsLeft = 60 - now.getSeconds();
    elNext.textContent = `Next update in ${secondsLeft}s`;
  }

  // Main update routine: determines period, picks quote, preloads background, then updates UI.
  async function performUpdate(force = false) {
    const now = new Date();
    const period = getPeriod(now);

    // If period changed or force, pick a new quote and background
    if (force || period !== lastPeriod) {
      lastPeriod = period;

      const quote = pickQuoteFor(period);
      const periodLabel = PERIODS[period]?.label || period;

      // Build image URL and preload
      const bgUrl = buildBackgroundUrl(period);
      // Preload and then update UI to avoid flash
      await preloadAndSetBackground(bgUrl);

      updateQuoteDisplay(quote, periodLabel);
    } else {
      // Same period: pick another quote (random) and update only quote
      const quote = pickQuoteFor(period);
      updateQuoteDisplay(quote, PERIODS[period].label);
    }
    // Update clock text immediately
    updateClock();
  }

  // Schedule updates to happen exactly on the minute tick.
  function scheduleMinuteUpdates() {
    // Clear existing timers if we ever want to re-schedule (not used here)
    // compute ms until next minute
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    // run at the next minute boundary
    setTimeout(() => {
      // perform update on the minute
      performUpdate();
      // then set interval to run every full minute
      setInterval(() => {
        performUpdate();
      }, 60 * 1000);
    }, msToNextMinute);
  }

  // Manual "New now" action: show a new quote immediately (but keep period/background unless period changed)
  elNew.addEventListener('click', () => {
    performUpdate(true);
  });

  // Keyboard: spacebar -> new quote
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      performUpdate(true);
    }
  });

  // Initial load: perform update and start minute schedule and clock refresh
  (async function init() {
    await performUpdate(true);
    scheduleMinuteUpdates();

    // update seconds countdown every second
    setInterval(updateClock, 1000);
  })();
})();