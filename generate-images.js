const fs = require('fs');

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// 1. Define Keywords
const VIBES = {
  winter: 'winter,snow,cold,cozy,fireplace,frost',
  spring: 'spring,flowers,green,nature,bloom,pastel',
  summer: 'summer,beach,sun,bright,vacation,clear sky',
  autumn: 'autumn,leaves,orange,moody,rain,fog',
  // Added 'nature' to ensure we get results even if specific tags fail
  tropical: 'tropical,jungle,palm trees,lush,monsoon,greenery,singapore,bali,nature'
};

const PERIODS = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

function getCurrentSeasons() {
  const month = new Date().getMonth(); 
  if (month === 11 || month === 0 || month === 1) return { north: 'winter', south: 'summer' };
  if (month >= 2 && month <= 4) return { north: 'spring', south: 'autumn' };
  if (month >= 5 && month <= 7) return { north: 'summer', south: 'winter' };
  return { north: 'autumn', south: 'spring' };
}

async function fetchImagesForCategory(seasonKey, period, count = 3) {
  const query = `${VIBES[seasonKey]},${period}`;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&count=${count}&client_id=${UNSPLASH_KEY}`;

  try {
    const res = await fetch(url);
    
    // ERROR LOGGING: This will tell us if it is a 403 (Rate Limit)
    if (!res.ok) {
        console.error(`   ⚠️ API Error ${res.status}: ${res.statusText}`);
        throw new Error(`Status ${res.status}`);
    }
    
    const data = await res.json();
    
    return data.map(img => ({
      url: img.urls.regular,
      name: img.user.name,
      link: img.user.links.html
    }));

  } catch (error) {
    console.error(`   ❌ Failed to fetch ${seasonKey}-${period}. Using fallback.`);
    // Fallback: Return generic nature images so the app doesn't break
    return Array(count).fill({
      url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1600',
      name: 'Unsplash',
      link: 'https://unsplash.com'
    });
  }
}

async function main() {
  const currentSeasons = getCurrentSeasons();
  console.log(`📅 Date detected. North is ${currentSeasons.north}. South is ${currentSeasons.south}.`);

  const collection = { north: {}, south: {}, tropical: {} };
  
  // REORDERED: Tropical is now FIRST. 
  // If API limit hits, Singapore gets images, North/South get fallbacks.
  const CATEGORIES = [
    { id: 'tropical', vibe: 'tropical' },
    { id: 'north', vibe: currentSeasons.north },
    { id: 'south', vibe: currentSeasons.south }
  ];

  for (const cat of CATEGORIES) {
    console.log(`\n📸 Processing Category: ${cat.id.toUpperCase()}`);
    
    for (const period of PERIODS) {
      process.stdout.write(`   Fetching ${period}... `);
      
      // INCREASED DELAY: 2 seconds to prevent "Burst" blocking
      await new Promise(r => setTimeout(r, 2000));
      
      const images = await fetchImagesForCategory(cat.vibe, period, 3);
      collection[cat.id][period] = images;
      
      // Visual confirm of success
      if(images[0].name === 'Unsplash') process.stdout.write("FAIL (Fallback)\n");
      else process.stdout.write(`OK (${images.length} imgs)\n`);
    }
  }

  fs.writeFileSync('images.json', JSON.stringify(collection, null, 2));
  console.log("\n✅ images.json generated successfully!");
}

main();
