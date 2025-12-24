(() => {
  const elQuote = document.getElementById('quote');
  const elAuthor = document.getElementById('author');
  const elTime = document.getElementById('time');
  const elPeriod = document.getElementById('period');
  const elNext = document.getElementById('next-change');
  const elNew = document.getElementById('new-quote');

  let lastPeriod = null;
  let currentQuoteData = null; // Store fetched quotes for the current minute

  const PERIODS = {
    dawn: { label: 'Dawn', query: 'sunrise,nature' },
    morning: { label: 'Morning', query: 'sunlight,coffee' },
    afternoon: { label: 'Afternoon', query: 'city,architecture' },
    evening: { label: 'Evening', query: 'sunset,street' },
    night: { label: 'Night', query: 'stars,night,lamp' }
  };

  function getPeriod(d = new Date()) {
    const h = d.getHours();
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  // Use LoremFlickr for reliable backgrounds
  function buildBackgroundUrl(period) {
    const q = PERIODS[period]?.query || 'nature';
    const randomLock = Math.floor(Math.random() * 1000);
    return `https://loremflickr.com/1600/900/${q}?lock=${randomLock}`;
  }

  function preloadAndSetBackground(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        document.body.style.backgroundImage = `linear-gradient(180deg, rgba(6,12,28,0.20), rgba(6,12,28,0.65)), url("${url}")`;
        resolve();
      };
      img.onerror = () => {
        document.body.style.backgroundImage = `linear-gradient(135deg, #08357a, #0b2b1a)`;
        resolve();
      };
      img.src = url;
    });
  }

  // --- NEW: FETCH REAL BOOK QUOTES ---
  async function fetchRealQuote(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const fileName = `${hh}_${mm}.json`;
    
    // Using the raw GitHub data from the Literature Clock project
    const url = `https://raw.githubusercontent.com/JohannesNE/literature-clock/master/docs/times/${fileName}`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('No quote found');
      const data = await response.json();
      // The API returns an array of quotes for this minute
      return data; 
    } catch (e) {
      return null; // Return null to trigger fallback
    }
  }

  function updateQuoteDisplay({ text, author, title }, periodLabel) {
    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      elQuote.innerHTML = `“${text}”`; // Use innerHTML to handle possible bolding from API
      
      // If we have a book title (from API), show it
      if (title) {
        elAuthor.innerHTML = `— <span class="author-name">${author}</span>, <em>${title}</em>`;
      } else {
        elAuthor.textContent = `— ${author}`;
      }
      
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

    // Background update
    if (force || period !== lastPeriod) {
      lastPeriod = period;
      const bgUrl = buildBackgroundUrl(period);
      preloadAndSetBackground(bgUrl);
    }

    // Try to get real quotes for this minute
    // We cache them in `currentQuoteData` so "New Now" doesn't re-fetch unnecessarily
    if (!currentQuoteData || force || now.getSeconds() === 0) {
       // Only fetch if we moved to a new minute or don't have data
       currentQuoteData = await fetchRealQuote(now);
    }

    let quoteToDisplay;

    if (currentQuoteData && currentQuoteData.length > 0) {
      // Pick a random quote from the real book list
      const randomItem = currentQuoteData[Math.floor(Math.random() * currentQuoteData.length)];
      quoteToDisplay = {
        text: randomItem.quote_first + " " + randomItem.quote_time_case + " " + randomItem.quote_last,
        author: randomItem.author,
        title: randomItem.title
      };
    } else {
      // FALLBACK: Use the generated template
      console.log("Using fallback quote");
      quoteToDisplay = QuoteFallback.get(period, now);
    }

    updateQuoteDisplay(quoteToDisplay, periodData.label);
    updateClock();
  }

  function scheduleMinuteUpdates() {
    const now = new Date();
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    setTimeout(() => {
      // Reset data cache on minute tick so we fetch new quotes
      currentQuoteData = null; 
      performUpdate();
      setInterval(() => {
        currentQuoteData = null;
        performUpdate();
      }, 60 * 1000);
    }, msToNextMinute);
  }

  elNew.addEventListener('click', () => {
    performUpdate(true);
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      performUpdate(true);
    }
  });

  (async function init() {
    await performUpdate(true);
    scheduleMinuteUpdates();
    setInterval(updateClock, 1000);
  })();
})();
