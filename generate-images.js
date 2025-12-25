const fs = require('fs');
// We use dynamic import for node-fetch or native fetch in Node 18+
// This script assumes Node 18+ (standard on GitHub Actions)

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

const SEASONS = ['winter', 'spring', 'summer', 'autumn'];
const PERIODS = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

// Keywords to help Unsplash understand the "Vibe"
const KEYWORDS = {
  winter: 'snow,cold,cozy,fireplace,winter',
  spring: 'flowers,green,nature,bloom,spring',
  summer: 'beach,sun,bright,summer,vacation',
  autumn: 'leaves,orange,moody,rain,autumn',
  dawn: 'sunrise,fog,mist,calm',
  morning: 'morning,coffee,breakfast,light',
  afternoon: 'work,library,architecture,sunlight',
  evening: 'sunset,city lights,golden hour',
  night: 'night,stars,dark,candle'
};

async function fetchImage(season, period) {
  const query = `${KEYWORDS[season]},${KEYWORDS[period]}`;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&client_id=${UNSPLASH_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.urls.regular; // Return the image URL
  } catch (error) {
    console.error(`Failed to fetch ${season} ${period}:`, error.message);
    // Fallback image if API fails (just a generic nature one)
    return 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1600&q=80';
  }
}

async function main() {
  const collection = {};

  console.log("📸 Starting Daily Curation...");

  for (const season of SEASONS) {
    collection[season] = {};
    for (const period of PERIODS) {
      console.log(`   Fetching: ${season} + ${period}`);
      // Pause briefly to be nice to the API
      await new Promise(r => setTimeout(r, 200)); 
      const imageUrl = await fetchImage(season, period);
      collection[season][period] = imageUrl;
    }
  }

  // Save to file
  fs.writeFileSync('images.json', JSON.stringify(collection, null, 2));
  console.log("✅ images.json generated successfully!");
}

main();
