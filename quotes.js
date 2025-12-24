// Fallback templates in case the API call fails or finds no match for a specific minute
const FALLBACK_TEMPLATES = {
  dawn: [
    "The clock showed {time}, and the first light began to bleed through the curtains.",
    "It was {time}. The world was holding its breath before the sunrise.",
    "At exactly {time}, the birds began their morning council.",
    "He looked at his watch: {time}. Too early to rise, too late to sleep."
  ],
  morning: [
    "The coffee poured into the cup at {time}, steaming with promise.",
    "It was {time}, and the city was already awake and demanding attention.",
    "She checked the time—{time}—and realized the day had truly begun."
  ],
  afternoon: [
    "The shadows grew longer as the clock struck {time}.",
    "It was {time}, the hour when the day decides if it will be good or bad.",
    "He glanced up. {time}. The work was nowhere near finished."
  ],
  evening: [
    "The sky turned purple at {time}, signaling the end of the shift.",
    "It was {time}. The streetlights flickered to life one by one.",
    "At {time}, the noise of the day finally began to settle."
  ],
  night: [
    "It was {time}. The world belonged to the dreamers now.",
    "The clock read {time}. The darkness was absolute and comforting.",
    "At {time}, the only sound was the hum of the refrigerator."
  ]
};

const FICTIONAL_AUTHORS = [
  "The Narrator", "Chapter 4", "The Lost Diary", "Chronicles of Now", 
  "A Forgotten Novel", "Page 394", "The Timekeeper", "Midnight Tales"
];

// Helper to convert date to 12h format (e.g., "4:30 PM") for the fallback
function formatTime12(date) {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0'+minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const QuoteFallback = {
  get: function(period, date) {
    const templates = FALLBACK_TEMPLATES[period] || FALLBACK_TEMPLATES['morning'];
    const template = getRandom(templates);
    const timeStr = formatTime12(date);
    const author = getRandom(FICTIONAL_AUTHORS);
    return {
      text: template.replace("{time}", timeStr),
      author: author
    };
  }
};
