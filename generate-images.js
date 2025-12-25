const fs = require('fs');

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

// 1. Define Keywords
// Simplified to ensure results are found (spaces imply 'OR' or broad matching)
const VIBES = {
  winter: 'winter snow cold',
  spring: 'spring flowers nature',
  summer: 'summer beach sun',
  autumn: 'autumn leaves moody',
  tropical: 'tropical nature lush'
};

const PERIODS = ['dawn', 'morning', 'afternoon', 'evening', 'night'];

// 2. Helper Functions
function getCurrentSeasons() {
  const month = new Date().getMonth(); 
  // North: Winter, South: Summer (in Dec/Jan)
  if (month === 11 || month === 0 || month === 1) return { north: 'winter', south: 'summer' };
  if (month >= 2 && month <= 4) return { north: 'spring', south: 'autumn' };
  if (month >= 5 && month <= 7) return { north: 'summer', south: 'winter' };
  return { north: 'autumn', south: 'spring' };
}

// Fallback search: If a specific query fails (404), search just the vibe name
async function fetchBroadFallback(seasonKey, count) {
  const query = seasonKey; // e.g., just "tropical"
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&count=${count}&client_id=${UNSPLASH_KEY}`;
  
  try {
    const res = await fetch(url);
    if(!res.ok) throw new Error(res.status);
    const data = await res.json();
    
    return data.map(img => ({
      url: img.urls.regular,
      name: img.user.name,
      link: img.user.links.html
    }));
  } catch(e) {
    throw e;
  }
}

// Main fetch function
async function fetchImagesForCategory(seasonKey, period, count = 3) {
  // Construct query: e.g., "tropical nature lush dawn"
  const query = `${VIBES[seasonKey]} ${period}`;
  const url = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high&count=${count}&client_id=${UNSPLASH_KEY}`;

  try {
    const res = await fetch(url);
    
    // Handle errors (like 404 No Photos Found)
    if (!res.ok) {
        if (res.status === 404) {
           console.log(`      ⚠️ Specific search 404. Retrying broad search...`);
           // Note: We await the fallback function here
           return await fetchBroadFallback(seasonKey, count);
        }
        throw new Error(`Status ${res.status}`);
    }
    
    const data = await res.json();
    
    return data.map(img => ({
      url: img.urls.regular,
      name: img.user.name,
      link: img.user.links.html
    }));

  } catch (error) {
    console.error(`   ❌ Failed ${seasonKey}-${period}: ${error.message}`);
    // Ultimate Fallback to prevent crash
    return Array(count).fill({
      url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1600',
      name: 'Unsplash',
      link: 'https://unsplash.com'
    });
  }
}

// 3. Main Execution
async function main() {
  const currentSeasons = getCurrentSeasons();
  console.log(`📅 Date detected. North is ${currentSeasons.north}. South is ${currentSeasons.south}.`);

  const collection = { north: {}, south: {}, tropical: {} };
  
  // Processing Order: Tropical First (to prioritize API usage)
  const CATEGORIES = [
    { id: 'tropical', vibe: 'tropical' },
    { id: 'north', vibe: currentSeasons.north },
    { id: 'south', vibe: currentSeasons.south }
  ];

  for (const cat of CATEGORIES) {
    console.log(`\n📸 Processing Category: ${cat.id.toUpperCase()}`);
    
    for (const period of PERIODS) {
      process.stdout.write(`   Fetching ${period}... `);
      
      // Delay to avoid 'Burst' rate limits (403)
      await new Promise(r => setTimeout(r, 1500)); 
      
      const images = await fetchImagesForCategory(cat.vibe, period, 3);
      collection[cat.id][period] = images;
      
      if(images[0].name === 'Unsplash') process.stdout.write("FAIL (Fallback)\n");
      else process.stdout.write(`OK (${images.length} imgs)\n`);
    }
  }

  fs.writeFileSync('images.json', JSON.stringify(collection, null, 2));
  console.log("\n✅ images.json generated successfully!");
}

// Execute
main();
