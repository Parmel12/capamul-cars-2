const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
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
const PAUSE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const sbHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cars?select=*&order=created_at.desc`, { headers: sbHeaders });
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const data = await res.json();
    return (data || [])
      .filter(c => ['available', 'reserved'].includes((c.status || '').toLowerCase()))
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
  } catch (err) {
    console.error('Error fetching cars:', err.message);
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
Based on your preferences, I'll recommend the most suitable vehicles."

IF CUSTOMER SAYS THANK YOU
"You're very welcome!
Thank you for choosing CAPAMUL CARS 2.0.
If you have any more questions about our vehicles, financing, or reservations, feel free to message us anytime.
Have a wonderful day!"

IF CUSTOMER ASKS SOMETHING UNKNOWN
"That's a great question.
I'd like to provide you with the most accurate information.
Allow me to forward your inquiry to one of our sales representatives, who will get back to you as soon as possible.
Thank you for your patience."

EMOJIS
Use only a few professional emojis. Examples: 👋 🚗 📍 📞 ✅
Avoid excessive emojis.

NEVER DO THESE
Never sound robotic.
Never repeat the same paragraph.
Never send unnecessary long messages.
Never overwhelm the customer with a list of vehicles unless they ask.
Never make up prices.
Never make up financing information.
Never promise approval.
Never pressure customers into buying.

SALES STYLE
Always guide the conversation naturally.

INVENTORY MATCHING RULES:
1. The LIVE INVENTORY provided below contains all available and reserved vehicles.
2. If a customer asks about a BRAND or MAKE (such as Mitsubishi, Toyota, Nissan, Suzuki, Honda, Hyundai), check if ANY car in the LIVE INVENTORY belongs to that make/brand. If there are vehicles matching that make, list ALL of them. NEVER say a brand/make is "out of stock" if there are cars of that make in the LIVE INVENTORY!
3. If a customer asks for a specific model (such as Wigo, Xpander, Montero, Mirage, Vios, Fortuner), list ALL matching available units from the LIVE INVENTORY.
4. Only say an item, brand, or model is out of stock if ZERO cars in the LIVE INVENTORY match that brand or model.

DETECTED INTENT: ${intent}
CUSTOMER NAME: ${userName || 'Not available'}
LIVE INVENTORY:
${inventoryList}
`;

    // Calculate dynamic greeting if intent is greeting
    // Removed aiStart logic to prevent Gemini from getting stuck on the greeting

    const endpoints = [
      'v1beta/models/gemini-flash-latest',
      'v1beta/models/gemini-2.0-flash'
    ];

    for (const ep of endpoints) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        const res = await fetch(`https://generativelanguage.googleapis.com/${ep}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\nCustomer: "${userMessage}"\n\nCapamul Sales Consultant Reply:` }] }],
            generationConfig: { temperature: 0.3 }
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (replyText) return replyText;
        } else if (res.status === 429) {
          console.warn(`[Gemini Rate Limit 429] Waiting 1.5s before retry...`);
          await new Promise(r => setTimeout(r, 1500));
        } else {
          const errText = await res.text();
          console.error(`[Gemini Error] ${ep} HTTP ${res.status}: ${errText.substring(0, 150)}`);
          break; // Try next endpoint if not 429
        }
      }
    }
    return null; // Fallback gracefully to smart engine instead of showing raw debug errors to customer
  } catch (err) {
    console.error('[Gemini Exception]:', err.message);
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

  const cars     = await getAvailableCars();
  const apiKey   = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '').trim();
  const intent   = detectIntent(userMessage);
  const userName = senderPsid ? await getUserProfile(senderPsid) : null;
  const greeting = getTimeGreeting('english', userName);

  console.log(`[AI] msg="${userMessage}" | intent=${intent} | cars=${cars.length}`);

  // ── Try Gemini AI first ───────────────────────────────────────
  if (apiKey) {
    const matched = matchCarsByModel(userMessage, cars);
    let carsForGemini = matched;

    if (carsForGemini.length === 0) {
      if (intent === 'cheapest') {
        carsForGemini = [...cars].sort((a, b) => a.price - b.price).slice(0, 6);
      } else if (intent === 'transmission') {
        const isAuto = /\b(automatic|matic|a\/t)\b/i.test(userMessage.toLowerCase());
        carsForGemini = cars.filter(c => isAuto
          ? (c.transmission || '').toLowerCase().includes('auto')
          : (c.transmission || '').toLowerCase().includes('manual')).slice(0, 6);
      } else {
        carsForGemini = cars.slice(0, 8);
      }
    } else {
      carsForGemini = carsForGemini.slice(0, 8);
    }

    const aiText = await callGeminiRestApi(apiKey, userMessage, carsForGemini, intent, userName);
    if (aiText) { 
      console.log('[AI] Gemini OK.'); 
      return aiText; 
    }
  }

  // ── Smart Fallback Engine ─────────────────────────────────────
  console.log('[AI] Fallback engine, intent=' + intent);

  if (intent === 'greeting') return greeting;

  if (intent === 'thanks') return `You're very welcome!\n\nThank you for choosing CAPAMUL CARS 2.0.\n\nIf you have any more questions about our vehicles, financing, or reservations, feel free to message us anytime.\n\nHave a wonderful day!`;

  if (intent === 'financing' || intent === 'financing_complex') return `Certainly!\n\nWe'd be happy to assist you with your financing application.\n\nTo get started, may I know which vehicle you're interested in?\n\nOnce you choose a vehicle, I'll provide the estimated down payment, financing options, and guide you through the application process.\n\nYou may also browse all available vehicles on our website:\n${WEBSITE}`;

  if (intent === 'reservation') return `Wonderful!\n\nTo proceed with your reservation, may I kindly ask for the following information?\n\n• Full Name\n• Contact Number\n• Preferred Vehicle\n• Preferred Reservation Date\n\nOur sales representative will contact you shortly to confirm your reservation.`;

  if (intent === 'testdrive') return `Great choice!\n\nTo schedule your test drive, please provide:\n\n• Full Name\n• Contact Number\n• Preferred Vehicle\n• Preferred Date\n• Preferred Time\n\nOur team will confirm your schedule as soon as possible.`;

  if (intent === 'price') return `I'd be happy to help.\n\nMay I know which vehicle you're referring to?\n\nOnce you tell me the vehicle model, I'll provide the available information including:\n• Price\n• Down payment\n• Financing option\n• Specifications`;

  if (intent === 'inventory') return `Yes, the vehicle is currently available.\n\nIf you'd like, I can also provide the down payment, financing estimate, and other details.\n\nFor the complete list of available vehicles, please visit:\n${WEBSITE}`;

  // DEFAULT
  return `That's a great question.\n\nI'd like to provide you with the most accurate information. Allow me to forward your inquiry to one of our sales representatives, who will get back to you as soon as possible.\n\nThank you for your patience.`;
}

async function sendTextMessage(recipientPsid, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
  if (!token) { console.error('[FB Messenger] Token Missing!'); return; }
  try {
    const res = await fetch(`${GRAPH_API_URL}?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientPsid }, message: { text } })
    });
    const resData = await res.json();
    if (!res.ok) console.error('[FB Messenger Error]:', resData);
    else console.log('[FB Messenger Success] Replied to PSID:', recipientPsid);
  } catch (err) {
    console.error('[FB Send Message Error]:', err.message);
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
            // ── OWNER TAKEOVER: skip echo messages and PAUSE AI ──
            if (webhookEvent.message?.is_echo === true) {
              const customerPsid = webhookEvent.recipient?.id;
              if (customerPsid) {
                pausedUsers.set(customerPsid, Date.now());
                console.log(`[FB Webhook] Owner replied manually — AI is pausing auto-reply for PSID ${customerPsid} for 2 hours.`);
              }
              continue;
            }

            const senderPsid = webhookEvent.sender?.id;

            // Check if AI is paused for this user
            if (pausedUsers.has(senderPsid)) {
              if (Date.now() - pausedUsers.get(senderPsid) < PAUSE_DURATION) {
                console.log(`[FB Webhook] AI is paused for PSID ${senderPsid} due to owner takeover. Skipping.`);
                continue; // Skip replying
              } else {
                pausedUsers.delete(senderPsid); // Expired pause
              }
            }

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
