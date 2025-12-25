const fs = require('fs');

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

const VIBES = {
  winter: 'winter,snow,cold,cozy,fireplace,frost',
  spring: 'spring,flowers,green,nature,bloom,pastel',
  summer: 'summer,beach,sun,bright,vacation,clear sky',
  autumn: 'autumn,leaves,orange,moody,rain,fog',
  tropical: 'tropical,jungle,palm trees,lush,monsoon,greenery,singapore,bali'
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
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    
    // UPDATED: Now returning an Object with credit info, not just the string URL
    return data.map(img => ({
      url: img.urls.regular,
      name: img.user.name,
      link: img.user.links.html
    }));

  } catch (error) {
    console.error(`❌ Failed ${seasonKey} - ${period}:`, error.message);
    // Fallback object structure
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
  
  const CATEGORIES = [
    { id: 'north', vibe: currentSeasons.north },
    { id: 'south', vibe: currentSeasons.south },
    { id: 'tropical', vibe: 'tropical' }
  ];

  for (const cat of CATEGORIES) {
    console.log(`\n📸 Processing Category: ${cat.id.toUpperCase()}`);
    for (const period of PERIODS) {
      process.stdout.write(`   Fetching ${period}... `);
      await new Promise(r => setTimeout(r, 1000));
      const images = await fetchImagesForCategory(cat.vibe, period, 3);
      collection[cat.id][period] = images;
      console.log(`Done (${images.length} imgs)`);
    }
  }

  fs.writeFileSync('images.json', JSON.stringify(collection, null, 2));
  console.log("\n✅ Smart images.json generated successfully!");
}

main();
