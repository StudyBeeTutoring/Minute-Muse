const fs = require('fs');

// Get the key from GitHub Secrets
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// 1. Define the Vibe Keywords
const VIBES = {
  winter: 'winter,snow,cold,cozy,fireplace,frost',
  spring: 'spring,flowers,green,nature,bloom,pastel',
  summer: 'summer,beach,sun,bright,vacation,clear sky',
  autumn: 'autumn,leaves,orange,moody,rain,fog',
  tropical: 'tropical,jungle,palm trees,lush,monsoon,greenery,singapore,bali'
};

// 2. Define Time Periods
const PERIODS = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

// 3. Helper to determine current season based on Month
function getCurrentSeasons() {
  const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
  
  // Standard Meteorological Seasons
  // North: Winter(11,0,1), Spring(2,3,4), Summer(5,6,7), Autumn(8,9,10)
  // South is opposite
  
  if (month === 11 || month === 0 || month === 1) return { north: 'winter', south: 'summer' };
  if (month >= 2 && month <= 4) return { north: 'spring', south: 'autumn' };
  if (month >= 5 && month <= 7) return { north: 'summer', south: 'winter' };
  return { north: 'autumn', south: 'spring' };
}

// 4. Fetch Function
async function fetchImagesForCategory(seasonKey, period, count = 3) {
  // e.g. "tropical, morning" or "winter, night"
  const query = `${VIBES[seasonKey]},${period}`;
  
  // We request 'count' images (Unsplash 'count' param max is 30)
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&count=${count}&client_id=${UNSPLASH_KEY}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    
    // Extract just the regular URLs
    return data.map(img => img.urls.regular);
  } catch (error) {
    console.error(`❌ Failed ${seasonKey} - ${period}:`, error.message);
    // Return a fallback array of 3 generic images so the app doesn't crash
    return Array(count).fill('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1600');
  }
}

async function main() {
  const currentSeasons = getCurrentSeasons();
  console.log(`📅 Date detected. North is ${currentSeasons.north}. South is ${currentSeasons.south}.`);

  // We will build a JSON object like:
  // { north: { dawn: [url1, url2, url3], ... }, south: {...}, tropical: {...} }
  const collection = {
    north: {},
    south: {},
    tropical: {}
  };

  // We want to fetch 3 images for each period for each category
  // Total Requests: 3 categories * 5 periods = 15 API Calls.
  // Note: We use the 'count=3' parameter, so 1 API call gets 3 photos.
  // Total photos = 45. Perfect for your limit.

  const CATEGORIES = [
    { id: 'north', vibe: currentSeasons.north },
    { id: 'south', vibe: currentSeasons.south },
    { id: 'tropical', vibe: 'tropical' }
  ];

  for (const cat of CATEGORIES) {
    console.log(`\n📸 Processing Category: ${cat.id.toUpperCase()} (${cat.vibe})`);
    
    for (const period of PERIODS) {
      process.stdout.write(`   Fetching ${period}... `);
      
      // Delay to be gentle to API
      await new Promise(r => setTimeout(r, 1000));
      
      const images = await fetchImagesForCategory(cat.vibe, period, 3);
      collection[cat.id][period] = images;
      
      console.log(`Done (${images.length} imgs)`);
    }
  }

  // Save to file
  fs.writeFileSync('images.json', JSON.stringify(collection, null, 2));
  console.log("\n✅ Smart images.json generated successfully!");
}

main();
