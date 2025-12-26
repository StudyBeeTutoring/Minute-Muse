/* 
   MINUTE MUSE - ROBUST EDITION
   Includes safety checks to prevent "Stuck Loading"
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
  const elPhotoCredit = document.getElementById('photo-credit');

  // --- STATE ---
  let lastPeriod = null;
  let currentQuoteData = null;
  let climateMode = 'north'; 
  let imageData = null; 

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

  // --- 1. CLIMATE LOGIC ---

  function detectClimate() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const city = tz.split('/')[1] || tz;
      const locationName = city.replace(/_/g, ' ');

      const TROPICAL_KEYWORDS = ['Singapore','Jakarta','Bangkok','Ho_Chi_Minh','Kuala_Lumpur','Manila','Phnom_Penh','Yangon','Colombo','Maldives','Honolulu','Fiji','Jamaica','Puerto_Rico','Barbados','Havana','Bogota','Caracas','Lagos','Nairobi','Accra','Dakar'];
      const SOUTHERN_KEYWORDS = ['Australia','New_Zealand','Auckland','Sydney','Melbourne','Brisbane','Perth','Johannesburg','Cape_Town','Buenos_Aires','Santiago','Sao_Paulo','Rio_de_Janeiro'];

      let detected = 'north';
      if (TROPICAL_KEYWORDS.some(k => tz.includes(k))) detected = 'tropical';
      else if (SOUTHERN_KEYWORDS.some(k => tz.includes(k))) detected = 'south';

      climateMode = detected;

      // Update Badge (Safety Check)
      if (elSeasonBadge) {
        if (detected === 'tropical') elSeasonBadge.textContent = `Tropical Climate • ${locationName}`;
        else {
          const isWinter = [11, 0, 1].includes(new Date().getMonth());
          const season = (detected === 'north' ? isWinter : !isWinter) ? "Winter" : "Summer";
          elSeasonBadge.textContent = `${detected === 'north' ? 'Northern' : 'Southern'} Hemisphere • ${locationName}`;
        }
      }
    } catch (e) {
      console.warn("Climate detection failed:", e);
      climateMode = 'north'; // Default
    }
  }

  function getPeriod(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
  }

  // --- DATA LOADING ---

  async function loadImages() {
    try {
      // Add a timestamp to prevent caching old JSON
      const res = await fetch(`images.json?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error("JSON not found");
      imageData = await res.json();
      console.log("Images loaded successfully");
    } catch (e) {
      console.warn("Using fallback gradients (images.json missing or invalid).");
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
    return { text: tmpl.replace("{time}", t), author: "The Narrator", title: "Life, Unscripted" };
  }

  // --- UI UPDATES ---

  function updateBackground(period) {
    // Safety: Check if imageData exists and has the right structure
    if (imageData && imageData[climateMode] && Array.isArray(imageData[climateMode][period])) {
      
      const images = imageData[climateMode][period];
      const imgObj = images[Math.floor(Math.random() * images.length)];
      
      // Safety: Check if imgObj has a URL
      if(imgObj && imgObj.url) {
        const img = new Image();
        img.onload = () => { document.body.style.backgroundImage = `url("${imgObj.url}")`; };
        img.src = imgObj.url;

        // Update Credit
        if (elPhotoCredit) {
           elPhotoCredit.innerHTML = `Photo by <a href="${imgObj.link}?utm_source=MinuteMuse&utm_medium=referral" target="_blank">${imgObj.name}</a> on <a href="https://unsplash.com/?utm_source=MinuteMuse&utm_medium=referral" target="_blank">Unsplash</a>`;
        }
        return;
      }
    }
    
    // Fallback if anything fails
    document.body.style.backgroundImage = `linear-gradient(to bottom, #0f2027, #2c5364)`;
  }

  function updateDisplay(quoteData, periodLabel) {
    // Safety checks
    if(!elQuote || !elAuthor || !elPeriod) return;

    elQuote.classList.add('fade-out');
    elAuthor.classList.add('fade-out');

    setTimeout(() => {
      let qText = quoteData.text ? quoteData.text.replace(/<br>/g, ' ') : "Thinking..."; 
      elQuote.innerHTML = `“${qText}”`;
      
      if (quoteData.title) {
        elAuthor.innerHTML = `<span class="author-name">${quoteData.author}</span><br><em>${quoteData.title}</em>`;
      } else {
        elAuthor.textContent = quoteData.author || "Unknown";
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

    if (elGreeting) {
       const g = h < 5 ? "Good Night" : h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : h < 22 ? "Good Evening" : "Sleep Well";
       elGreeting.textContent = g;
    }

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
    if(elTime) elTime.textContent = `${hh}:${mm}`;
  }

  // --- INIT ---

  (async function init() {
    await loadImages();
    detectClimate();
    await performUpdate(true);
    
    if(elNew) elNew.addEventListener('click', () => performUpdate(true));
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') { e.preventDefault(); performUpdate(true); }
    });
    
    // Safety check for timer
    if(elNext) {
        setInterval(() => {
          const now = new Date();
          elNext.textContent = `Next page in ${60 - now.getSeconds()}s`;
          if(now.getSeconds() === 0) performUpdate();
        }, 1000);
    }
  })();

})();
