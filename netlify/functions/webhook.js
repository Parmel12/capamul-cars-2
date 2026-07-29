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

  const n = name ? ` ${name}` : '';

  if (lang === 'bisaya') {
    if (timeOfDay === 'morning') return `Maayong buntag${n}!`;
    if (timeOfDay === 'afternoon') return `Maayong hapon${n}!`;
    return `Maayong gabii${n}!`;
  }
  if (lang === 'tagalog') {
    if (timeOfDay === 'morning') return `Magandang umaga${n}!`;
    if (timeOfDay === 'afternoon') return `Magandang hapon${n}!`;
    return `Magandang gabi${n}!`;
  }
  if (timeOfDay === 'morning') return `Good morning${n}!`;
  if (timeOfDay === 'afternoon') return `Good afternoon${n}!`;
  return `Good evening${n}!`;
}

// ── Language Detection ────────────────────────────────────────────
function detectLanguage(msg) {
  const lower = msg.toLowerCase();
  const bisayaWords = ['pila','tag pila','naa','naa pa','naa bay','asa','dapit','akong','unsa','unsay','unsaon','ganahan','tawag','salamat','maayong','adlaw','buntag','hapon','gabii','naku','nku','sakyanan','diri','didto','wala akong','walay','pwede ba'];
  const tagalogWords = ['magkano','paano','saan','nasaan','kailan','yung','ito','doon','po','opo','hindi','meron','pwede','gusto','maganda','mura','salamat','sige','reserve','location','financing','apply','wala akong'];
  let bScore = 0, tScore = 0;
  for (const w of bisayaWords) { if (lower.includes(w)) bScore++; }
  for (const w of tagalogWords) { if (lower.includes(w)) tScore++; }
  if (bScore > tScore && bScore > 0) return 'bisaya';
  if (tScore > bScore && tScore > 0) return 'tagalog';
  if (/\b(pila|naa ba|asa man|unsa|ganahan|maayong|unsaon|naku|nku)\b/i.test(lower)) return 'bisaya';
  if (/\b(magkano|nasaan|po ba|opo|pwede po|paano)\b/i.test(lower)) return 'tagalog';
  return 'english';
}

// ── Off-Topic Detection (return true = skip replying) ─────────────
function isOffTopic(msg) {
  const m = msg.toLowerCase().trim();
  // Very short messages or greetings are always on-topic
  if (m.length < 15) return false;
  // If it contains ANY business-related term, it is ON topic
  const onTopic = /\b(car|sasakyan|auto|vehicle|unit|yunit|toyota|honda|mitsubishi|suzuki|nissan|ford|hyundai|kia|isuzu|mazda|dp|down|price|magkano|pila|presyo|reserve|reserva|financing|finance|loan|utang|test drive|showroom|location|available|stock|transmission|automatic|manual|buy|purchase|bibilin|wigo|vios|civic|jazz|city|mirage|montero|navara|almera|apv|multicab|pickup|suv|sedan|hatchback|van|truck|mpv|capamul|cars|dealership|sakyanan|installment|monthly|amortization|2nd hand|secondhand|second hand|used car|brand|model|make|year|mileage|km|matic)\b/i.test(m);
  if (onTopic) return false;
  // Clearly off-topic subjects
  const offTopic = /\b(weather|sports|basketball|football|nba|politics|president|election|recipe|cooking|food|song|music|game|gaming|movie|film|meme|funny|joke|love|relationship|crush|boyfriend|girlfriend|school|homework|math|science|engineering|news|covid|virus|hospital|doctor|religion|god|prayer|funny|trending)\b/i.test(m);
  return offTopic;
}

// ── Intent Detection ──────────────────────────────────────────────
function detectIntent(msg) {
  const m = msg.toLowerCase();
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening|kumusta|kamusta|maayong|magandang|howdy|greetings|musta)\b/i.test(m)) return 'greeting';
  if (/\b(location|address|asa|nasaan|saan|direction|diin|where|map|purok|barobo|surigao)\b/i.test(m)) return 'location';
  // Complex financing = multiple questions OR specific concern words
  if (/\b(monthly|amortization|interest|rate|credit|bad credit|no income|walang trabaho|wala trabaho|walay trabaho|how long|ilang buwan|ilang taon|kelan matapos|kailan|approval|disapproved|denied|maximum loan|loanable)\b/i.test(m)) return 'financing_complex';
  if (/\b(financ|loan|utang|installment|how to apply|pano mag apply|unsaon pag apply|mag-apply|apply|in-house|bank)\b/i.test(m)) return 'financing';
  if (/\b(reserv|book|booking|hold|pag reserve|mag-reserve|magpa-reserve|unsaon pag reserve|paano mag reserve)\b/i.test(m)) return 'reservation';
  if (/\b(test drive|testdrive|try|tikman|subukan)\b/i.test(m)) return 'testdrive';
  if (/\b(cheap|cheapest|lowest|barato|pinaka barato|pinakamura|mura|affordable|budget)\b/i.test(m)) return 'cheapest';
  if (/\b(recommend|rekomenda|best|nindot|maganda|suggest|good choice)\b/i.test(m)) return 'recommendation';
  if (/\b(automatic|manual|matic|a\/t|m\/t)\b/i.test(m)) return 'transmission';
  if (/\b(dp|down payment|downpayment|how much|magkano|pila|tag pila|presyo|price|srp|total)\b/i.test(m)) return 'price';
  if (/\b(available|stock|naa pa|meron pa|inventory|units|cars|sasakyan|ano available)\b/i.test(m)) return 'inventory';
  if (/\b(contact|number|phone|tawag|call|text|facebook|fb|social media|hours|open|bukas|oras)\b/i.test(m)) return 'contact';
  if (/\b(website|site|link|online|app|browse|view|check online)\b/i.test(m)) return 'website';
  // No ID / requirement concern
  if (/\b(wala|walang|walay|no|don.t have|dont have|without)\b.*\b(id|valid|income|payslip|itr|requirement|document)\b/i.test(m)) return 'financing_concern';
  if (/\b(id|valid id|government id)\b.*\b(wala|walang|walay|no|don.t|dont)\b/i.test(m)) return 'financing_concern';
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
    for (const w of model.split(/[\s\-\/]+/).filter(w => w.length > 2)) {
      if (new RegExp(`\\b${w}\\b`).test(lower)) score += 10;
    }
    for (const w of make.split(/[\s\-\/]+/).filter(w => w.length > 2)) {
      if (new RegExp(`\\b${w}\\b`).test(lower)) score += 5;
    }
    const skip = new Set(['the','and','top','high','end','series','line','new','used']);
    for (const w of name.split(/[\s\-\/]+/).filter(w => w.length > 2 && !skip.has(w))) {
      if (lower.includes(w)) score += 2;
    }
    return { car, score };
  });
  return scored.filter(s => s.score >= 5).sort((a, b) => b.score - a.score).map(s => s.car);
}

// ── Car detail block ──────────────────────────────────────────────
function carDetail(c) {
  const statusLabel = (c.status || '').toLowerCase() === 'reserved'
    ? '[RESERVED - Waitlist open]' : '[AVAILABLE]';
  return `*${c.name}* (${c.year})\n- Total Price (SRP): ${c.priceFormatted}\n- Down Payment (DP): ${c.downPaymentFormatted}\n- Status: ${statusLabel}\n- ${c.transmission} | ${c.mileage}`;
}

// ── Standard contact/website footer ──────────────────────────────
const footer = `\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- View our full inventory: ${WEBSITE}`;

// ── Gemini AI Call ────────────────────────────────────────────────
async function callGeminiRestApi(apiKey, userMessage, cars, lang, intent, userName) {
  try {
    const inventoryList = cars.length > 0
      ? cars.map(c => `- ${c.name} (${c.year}) | SRP: ${c.priceFormatted} | DP: ${c.downPaymentFormatted} | ${c.status} | ${c.transmission} | ${c.mileage}`).join('\n')
      : 'No vehicles currently available.';

    const langGuide = {
      bisaya: 'Reply ONLY in natural fluent Cebuano/Bisaya. Do NOT use Tagalog. Use: naa, pila, asa, salamat, maayong adlaw, gusto, pwede, unsay.',
      tagalog: 'Reply ONLY in natural fluent Filipino/Tagalog. Do NOT use Bisaya. Use: magkano, nasaan, po, opo, pwede, gusto, paano, salamat.',
      english: 'Reply in clear, friendly, professional English.'
    }[lang] || 'Reply in English.';

    const greeting = getTimeGreeting(lang, userName);

    const systemPrompt = `You are the official Facebook Messenger AI assistant for Capamul Cars 2.0 — a pre-owned car dealership in Barobo, Surigao del Sur, Philippines. Sign all messages as "- Capamul Team".

DEALERSHIP INFO:
- Name: Capamul Cars 2.0 | Tagline: "All in BEST Condition"
- Address: ${SHOWROOM}
- Contact 1: ${CONTACT1} | Contact 2: ${CONTACT2}
- Website: ${WEBSITE} (always include this link in responses)

LIVE INVENTORY (${cars.length} units):
${inventoryList}

FINANCING PROCESS (step-by-step):
1. Choose a vehicle from inventory or browse at ${WEBSITE}
2. Present valid government ID (voter's ID, PhilSys, barangay ID, company ID, postal ID, SSS/GSIS ID)
3. Provide proof of income (payslip, ITR, or business permit)
4. Pay Down Payment (DP) to reserve
5. Loan processed by our financing partners (3-5 business days)
6. Vehicle released upon approval

RESERVATION PROCESS:
1. Choose your unit (browse at ${WEBSITE})
2. Pay Reservation Fee (refundable within 3 days)
3. Complete documentary requirements
4. Complete Down Payment
5. Pick up or arrange delivery

SPECIAL RULE - COMPLEX FINANCING:
If the customer asks detailed financing questions (monthly payment, interest rate, credit history, loan amount, how long to pay, approval process), respond professionally:
"For detailed financing consultation, our financing specialist will assist you personally. Please allow us to add you to a group chat with our team so we can give you accurate information tailored to your situation."
Then provide contact numbers and website.

DETECTED INTENT: ${intent}

LANGUAGE INSTRUCTION: ${langGuide}

IMPORTANT RULES:
1. Sign off EVERY message as "- Capamul Team"
2. ALWAYS include the website link: ${WEBSITE}
3. ALWAYS include both contact numbers: ${CONTACT1} and ${CONTACT2}
4. Answer the customer's actual question FIRST before anything else
5. LOCATION question -> ONLY address, no car list
6. FINANCING question -> explain steps, no car list
7. SPECIFIC CAR -> show ONLY that car
8. OFF-TOPIC question -> politely say you can only assist with Capamul Cars inquiries and suggest they browse ${WEBSITE}
9. Keep responses concise and mobile-friendly`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nCustomer: "${userMessage}"\n\nCapamul Team reply (start with "${greeting}" if it makes sense):` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
      })
    });
    if (!res.ok) { console.error('[Gemini] HTTP', res.status); return null; }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) {
    console.error('[Gemini Error]:', err.message);
    return null;
  }
}

// ── Main Reply Generator ──────────────────────────────────────────
async function generateAutoReply(userMessage, senderPsid) {
  const settings = await getAISettings();
  if (settings && settings.enabled === false) return null;

  const lang   = detectLanguage(userMessage);

  // ── OFF-TOPIC CHECK: do not reply at all ─────────────────────
  if (isOffTopic(userMessage)) {
    console.log('[AI] Off-topic message detected, skipping reply.');
    if (lang === 'bisaya') return `Pasensya, wala kami makatulong niana. Ang among espesyalidad mao ang mga sasakyan!\n\nBrowse lang ang among inventory sa: ${WEBSITE}\n\nDunay bisan unsa pa ka pangutana bahin sa mga kotse? Puwede lang mag-message!\n\n- Capamul Team`;
    if (lang === 'tagalog') return `Paumanhin, ang aming expertise ay tungkol sa mga sasakyan lamang.\n\nI-browse ang aming inventory sa: ${WEBSITE}\n\nMay katanungan ka ba tungkol sa aming mga kotse? Handa kaming sumagot!\n\n- Capamul Team`;
    return `We specialize in pre-owned vehicles at Capamul Cars 2.0!\n\nBrowse our full inventory at: ${WEBSITE}\n\nFeel free to ask us anything about our cars!\n\n- Capamul Team`;
  }

  const cars     = await getAvailableCars();
  const apiKey   = process.env.GEMINI_API_KEY;
  const intent   = detectIntent(userMessage);
  const userName = senderPsid ? await getUserProfile(senderPsid) : null;
  const greeting = getTimeGreeting(lang, userName);

  console.log(`[AI] msg="${userMessage}" | lang=${lang} | intent=${intent} | cars=${cars.length}`);

  // ── Try Gemini AI first ───────────────────────────────────────
  if (apiKey && apiKey.startsWith('AIza')) {
    let carsForGemini = cars;
    if (intent === 'general') {
      const matched = matchCarsByModel(userMessage, cars);
      if (matched.length > 0) carsForGemini = matched.slice(0, 5);
    } else if (intent === 'cheapest') {
      carsForGemini = [...cars].sort((a, b) => a.price - b.price).slice(0, 6);
    } else if (intent === 'transmission') {
      const isAuto = /\b(automatic|matic|a\/t)\b/i.test(userMessage.toLowerCase());
      const filtered = cars.filter(c => isAuto
        ? (c.transmission || '').toLowerCase().includes('auto')
        : (c.transmission || '').toLowerCase().includes('manual'));
      if (filtered.length > 0) carsForGemini = filtered.slice(0, 6);
    } else if (['financing','financing_complex','financing_concern','location','reservation','contact','website'].includes(intent)) {
      carsForGemini = cars.slice(0, 3);
    }
    const aiText = await callGeminiRestApi(apiKey, userMessage, carsForGemini, lang, intent, userName);
    if (aiText) { console.log('[AI] Gemini OK.'); return aiText; }
  }

  // ── Smart Fallback Engine ─────────────────────────────────────
  console.log('[AI] Fallback engine, intent=' + intent);

  // GREETING
  if (intent === 'greeting') {
    const topCars = cars.slice(0, 3).map(c => `- *${c.name}* -- DP ${c.downPaymentFormatted}`).join('\n');
    if (lang === 'bisaya') return `${greeting} Welcome sa *Capamul Cars 2.0* -- "All in BEST Condition!"\n\nUnsay makatabang nako kaninyo?\n\nPila sa among popular units:\n${topCars}${footer}\n\nI-reply lang ang car model o budget nga imong gipangita!\n\n- Capamul Team`;
    if (lang === 'tagalog') return `${greeting} Maligayang pagdating sa *Capamul Cars 2.0* -- "All in BEST Condition!"\n\nPaano kita matutulungan?\n\nIlan sa aming sikat na units:\n${topCars}${footer}\n\nI-reply ang car model o budget na hinahanap mo!\n\n- Capamul Team`;
    return `${greeting} Welcome to *Capamul Cars 2.0* -- "All in BEST Condition!"\n\nHow can we help you today?\n\nSome popular units:\n${topCars}${footer}\n\nTell us the car model or your budget to get started!\n\n- Capamul Team`;
  }

  // LOCATION
  if (intent === 'location') {
    if (lang === 'bisaya') return `*Lokasyon sa Capamul Cars 2.0:*\n\nPurok 2, Dapdap, Barobo, Surigao del Sur\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Open: Monday-Saturday, 8AM-6PM\n- Tan-awa ang among inventory: ${WEBSITE}\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Lokasyon ng Capamul Cars 2.0:*\n\nPurok 2, Dapdap, Barobo, Surigao del Sur\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Bukas: Lunes-Sabado, 8AM-6PM\n- I-browse ang inventory: ${WEBSITE}\n\n- Capamul Team`;
    return `*Capamul Cars 2.0 Location:*\n\nPurok 2, Dapdap, Barobo, Surigao del Sur\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Open: Monday-Saturday, 8AM-6PM\n- Browse our inventory: ${WEBSITE}\n\n- Capamul Team`;
  }

  // FINANCING (basic)
  if (intent === 'financing') {
    if (lang === 'bisaya') return `*Unsaon pag-apply sa Financing?*\n\n1. Pili-a ang imong gusto nga sasakyan (tan-awa sa ${WEBSITE})\n2. Mag-present og valid ID (voter's ID, PhilSys, barangay ID, company ID, etc.)\n3. Proof of income (payslip, ITR, o business permit)\n4. Bayaran ang Down Payment (DP) para ma-reserve ang unit\n5. I-process ang loan sa among financing partners (3-5 business days)\n6. Ma-release na ang imong sasakyan!\n\nDP starts as low as PHP 11,000!\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Inventory: ${WEBSITE}\n\nUnsang sasakyan ang imong interesado?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Paano mag-apply sa Financing?*\n\n1. Pumili ng sasakyang gusto mo (i-browse sa ${WEBSITE})\n2. Magdala ng valid ID (voter's ID, PhilSys, barangay ID, company ID, etc.)\n3. Proof of income (payslip, ITR, o business permit)\n4. Bayaran ang Down Payment (DP) para ma-reserve ang unit\n5. Ipoproseso ang loan (3-5 business days)\n6. Ma-release na ang sasakyan!\n\nDP starts as low as PHP 11,000!\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Inventory: ${WEBSITE}\n\nAno pong unit ang interesado ka?\n\n- Capamul Team`;
    return `*How to Apply for Financing at Capamul Cars 2.0:*\n\n1. Choose your desired vehicle (browse at ${WEBSITE})\n2. Present a valid ID (voter's ID, PhilSys, barangay ID, company ID, etc.)\n3. Provide proof of income (payslip, ITR, or business permit)\n4. Pay the Down Payment (DP) to reserve the unit\n5. Loan processed by our partners (3-5 business days)\n6. Vehicle released upon approval!\n\nDP starts as low as PHP 11,000!\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Inventory: ${WEBSITE}\n\nWhich vehicle are you interested in?\n\n- Capamul Team`;
  }

  // FINANCING COMPLEX — professional GC suggestion
  if (intent === 'financing_complex') {
    if (lang === 'bisaya') return `Salamat sa inyong interest sa Capamul Cars 2.0!\n\nPara sa mas detalyadong impormasyon bahin sa financing -- sama na ang monthly payment, interest rate, loanable amount, ug approval process -- mas maayo nga personal nga i-discuss kini sa among financing specialist.\n\nI-coordinate namo karon ang pagbuhat og group chat aron makuha ninyo ang tukma ug kompletong impormasyon base sa inyong sitwasyon.\n\n*Palihug i-contact ang among team:*\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Browse inventory: ${WEBSITE}\n\nDaghang salamat sa inyong tiwala sa Capamul Cars 2.0!\n\n- Capamul Team`;
    if (lang === 'tagalog') return `Salamat sa inyong interes sa Capamul Cars 2.0!\n\nPara sa mas detalyadong impormasyon tungkol sa financing -- kabilang ang monthly payment, interest rate, loanable amount, at proseso ng approval -- mas mainam na personal na talakayin ito sa aming financing specialist.\n\nIaayos namin ang paglikha ng group chat para makapagbigay kami ng tumpak at kumpletong impormasyon base sa inyong sitwasyon.\n\n*Para sa agarang tulong, makipag-ugnayan sa aming team:*\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- I-browse ang inventory: ${WEBSITE}\n\nMaraming salamat sa inyong tiwala sa Capamul Cars 2.0!\n\n- Capamul Team`;
    return `Thank you for your interest in Capamul Cars 2.0!\n\nFor detailed financing information -- including monthly payments, interest rates, loanable amounts, and the full approval process -- we want to make sure you receive accurate information tailored to your specific situation.\n\nOur financing specialist will personally assist you. We will arrange a group chat so you can discuss everything in detail with our team.\n\n*For immediate assistance, please contact us:*\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Browse our inventory: ${WEBSITE}\n\nThank you for trusting Capamul Cars 2.0!\n\n- Capamul Team`;
  }

  // FINANCING CONCERN (no ID)
  if (intent === 'financing_concern') {
    if (lang === 'bisaya') return `Ayaw kabalaka! Daghan kami og ginadawat nga ID:\n\n- Barangay ID\n- Voter's ID\n- PhilSys (National ID)\n- Company ID\n- School ID + Birth Certificate\n- Postal ID\n- SSS / GSIS ID\n\nKung may dugang pa ka pangutana, puwede ka direktang mag-message sa among team!\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Browse inventory: ${WEBSITE}\n\n- Capamul Team`;
    if (lang === 'tagalog') return `Huwag mag-alala! Tinatanggap namin ang iba't ibang ID:\n\n- Barangay ID\n- Voter's ID\n- PhilSys (National ID)\n- Company ID\n- School ID + Birth Certificate\n- Postal ID\n- SSS / GSIS ID\n\nKung may tanong pa, makipag-ugnayan sa aming team!\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Browse inventory: ${WEBSITE}\n\n- Capamul Team`;
    return `Don't worry! We accept many types of valid ID:\n\n- Barangay ID\n- Voter's ID\n- PhilSys (National ID)\n- Company ID\n- School ID + Birth Certificate\n- Postal ID\n- SSS / GSIS ID\n\nIf you have more questions, contact our team directly!\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Browse inventory: ${WEBSITE}\n\n- Capamul Team`;
  }

  // RESERVATION
  if (intent === 'reservation') {
    if (lang === 'bisaya') return `*Unsaon pag-reserve sa unit?*\n\n1. Pili-a ang imong gusto (i-browse sa ${WEBSITE})\n2. Bayaran ang Reservation Fee (refundable within 3 days)\n3. I-coordinate ang documentary requirements\n4. Kumpleto ang Down Payment para ma-finalize\n5. Pick-up o i-arrange ang delivery\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n\nUnsang unit ang imong gusto i-reserve?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Paano mag-reserve ng unit?*\n\n1. Pumili ng sasakyan (i-browse sa ${WEBSITE})\n2. Bayaran ang Reservation Fee (refundable within 3 days)\n3. I-coordinate ang mga dokumento\n4. Kumpletuhin ang Down Payment\n5. Pick-up o i-arrange ang delivery\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n\nAno pong unit ang gusto mong i-reserve?\n\n- Capamul Team`;
    return `*How to Reserve a Unit:*\n\n1. Choose your unit (browse at ${WEBSITE})\n2. Pay Reservation Fee (refundable within 3 days)\n3. Submit required documents\n4. Complete Down Payment to finalize\n5. Pick up or arrange delivery\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n\nWhich unit would you like to reserve?\n\n- Capamul Team`;
  }

  // TEST DRIVE
  if (intent === 'testdrive') {
    if (lang === 'bisaya') return `*Gusto ka mag-test drive?*\n\n1. Pilia ang unit (i-browse sa ${WEBSITE})\n2. I-contact kami para sa appointment\n3. Adto sa aming showroom\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Open: Monday-Saturday, 8AM-6PM\n\nUnsang unit ang gusto nimong i-test drive?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Gusto kang mag-test drive?*\n\n1. Piliin ang unit (i-browse sa ${WEBSITE})\n2. Makipag-ugnayan para sa appointment\n3. Pumunta sa showroom\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Bukas: Lunes-Sabado, 8AM-6PM\n\nAno pong unit ang gusto mong subukan?\n\n- Capamul Team`;
    return `*Want to Schedule a Test Drive?*\n\n1. Choose your unit (browse at ${WEBSITE})\n2. Contact us to set an appointment\n3. Visit our showroom\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Showroom: ${SHOWROOM}\n- Open: Monday-Saturday, 8AM-6PM\n\nWhich car would you like to test drive?\n\n- Capamul Team`;
  }

  // CONTACT / WEBSITE
  if (intent === 'contact' || intent === 'website') {
    if (lang === 'bisaya') return `*Capamul Cars 2.0 -- Contact & Links:*\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Website: ${WEBSITE}\n- Facebook: facebook.com/CapamulCars\n- Showroom: ${SHOWROOM}\n- Open: Monday-Saturday, 8AM-6PM\n\nDunay bisan unsa pa ka pangutana?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Capamul Cars 2.0 -- Contact & Links:*\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Website: ${WEBSITE}\n- Facebook: facebook.com/CapamulCars\n- Showroom: ${SHOWROOM}\n- Bukas: Lunes-Sabado, 8AM-6PM\n\nMay iba pa bang katanungan?\n\n- Capamul Team`;
    return `*Capamul Cars 2.0 -- Contact & Links:*\n\n- Tel/SMS: ${CONTACT1}\n- Tel/SMS: ${CONTACT2}\n- Website: ${WEBSITE}\n- Facebook: facebook.com/CapamulCars\n- Showroom: ${SHOWROOM}\n- Open: Monday-Saturday, 8AM-6PM\n\nAnything else we can help with?\n\n- Capamul Team`;
  }

  // CHEAPEST
  if (intent === 'cheapest') {
    const sorted = [...cars].sort((a, b) => a.price - b.price).slice(0, 3);
    const list = sorted.map(carDetail).join('\n\n');
    if (lang === 'bisaya') return `*Pinaka-abot-kaya namong available units:*\n\n${list}${footer}\n\nGusto ka mag-test drive o mag-reserve?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Aming pinaka-abot-kayang sasakyan ngayon:*\n\n${list}${footer}\n\nGusto mo bang mag-test drive o magpa-reserve?\n\n- Capamul Team`;
    return `*Our Most Affordable Units Right Now:*\n\n${list}${footer}\n\nWould you like a test drive or reservation?\n\n- Capamul Team`;
  }

  // TRANSMISSION
  if (intent === 'transmission') {
    const isAuto = /\b(automatic|matic|a\/t)\b/i.test(userMessage.toLowerCase());
    const filtered = cars.filter(c => isAuto
      ? (c.transmission || '').toLowerCase().includes('auto')
      : (c.transmission || '').toLowerCase().includes('manual')).slice(0, 3);
    const pool = filtered.length > 0 ? filtered : cars.slice(0, 3);
    const list = pool.map(carDetail).join('\n\n');
    const label = isAuto ? 'Automatic' : 'Manual';
    if (lang === 'bisaya') return `*Among ${label} units:*\n\n${list}${footer}\n\nGusto ka og test drive?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Aming mga ${label} na sasakyan:*\n\n${list}${footer}\n\nGusto mo bang mag-test drive?\n\n- Capamul Team`;
    return `*Our ${label} Transmission Units:*\n\n${list}${footer}\n\nWould you like a test drive?\n\n- Capamul Team`;
  }

  // SPECIFIC CAR MODEL MATCH
  const matched = matchCarsByModel(userMessage, cars);
  if (matched.length > 0) {
    const list = matched.slice(0, 3).map(carDetail).join('\n\n');
    if (lang === 'bisaya') return `*Nakit-an nako ang imong gipangita:*\n\n${list}${footer}\n\nGusto ba ka mag-test drive o magpa-reserve?\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Narito ang detalye ng sasakyan:*\n\n${list}${footer}\n\nGusto mo bang mag-test drive o magpa-reserve?\n\n- Capamul Team`;
    return `*Here are the matching vehicles in our inventory:*\n\n${list}${footer}\n\nWould you like a test drive or reservation?\n\n- Capamul Team`;
  }

  // PRICE
  if (intent === 'price') {
    const sorted = [...cars].sort((a, b) => a.price - b.price);
    const topCars = sorted.slice(0, 4).map(c => `- *${c.name}* (${c.year}): DP ${c.downPaymentFormatted} | SRP ${c.priceFormatted}`).join('\n');
    if (lang === 'bisaya') return `*Among available units ug presyo:*\n\n${topCars}${footer}\n\nI-reply ang car model para sa kumpleto nga detalye!\n\n- Capamul Team`;
    if (lang === 'tagalog') return `*Aming mga sasakyan at presyo:*\n\n${topCars}${footer}\n\nI-reply ang car model para sa kumpletong detalye!\n\n- Capamul Team`;
    return `*Our Available Units & Prices:*\n\n${topCars}${footer}\n\nReply with a car model for full details!\n\n- Capamul Team`;
  }

  // DEFAULT
  const topCars = cars.slice(0, 4).map(c => `- *${c.name}*: DP ${c.downPaymentFormatted}`).join('\n');
  if (lang === 'bisaya') return `${greeting} Mao ni ang *Capamul Cars 2.0*!\n\nNaa mi ${cars.length} ka available nga units:\n${topCars}${footer}\n\nI-reply lang kung unsa ang imong gipangita:\n- Car model o brand\n- Budget o DP range\n- Automatic o Manual?\n- Location, financing, o reservation\n\n- Capamul Team`;
  if (lang === 'tagalog') return `${greeting} Ito ang *Capamul Cars 2.0*!\n\nMayroon kaming ${cars.length} available na units:\n${topCars}${footer}\n\nI-reply kung ano ang hinahanap mo:\n- Car model o brand\n- Budget o DP range\n- Automatic o Manual?\n- Location, financing, o reservation\n\n- Capamul Team`;
  return `${greeting} Welcome to *Capamul Cars 2.0* -- "All in BEST Condition!"\n\nWe have ${cars.length} available vehicles:\n${topCars}${footer}\n\nTell us what you're looking for:\n- A specific car model or brand\n- Your budget or DP range\n- Automatic or Manual?\n- Location, financing, or reservation info\n\n- Capamul Team`;
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
