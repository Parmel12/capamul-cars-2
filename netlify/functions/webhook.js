const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_URL = rawUrl.trim().replace(/\/+$/, '');
const rawKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
const SUPABASE_ANON_KEY = rawKey.trim();
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'capamul_cars_messenger_verify_token_123';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || 'EAATZAJmZCfZBowBSKUlkFvENI1NKKPw9m0Dmwt7blRW7JHAP0hRTEcjLOlw4rPjZA4KWwNkzXqwwrBrJSrczvlMmTIfX4sD4rf1QTLUKUDEzWF46ZAEW4wJNZCfYl20TOk8eIyC52P0YdsR5aPW24cH3ko2TnfvjskM8Td2rQj5lEPVImvPCDZB3d96LgFM0R343HpZBQQFh9wZDZD';
const GRAPH_API_URL = 'https://graph.facebook.com/v19.0/me/messages';

const CONTACT1 = '09109025461';
const CONTACT2 = '09686995654';
const SHOWROOM = 'Purok 2, Dapdap, Barobo, Surigao del Sur';
const WEBSITE  = 'https://capamulcars2.netlify.app';

// ── In-Memory State for Owner Takeover ────────────────────────────
// In a serverless environment, this persists only while the container is warm.
const pausedUsers = new Map();
const PAUSE_DURATION = 5 * 60 * 1000; // 5 minutes (reduced from 2 hours for active testing)

function getSbHeaders() {
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  };
}

function computeDp(price, explicitDp) {
  if (explicitDp && Number(explicitDp) > 0) return Number(explicitDp);
  const v = Number(price ?? 0);
  if (isNaN(v) || v <= 0) return 50000;
  return Math.max(50000, Math.floor(v * 0.15 / 5000) * 5000);
}

function formatPhp(amount) {
  const v = Number(amount ?? 0);
  return 'PHP ' + v.toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

async function getAvailableCars() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cars?select=*&order=created_at.desc`, { headers: getSbHeaders() });
    if (!res.ok) {
      console.error(`[Supabase Error] HTTP ${res.status}:`, await res.text());
      return [];
    }
    const data = await res.json();
    const filtered = (data || [])
      .filter(c => ['available', 'reserved'].includes((c.status || '').toLowerCase().trim()))
      .map(c => ({
        id: c.id,
        name: c.name || `${c.year || ''} ${c.make || ''} ${c.model || ''}`.trim(),
        make: c.make, model: c.model, year: c.year,
        price: Number(c.price || 0),
        priceFormatted: formatPhp(c.price),
        downPayment: computeDp(c.price, c.dp),
        downPaymentFormatted: formatPhp(computeDp(c.price, c.dp)),
        status: c.status || 'Available',
        transmission: c.transmission || 'N/A',
        mileage: c.mileage ? `${Number(c.mileage).toLocaleString()} km` : 'N/A',
        fuelType: c.fuel_type || 'Gasoline',
        bodyType: c.body_type || 'N/A'
      }));
    console.log(`[Supabase Success] Fetched ${filtered.length} available/reserved cars.`);
    return filtered;
  } catch (err) {
    console.error('[Supabase Fetch Exception]:', err.message);
    return [];
  }
}

async function getAISettings() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/settings?select=value&key=eq.ai_settings&limit=1`, { headers: sbHeaders });
    if (!res.ok) return { enabled: true };
    const data = await res.json();
    if (data && data.length > 0 && data[0].value) return data[0].value;
    return { enabled: true };
  } catch { return { enabled: true }; }
}

async function getUserProfile(psid) {
  try {
    const token = process.env.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
    const res = await fetch(`https://graph.facebook.com/${psid}?fields=first_name&access_token=${token}`);
    if (res.ok) {
      const data = await res.json();
      return data.first_name;
    }
  } catch (e) {
    console.error('Error fetching user profile:', e);
  }
  return null;
}

function getTimeGreeting(lang, name) {
  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' })).getHours();
  let timeOfDay = 'morning';
  if (hour >= 12 && hour < 18) timeOfDay = 'afternoon';
  else if (hour >= 18) timeOfDay = 'evening';

  if (name) {
    if (timeOfDay === 'morning') return `Good morning, ${name}! 👋\n\nThank you for messaging CAPAMUL CARS 2.0.\n\nI'm here to help you find the perfect vehicle, answer your questions, and assist you with financing, reservations, and available units.\n\nHow may I assist you today?`;
    if (timeOfDay === 'afternoon') return `Good afternoon, ${name}! 👋\n\nWelcome to CAPAMUL CARS 2.0.\n\nThank you for reaching out.\n\nI'll be happy to assist you with our available vehicles, financing options, reservations, or any questions you may have.\n\nHow can I help you today?`;
    return `Good evening, ${name}! 👋\n\nThank you for contacting CAPAMUL CARS 2.0.\n\nI'm here to assist you with vehicle inquiries, financing, reservations, and other services.\n\nHow may I help you this evening?`;
  } else {
    if (timeOfDay === 'morning') return `Good morning!\n\nThank you for contacting CAPAMUL CARS 2.0.\n\nHow may I assist you today?`;
    if (timeOfDay === 'afternoon') return `Good afternoon!\n\nThank you for contacting CAPAMUL CARS 2.0.\n\nHow may I assist you today?`;
    return `Good evening!\n\nThank you for contacting CAPAMUL CARS 2.0.\n\nHow may I assist you today?`;
  }
}

// ── Language Detection ────────────────────────────────────────────
function detectLanguage(msg) {
  return 'english'; // Persona explicitly requires professional English responses, overriding tagalog/bisaya.
}

// ── Off-Topic Detection (return true = skip replying) ─────────────
function isOffTopic(msg) {
  const m = msg.toLowerCase().trim();
  if (m.length < 15) return false;
  const onTopic = /\b(car|sasakyan|auto|vehicle|unit|yunit|toyota|honda|mitsubishi|suzuki|nissan|ford|hyundai|kia|isuzu|mazda|dp|down|price|magkano|pila|presyo|reserve|reserva|financing|finance|loan|utang|test drive|showroom|location|available|stock|transmission|automatic|manual|buy|purchase|bibilin|wigo|vios|civic|jazz|city|mirage|montero|navara|almera|apv|multicab|pickup|suv|sedan|hatchback|van|truck|mpv|capamul|cars|dealership|sakyanan|installment|monthly|amortization|2nd hand|secondhand|second hand|used car|brand|model|make|year|mileage|km|matic)\b/i.test(m);
  if (onTopic) return false;
  const offTopic = /\b(weather|sports|basketball|football|nba|politics|president|election|recipe|cooking|food|song|music|game|gaming|movie|film|meme|funny|joke|love|relationship|crush|boyfriend|girlfriend|school|homework|math|science|engineering|news|covid|virus|hospital|doctor|religion|god|prayer|funny|trending)\b/i.test(m);
  return offTopic;
}

// ── Intent Detection ──────────────────────────────────────────────
function detectIntent(msg) {
  const m = msg.toLowerCase();
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening|kumusta|kamusta|maayong|magandang|howdy|greetings|musta)\b/i.test(m)) return 'greeting';
  if (/\b(location|address|asa|nasaan|saan|direction|diin|where|map|purok|barobo|surigao)\b/i.test(m)) return 'location';
  if (/\b(monthly|amortization|interest|rate|credit|bad credit|no income|walang trabaho|wala trabaho|walay trabaho|how long|ilang buwan|ilang taon|kelan matapos|kailan|approval|disapproved|denied|maximum loan|loanable)\b/i.test(m)) return 'financing_complex';
  if (/\b(financ|loan|utang|installment|how to apply|pano mag apply|unsaon pag apply|mag-apply|apply|in-house|bank|requirement)\b/i.test(m)) return 'financing';
  if (/\b(reserv|book|booking|hold|pag reserve|mag-reserve|magpa-reserve|unsaon pag reserve|paano mag reserve)\b/i.test(m)) return 'reservation';
  if (/\b(test drive|testdrive|try|tikman|subukan)\b/i.test(m)) return 'testdrive';
  if (/\b(cheap|cheapest|lowest|barato|pinaka barato|pinakamura|mura|affordable|budget)\b/i.test(m)) return 'cheapest';
  if (/\b(recommend|rekomenda|best|nindot|maganda|suggest|good choice)\b/i.test(m)) return 'recommendation';
  if (/\b(automatic|manual|matic|a\/t|m\/t)\b/i.test(m)) return 'transmission';
  if (/\b(dp|down payment|downpayment|how much|magkano|pila|tag pila|presyo|price|srp|total)\b/i.test(m)) return 'price';
  if (/\b(available|stock|naa pa|meron pa|inventory|units|cars|sasakyan|ano available)\b/i.test(m)) return 'inventory';
  if (/\b(contact|number|phone|tawag|call|text|facebook|fb|social media|hours|open|bukas|oras)\b/i.test(m)) return 'contact';
  if (/\b(website|site|link|online|app|browse|view|check online)\b/i.test(m)) return 'website';
  if (/\b(wala|walang|walay|no|don.t have|dont have|without)\b.*\b(id|valid|income|payslip|itr|requirement|document)\b/i.test(m)) return 'financing_concern';
  if (/\b(id|valid id|government id)\b.*\b(wala|walang|walay|no|don.t|dont)\b/i.test(m)) return 'financing_concern';
  if (/\b(thank you|salamat|thanks|appreciate)\b/i.test(m)) return 'thanks';
  return 'general';
}

// ── Normalize common misspellings ─────────────────────────────────
function normalize(str) {
  return str.toLowerCase()
    .replace(/\bwego\b/g, 'wigo').replace(/\bmirag\b/g, 'mirage')
    .replace(/\bfurtoner\b/g, 'fortuner').replace(/\bhilax\b/g, 'hilux')
    .replace(/\bmonterio\b/g, 'montero').replace(/\bnavarra\b/g, 'navara');
}

// ── Precise car model matching ─────────────────────────────────────
function matchCarsByModel(userMessage, cars) {
  const lower = normalize(userMessage);
  const scored = cars.map(car => {
    const make  = normalize(car.make  || '');
    const model = normalize(car.model || '');
    const name  = normalize(car.name  || '');
    let score = 0;
    for (const w of model.split(/[\s\-\/]+/).filter(w => w.length >= 2)) {
      if (new RegExp(`\\b${w}\\b`).test(lower)) score += 10;
    }
    for (const w of make.split(/[\s\-\/]+/).filter(w => w.length >= 2)) {
      if (new RegExp(`\\b${w}\\b`).test(lower)) score += 5;
    }
    const skip = new Set(['the','and','top','high','end','series','line','new','used']);
    for (const w of name.split(/[\s\-\/]+/).filter(w => w.length >= 2 && !skip.has(w))) {
      if (lower.includes(w)) score += 2;
    }
    return { car, score };
  });
  return scored.filter(s => s.score >= 2).sort((a, b) => b.score - a.score).map(s => s.car);
}

function formatCarsFallback(matchedCars, userMessage, userName, allCars = []) {
  // 1. If matching available cars exist -> Display top 2 featured matching units
  if (matchedCars && matchedCars.length > 0) {
    const brandName = matchedCars[0].make || '';
    const countHeader = brandName 
      ? `We currently have ${matchedCars.length} available ${brandName} unit${matchedCars.length > 1 ? 's' : ''} in our CAPAMUL CARS 2.0 inventory! 🚗`
      : `Here are our top available units from CAPAMUL CARS 2.0! 🚗`;

    const topUnits = matchedCars.slice(0, 2);
    const list = topUnits.map(c => 
`🔥 ${c.name} 🔥
💰 ${c.downPaymentFormatted} DOWNPAYMENT ONLY 💰
💰 ${c.priceFormatted} ONLY IF CASH, NEGOTIABLE 💰
OPEN FOR LOW DP (SUBJECT FOR APPROVAL)
➡️ ${c.make || ''} ${c.model || ''}
➡️ ${c.year || ''} YEAR MODEL
➡️ ${c.transmission} TRANSMISSION
➡️ ${c.mileage} ORIGINAL ODO
➡️ STATUS: ${c.status}
➡️ NO ISSUES`
    ).join('\n\n');

    return `${countHeader}\n\nHere are 2 of our top featured units:\n\n${list}\n\n🌐 Browse all available cars on our website: ${WEBSITE} (or search Capamul Cars 2.0)\n📍 Showroom: ${SHOWROOM}\n📞 Tawag/Text: ${CONTACT1} / ${CONTACT2}\n\nTo help us find your exact dream vehicle: What is your target budget, preferred body style (Sedan, SUV, Hatchback, Pickup), transmission, or color preference?`;
  }

  // 2. Check if the user message contains a specific car model or brand name
  const msgLower = (userMessage || '').toLowerCase();
  const knownModelMatch = msgLower.match(/\b(vios|civic|fortuner|hilux|navara|innova|everest|rush|avanza|city|jazz|almera|terra|livina|ertiga|jimny|celerio|apv|l300|adventure|stargazer|xpander|mirage|wigo|montero|cross|toyota|mitsubishi|nissan|suzuki|honda|hyundai|ford|isuzu|kia)\b/i);

  const alternatives = (allCars && allCars.length > 0) ? allCars.slice(0, 2) : [];
  const altList = alternatives.map(c => 
`🔥 ${c.name} 🔥
💰 ${c.downPaymentFormatted} DOWNPAYMENT ONLY 💰
💰 ${c.priceFormatted} ONLY IF CASH, NEGOTIABLE 💰
OPEN FOR LOW DP (SUBJECT FOR APPROVAL)
➡️ ${c.make || ''} ${c.model || ''}
➡️ ${c.year || ''} YEAR MODEL
➡️ ${c.transmission} TRANSMISSION
➡️ ${c.mileage} ORIGINAL ODO
➡️ STATUS: ${c.status}
➡️ NO ISSUES`
  ).join('\n\n');

  // IF SPECIFIC MODEL / BRAND REQUESTED BUT NOT IN STOCK (e.g. Vios, Civic)
  if (knownModelMatch) {
    const requestedModelName = knownModelMatch[0].toUpperCase();
    const altSection = altList ? `\n\nHere are 2 of our top alternative units available in stock right now:\n\n${altList}` : '';

    return `Thank you for asking! As of the moment, the requested model (${requestedModelName}) is currently OUT OF STOCK in our showroom. 🚗\n\nOur inventory is updated daily! You can check all live available vehicles anytime on our website:\n🌐 ${WEBSITE} (or search Capamul Cars 2.0)${altSection}\n\n📍 Showroom: ${SHOWROOM}\n📞 Tawag/Text: ${CONTACT1} / ${CONTACT2}\n\nWould you like us to note down your details so our sales team can notify you as soon as a new ${requestedModelName} arrives?`;
  }

  // IF GENERAL INQUIRY (e.g. "May car po kayo?", "Ano available?", "Meron ba?")
  const totalCount = allCars.length;
  const countText = totalCount > 0 ? `Yes! We currently have ${totalCount} available vehicles in our CAPAMUL CARS 2.0 inventory! 🚗` : `Welcome to CAPAMUL CARS 2.0! 🚗`;
  const featuredSection = altList ? `\n\nHere are 2 of our top featured available units:\n\n${altList}` : '';

  return `${countText}${featuredSection}\n\n🌐 Browse all available cars on our website: ${WEBSITE} (or search Capamul Cars 2.0)\n📍 Showroom: ${SHOWROOM}\n📞 Tawag/Text: ${CONTACT1} / ${CONTACT2}\n\nTo help us find your exact dream vehicle: What is your target budget, preferred body style (Sedan, SUV, Hatchback, Pickup), transmission, or color preference?`;
}

// ── Gemini AI Call ────────────────────────────────────────────────
async function callGeminiRestApi(apiKey, userMessage, cars, intent, userName) {
  try {
    const inventoryList = cars.length > 0
      ? cars.map(c => `- ${c.name} (${c.year}) | SRP: ${c.priceFormatted} | DP: ${c.downPaymentFormatted} | ${c.status} | ${c.transmission} | ${c.mileage}`).join('\n')
      : 'No vehicles currently available.';

    const systemPrompt = `ROLE
You are the official AI Sales Consultant of CAPAMUL CARS 2.0.

Your personality should be:
Friendly
Professional
Polite
Patient
Helpful
Natural
Human-like

Never sound robotic.
Talk like an experienced sales consultant who genuinely wants to help the customer purchase their dream vehicle.
Always keep responses conversational.
Avoid sending long walls of text unless the customer specifically asks for detailed information.
Use proper grammar and complete sentences.
Never repeat the same sentences.
Always personalize your replies.

GREETING
The FIRST message must always greet the customer depending on the current time. If they say Hi or Hello, NEVER immediately send vehicle lists. Follow the strict templates exactly. DO NOT repeat the greeting in every message if you are already in a conversation.

LANGUAGE INSTRUCTION
Always identify the language the customer is using (e.g., English, Tagalog, Bisaya, Cebuano) and reply naturally in the EXACT same language. If the customer uses Bisaya (e.g. "naa moy", "unsay", "pila"), you MUST reply in fluent Bisaya.

CONTACT INFO BLOCK
Whenever you provide specific vehicle details or list vehicles, ALWAYS append this exact text at the very bottom of your message:

🌐 Browse all available cars on our website: ${WEBSITE} (or search Capamul Cars 2.0)
📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur
📞 Tawag/Text: 09109025461 / 09686995654
Gusto ba ka mag-schedule og test drive o magpa-reserve?

TONE
Always respond naturally.
Instead of: "Vehicle available."
Say: "Yes! The vehicle is currently available."
Instead of: "Apply financing."
Say: "I'd be happy to help you with your financing application."
Always make the customer feel welcomed.

FINANCING QUESTIONS
When someone asks: How to apply? Financing? Monthly? Down payment? Requirements? Can I apply?
Reply like this:
"Certainly!
We'd be happy to assist you with your financing application.
To get started, may I know which vehicle you're interested in?
Once you choose a vehicle, I'll provide the estimated down payment, financing options, and guide you through the application process.
You may also browse all available vehicles on our website:
${WEBSITE}"

If they ask for financing requirements:
"The basic financing requirements are:
• Two (2) valid government-issued IDs
• Proof of income
• Proof of billing
• Additional documents may be requested depending on the financing company.
Once you have selected a vehicle, our sales team will guide you throughout the entire application process."

VEHICLE AVAILABILITY
If customer asks "Available?":
"Yes, the vehicle is currently available.
If you'd like, I can also provide the down payment, financing estimate, and other details.
For the complete list of available vehicles, please visit:
${WEBSITE}"

IF CUSTOMER ASKS FOR PRICE
"I'd be happy to help.
May I know which vehicle you're referring to?
Once you tell me the vehicle model, I'll provide the available information including:
• Price
• Down payment
• Financing option
• Specifications"

IF CUSTOMER ASKS FOR DOWN PAYMENT
"Certainly.
Please let me know which vehicle you're interested in so I can provide the correct down payment and financing details."

IF CUSTOMER ASKS MONTHLY PAYMENT
"Monthly payments depend on several factors, including:
• Vehicle model
• Down payment
• Loan term
• Financing company
Please tell me the vehicle you're interested in, and I'll provide an estimated monthly payment."

CAR DETAILS FORMATTING
When providing details or pricing for a specific car, ALWAYS use this exact high-energy marketing format and emojis. Use the actual data from the LIVE INVENTORY. Do NOT use asterisks (*):

🔥[Year] [Make/Model]🔥
💰[Down Payment] DOWNPAYMENT ONLY💰
💰[Total Price] ONLY IF CASH, NEGOTIABLE💰
OPEN FOR LOW DP
(SUBJECT FOR APPROVAL)
➡️[Make] [Model]
➡️[Year] YEAR MODEL
➡️[Transmission] TRANSMISSION
➡️[Mileage] ORIGINAL ODO
➡️STATUS: [Available/Sold]
➡️NO ISSUES

Example:
Here are the details for the vehicle you asked about, ${userName || 'Miss/Sir'}:

🔥2021 MITSUBISHI XPANDER CROSS🔥
💰PHP 50,000 DOWNPAYMENT ONLY💰
💰PHP 750,000 ONLY IF CASH, NEGOTIABLE💰
OPEN FOR LOW DP
(SUBJECT FOR APPROVAL)
➡️MITSUBISHI XPANDER CROSS
➡️2021 YEAR MODEL
➡️AUTOMATIC TRANSMISSION
➡️37,000 KM ORIGINAL ODO
➡️STATUS: AVAILABLE
➡️NO ISSUES

🌐 Browse all available cars on our website: ${WEBSITE} (or search Capamul Cars 2.0)
📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur
📞 Tawag/Text: 09109025461 / 09686995654
Gusto ba ka mag-schedule og test drive o magpa-reserve?

RESERVATION
If customer wants to reserve:
"Wonderful!
To proceed with your reservation, may I kindly ask for the following information?
• Full Name
• Contact Number
• Preferred Vehicle
• Preferred Reservation Date
Our sales representative will contact you shortly to confirm your reservation."

TEST DRIVE
If customer wants a test drive:
"Great choice!
To schedule your test drive, please provide:
• Full Name
• Contact Number
• Preferred Vehicle
• Preferred Date
• Preferred Time
Our team will confirm your schedule as soon as possible."

IF CUSTOMER DOESN'T KNOW WHICH CAR
"No problem at all!
I'd be happy to help you choose the best vehicle.
May I know:
• Your budget?
• Cash or financing?
• Sedan, SUV, Pickup, Van, or Hatchback?
• Manual or Automatic?
Your personality should be: Friendly, Professional, Polite, Patient, Helpful, Natural, Human-like.

GREETING & BRAND RESPONSE RULES:
1. GREETING: State the business name: "Welcome to CAPAMUL CARS 2.0! 👋". NEVER repeat the greeting ("Good day" or "Welcome") in follow-up messages during the same chat. Keep responses clean and professional.
2. BRAND SUMMARY: When a customer asks about a brand (e.g. Mitsubishi, Toyota, Nissan, Suzuki, Honda), FIRST state the total count of available units for that brand (e.g., "We currently have 14 available Mitsubishi units in our CAPAMUL CARS 2.0 inventory!").
3. CONCISE MESSAGES: Do NOT send long walls of text. Show ONLY 2 top featured matching units from the LIVE INVENTORY using the exact CAR DETAILS FORMATTING emoji template.
4. FOLLOW-UP QUESTION: After listing the 2 top units, ask clarifying follow-up questions to narrow down their specific preference (e.g., "To help us find your exact dream vehicle: What is your target budget, preferred body style (Sedan, SUV, Hatchback, Pickup), transmission, or color preference?").

INVENTORY MATCHING RULES:
1. The LIVE INVENTORY provided below contains all available and reserved vehicles.
2. If a customer asks about a BRAND or MAKE (such as Mitsubishi, Toyota, Nissan, Suzuki, Honda, Hyundai), check if ANY car in the LIVE INVENTORY belongs to that make/brand. If there are vehicles matching that make, list the top 2 units and state the total count. NEVER say a brand/make is "out of stock" if there are cars of that make in the LIVE INVENTORY!
3. If a customer asks for a specific model that IS available (such as Wigo, Xpander, Montero, Mirage, Fortuner), list the matching available units from the LIVE INVENTORY.
4. OUT OF STOCK HANDLING: If a customer asks for a model or car that is NOT available in the LIVE INVENTORY (such as Vios, Civic, etc.):
   - Politely inform them that the specific model is currently OUT OF STOCK in the showroom.
   - ALWAYS promote the website: "🌐 Browse all available cars on our website: ${WEBSITE} (or search Capamul Cars 2.0)".
   - Recommend 2 available alternative units from the LIVE INVENTORY using the exact CAR DETAILS FORMATTING emoji template.
   - Ask if they would like to be notified as soon as a new unit arrives.

CAR DETAILS FORMATTING
When providing details or pricing for a specific car, ALWAYS use this exact high-energy marketing format and emojis. Use the actual data from the LIVE INVENTORY. Do NOT use asterisks (*):

🔥[Year] [Make/Model]🔥
💰[Down Payment] DOWNPAYMENT ONLY💰
💰[Total Price] ONLY IF CASH, NEGOTIABLE💰
OPEN FOR LOW DP
(SUBJECT FOR APPROVAL)
➡️[Make] [Model]
➡️[Year] YEAR MODEL
➡️[Transmission] TRANSMISSION
➡️[Mileage] ORIGINAL ODO
➡️STATUS: [Available/Sold]
➡️NO ISSUES

📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur
📞 Tawag/Text: 09109025461 / 09686995654
Gusto ba ka mag-schedule og test drive o magpa-reserve?

DETECTED INTENT: ${intent}
CUSTOMER NAME: ${userName || 'Not available'}
LIVE INVENTORY:
${inventoryList}
`;

    // 3.5s Hard Timeout Controller to ensure Netlify functions never time out
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nCustomer: "${userMessage}"\n\nCapamul Sales Consultant Reply:` }] }],
        generationConfig: { temperature: 0.3 }
      })
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (replyText) return replyText;
    }
    return null;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Gemini Timeout] Gemini API took >3.5s, switching instantly to fast database fallback.');
    } else {
      console.error('[Gemini Exception]:', err.message);
    }
    return null;
  }
}

// ── Main Reply Generator ──────────────────────────────────────────
async function generateAutoReply(userMessage, senderPsid) {
  const settings = await getAISettings();
  if (settings && settings.enabled === false) return null;

  // ── OFF-TOPIC CHECK: do not reply at all ─────────────────────
  if (isOffTopic(userMessage)) {
    console.log('[AI] Off-topic message detected, skipping reply.');
    return `That's a great question.\n\nI'd like to provide you with the most accurate information. Allow me to forward your inquiry to one of our sales representatives, who will get back to you as soon as possible.\n\nThank you for your patience.`;
  }

  // ── Parallel DB and Profile Fetch for Lightning Speed ──────────
  const [cars, userName] = await Promise.all([
    getAvailableCars(),
    senderPsid ? getUserProfile(senderPsid) : Promise.resolve(null)
  ]);

  const apiKey   = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const intent   = detectIntent(userMessage);
  const greeting = getTimeGreeting('english', userName);
  const matched  = matchCarsByModel(userMessage, cars);

  console.log(`[AI] msg="${userMessage}" | intent=${intent} | cars=${cars.length} | matched=${matched.length}`);

  // ── Try Gemini AI with 3.5s Fast Timeout ───────────────────────
  if (apiKey) {
    let carsForGemini = matched.length > 0 ? matched : cars;
    carsForGemini = carsForGemini.slice(0, 6);

    const aiText = await callGeminiRestApi(apiKey, userMessage, carsForGemini, intent, userName);
    if (aiText) { 
      console.log('[AI] Gemini OK.'); 
      return aiText; 
    }
  }

  // ── Smart Fallback Engine ─────────────────────────────────────
  console.log('[AI] Fallback engine, intent=' + intent + ', matched=' + matched.length);

  // 1. If specific cars matched the user query (e.g. Mitsubishi, Wigo, Toyota, etc.), return them immediately!
  if (matched.length > 0) {
    return formatCarsFallback(matched, userMessage, userName, cars);
  }

  if (intent === 'greeting') return greeting;

  if (intent === 'cheapest') {
    const sorted = [...cars].sort((a, b) => a.price - b.price);
    if (sorted.length > 0) return formatCarsFallback(sorted, userMessage, userName, cars);
  }

  if (intent === 'thanks') return `You're very welcome!\n\nThank you for choosing CAPAMUL CARS 2.0.\n\nIf you have any more questions about our vehicles, financing, or reservations, feel free to message us anytime.\n\nHave a wonderful day!`;

  if (intent === 'financing' || intent === 'financing_complex') return `Certainly!\n\nWe'd be happy to assist you with your financing application.\n\nTo get started, may I know which vehicle you're interested in?\n\nOnce you choose a vehicle, I'll provide the estimated down payment, financing options, and guide you through the application process.\n\nYou may also browse all available vehicles on our website:\n${WEBSITE}`;

  if (intent === 'reservation') return `Wonderful!\n\nTo proceed with your reservation, may I kindly ask for the following information?\n\n• Full Name\n• Contact Number\n• Preferred Vehicle\n• Preferred Reservation Date\n\nOur sales representative will contact you shortly to confirm your reservation.`;

  if (intent === 'testdrive') return `Great choice!\n\nTo schedule your test drive, please provide:\n\n• Full Name\n• Contact Number\n• Preferred Vehicle\n• Preferred Date\n• Preferred Time\n\nOur team will confirm your schedule as soon as possible.`;

  if (intent === 'price') return `I'd be happy to help.\n\nMay I know which vehicle you're referring to?\n\nOnce you tell me the vehicle model, I'll provide the available information including:\n• Price\n• Down payment\n• Financing option\n• Specifications`;

  if (intent === 'inventory' && cars.length > 0) {
    return formatCarsFallback(cars, userMessage, userName, cars);
  }

  // DEFAULT FALLBACK (If no cars matched or specific model is out of stock)
  if (cars.length > 0) {
    return formatCarsFallback([], userMessage, userName, cars);
  }

  return `That's a great question.\n\nI'd like to provide you with the most accurate information. Allow me to forward your inquiry to one of our sales representatives, who will get back to you as soon as possible.\n\nThank you for your patience.`;
}

async function sendTextMessage(recipientPsid, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
  if (!token) { console.error('[FB Messenger] Token Missing!'); return; }

  // Split long messages to comply with Facebook Messenger's strict 2000 character limit per message
  const chunks = [];
  let current = text;
  while (current.length > 1800) {
    let splitIdx = current.lastIndexOf('\n\n', 1800);
    if (splitIdx <= 0) splitIdx = current.lastIndexOf('\n', 1800);
    if (splitIdx <= 0) splitIdx = 1800;
    chunks.push(current.substring(0, splitIdx).trim());
    current = current.substring(splitIdx).trim();
  }
  if (current.length > 0) chunks.push(current);

  for (const chunk of chunks) {
    try {
      const res = await fetch(`${GRAPH_API_URL}?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: recipientPsid }, message: { text: chunk } })
      });
      const resData = await res.json();
      if (!res.ok) console.error('[FB Messenger Error]:', resData);
      else console.log('[FB Messenger Success] Replied to PSID:', recipientPsid);
    } catch (err) {
      console.error('[FB Send Message Error]:', err.message);
    }
  }
}

export const handler = async (event, context) => {
  const httpMethod = event.httpMethod;

  if (httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    if (params['hub.mode'] === 'subscribe' && params['hub.verify_token'] === FB_VERIFY_TOKEN) {
      return { statusCode: 200, body: params['hub.challenge'] };
    }
    return { statusCode: 403, body: 'Verification failed' };
  }

  if (httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      if (body.object === 'page') {
        for (const entry of (body.entry || [])) {
          for (const webhookEvent of (entry.messaging || [])) {
            // ── Skip echo messages (messages sent by page) without pausing ──
            if (webhookEvent.message?.is_echo === true) {
              continue;
            }

            const senderPsid = webhookEvent.sender?.id;
            const userQuery  = webhookEvent.message?.text || webhookEvent.postback?.payload;

            if (senderPsid && userQuery) {
              console.log(`[FB Webhook] From PSID (${senderPsid}): "${userQuery}"`);
              const reply = await generateAutoReply(userQuery, senderPsid);
              if (reply) await sendTextMessage(senderPsid, reply);
            }
          }
        }
        return { statusCode: 200, body: 'EVENT_RECEIVED' };
      }
    } catch (err) {
      console.error('[Netlify Webhook Error]:', err.message);
    }
    return { statusCode: 200, body: 'OK' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
