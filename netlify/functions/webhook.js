const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'capamul_cars_messenger_verify_token_123';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || 'EAATZAJmZCfZBowBSKUlkFvENI1NKKPw9m0Dmwt7blRW7JHAP0hRTEcjLOlw4rPjZA4KWwNkzXqwwrBrJSrczvlMmTIfX4sD4rf1QTLUKUDEzWF46ZAEW4wJNZCfYl20TOk8eIyC52P0YdsR5aPW24cH3ko2TnfvjskM8Td2rQj5lEPVImvPCDZB3d96LgFM0R343HpZBQQFh9wZDZD';
const GRAPH_API_URL = 'https://graph.facebook.com/v19.0/me/messages';

const sbHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json'
};

function computeDp(price, explicitDp) {
  if (explicitDp && Number(explicitDp) > 0) return Number(explicitDp);
  const v = Number(price ?? 0);
  if (isNaN(v) || v <= 0) return 50000;
  const raw = v * 0.15;
  const rounded = Math.floor(raw / 5000) * 5000;
  return Math.max(50000, rounded);
}

function formatPhp(amount) {
  const v = Number(amount ?? 0);
  return '₱ ' + v.toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

async function getAvailableCars() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/cars?select=*&order=created_at.desc`, { headers: sbHeaders });
    if (!res.ok) throw new Error(`Supabase HTTP ${res.status}`);
    const data = await res.json();
    const activeCars = (data || []).filter(c => ['available', 'reserved'].includes((c.status || '').toLowerCase()));
    return activeCars.map(c => ({
      id: c.id,
      name: c.name || `${c.year || ''} ${c.make || ''} ${c.model || ''}`.trim(),
      make: c.make,
      model: c.model,
      year: c.year,
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
    if (data && data.length > 0 && data[0].value) {
      return data[0].value;
    }
    return { enabled: true };
  } catch (err) {
    return { enabled: true };
  }
}

// ── Language Detection ───────────────────────────────────────────
function detectLanguage(msg) {
  const lower = msg.toLowerCase();
  const bisayaWords = ['pila','tag pila','naa','naa pa','naa bay','asa','dapit','akong','unsa','unsay','unsaon','ganahan','tawag','salamat','maayong','adlaw','buntag','hapon','gabii','naku','nku','sakyanan','diri','didto'];
  const tagalogWords = ['magkano','paano','saan','nasaan','kailan','yung','ito','doon','po','opo','hindi','meron','pwede','gusto','maganda','mura','salamat','sige','reserve','reserva','location','financing','apply'];
  let bScore = 0, tScore = 0;
  for (const w of bisayaWords) { if (lower.includes(w)) bScore++; }
  for (const w of tagalogWords) { if (lower.includes(w)) tScore++; }
  if (bScore > tScore && bScore > 0) return 'bisaya';
  if (tScore > bScore && tScore > 0) return 'tagalog';
  if (/\b(pila|naa ba|asa man|unsa|ganahan|maayong|unsaon|naku|nku)\b/i.test(lower)) return 'bisaya';
  if (/\b(magkano|nasaan|po ba|opo|pwede po|paano)\b/i.test(lower)) return 'tagalog';
  return 'english';
}

// ── Intent Detection ─────────────────────────────────────────────
function detectIntent(msg) {
  const m = msg.toLowerCase();
  if (/\b(hello|hi|hey|good morning|good afternoon|good evening|kumusta|kamusta|maayong|magandang|howdy|greetings)\b/i.test(m)) return 'greeting';
  if (/\b(location|address|asa|nasaan|saan|direction|diin|where|map|purok|barobo|surigao)\b/i.test(m)) return 'location';
  if (/\b(financ|loan|utang|installment|how to apply|pano mag apply|unsaon pag apply|mag-apply|apply|monthly|amortization|in-house|bank)\b/i.test(m)) return 'financing';
  if (/\b(reserv|book|booking|hold|pag reserve|mag-reserve|magpa-reserve|unsaon pag reserve|paano mag reserve)\b/i.test(m)) return 'reservation';
  if (/\b(test drive|testdrive|try|tikman|subukan)\b/i.test(m)) return 'testdrive';
  if (/\b(cheap|cheapest|lowest|barato|pinaka barato|pinakamura|mura|affordable|budget)\b/i.test(m)) return 'cheapest';
  if (/\b(recommend|rekomenda|best|nindot|maganda|suggest|good choice)\b/i.test(m)) return 'recommendation';
  if (/\b(automatic|manual|matic|a\/t|m\/t)\b/i.test(m)) return 'transmission';
  if (/\b(dp|down payment|downpayment|how much|magkano|pila|tag pila|presyo|price|srp|total)\b/i.test(m)) return 'price';
  if (/\b(available|stock|naa pa|meron pa|inventory|units|cars|sasakyan|ano available)\b/i.test(m)) return 'inventory';
  if (/\b(contact|number|phone|tawag|call|text|facebook|fb|social media|hours|open|bukas|oras)\b/i.test(m)) return 'contact';
  return 'general';
}

// ── Normalize common misspellings ────────────────────────────────
function normalize(str) {
  return str.toLowerCase()
    .replace(/\bwego\b/g, 'wigo')
    .replace(/\bmirag\b/g, 'mirage')
    .replace(/\bfurtoner\b/g, 'fortuner')
    .replace(/\bhilax\b/g, 'hilux')
    .replace(/\bmonterio\b/g, 'montero')
    .replace(/\bnavarra\b/g, 'navara');
}

// ── Precise car model matching with scoring ──────────────────────
function matchCarsByModel(userMessage, cars) {
  const lower = normalize(userMessage);
  const scored = cars.map(car => {
    const make  = normalize(car.make  || '');
    const model = normalize(car.model || '');
    const name  = normalize(car.name  || '');
    let score = 0;
    // Model words match (highest: 10 pts each)
    const modelWords = model.split(/[\s\-\/]+/).filter(w => w.length > 2);
    for (const w of modelWords) {
      if (new RegExp(`\\b${w}\\b`).test(lower)) score += 10;
    }
    // Make match (5 pts each)
    const makeWords = make.split(/[\s\-\/]+/).filter(w => w.length > 2);
    for (const w of makeWords) {
      if (new RegExp(`\\b${w}\\b`).test(lower)) score += 5;
    }
    // Name words match (2 pts each, skip generic words)
    const skip = new Set(['the','and','top','high','end','series','line','new','used']);
    const nameWords = name.split(/[\s\-\/]+/).filter(w => w.length > 2 && !skip.has(w));
    for (const w of nameWords) {
      if (lower.includes(w)) score += 2;
    }
    return { car, score };
  });
  return scored
    .filter(s => s.score >= 5)
    .sort((a, b) => b.score - a.score)
    .map(s => s.car);
}

// ── Format single car detail block ──────────────────────────────
function carDetail(c) {
  const statusIcon = (c.status || '').toLowerCase() === 'reserved'
    ? '🔒 Reserved (Waitlist open)' : '✅ Available';
  return `🚗 *${c.name}* (${c.year})\n• Total Price (SRP): ${c.priceFormatted}\n• Down Payment (DP): ${c.downPaymentFormatted}\n• Status: ${statusIcon}\n• ${c.transmission} | ${c.mileage}`;
}

// ── Gemini AI Call ───────────────────────────────────────────────
async function callGeminiRestApi(apiKey, userMessage, cars, lang, intent) {
  try {
    const inventoryList = cars.length > 0
      ? cars.map(c => `• ${c.name} (${c.year}) | SRP: ${c.priceFormatted} | DP: ${c.downPaymentFormatted} | ${c.status} | ${c.transmission} | ${c.mileage}`).join('\n')
      : 'No vehicles currently available. Inform customer new arrivals are coming soon.';

    const langGuide = {
      bisaya: 'Reply ONLY in natural fluent Cebuano/Bisaya. Use: naa, pila, asa, salamat, maayong adlaw, gusto, pwede, unsay, ganahan. Do NOT use Tagalog words.',
      tagalog: 'Reply ONLY in natural fluent Filipino/Tagalog. Use: magkano, nasaan, po, opo, pwede, gusto, paano, salamat, magandang araw. Do NOT use Bisaya words.',
      english: 'Reply in clear, friendly, professional English.'
    }[lang] || 'Reply in English.';

    const systemPrompt = `You are "Cara", the friendly and professional AI Sales Assistant for Capamul Cars 2.0 — a trusted pre-owned car dealership in Barobo, Surigao del Sur, Philippines.

DEALERSHIP INFO:
• Name: Capamul Cars 2.0 | Tagline: "All in BEST Condition"
• Address: Purok 2, Dapdap, Barobo, Surigao del Sur
• Contact: 09686995654 | Website: capamulcars2.netlify.app

LIVE INVENTORY (${cars.length} units):
${inventoryList}

HOW TO APPLY FOR FINANCING:
1. Choose a vehicle from inventory
2. Present valid government-issued ID
3. Provide proof of income (payslip, ITR, or business permit)
4. Pay the Down Payment (DP) to reserve
5. Loan processed through our financing partners (3-5 business days)
6. Vehicle released upon approval

HOW TO RESERVE A UNIT:
1. Choose your desired unit
2. Pay Reservation Fee (refundable within 3 days)
3. Coordinate documentary requirements
4. Complete Down Payment to finalize
5. Pick up vehicle or arrange delivery

DETECTED CUSTOMER INTENT: ${intent}

LANGUAGE INSTRUCTION: ${langGuide}

YOUR RULES (FOLLOW STRICTLY):
1. ALWAYS answer the customer's actual question directly and first
2. If asked about LOCATION → give ONLY the address. Do NOT list cars.
3. If asked about FINANCING → explain the financing steps. Do NOT list cars.
4. If asked about RESERVATION → explain reservation steps. Do NOT list cars.
5. If asked about a SPECIFIC CAR MODEL → show ONLY matching cars, not random ones
6. If asked about PRICE/DP → list cars sorted from cheapest DP first
7. Use bullet points and emojis (🚗 💰 📍 📞 ✅ 🔒) but do not overuse
8. Keep responses concise, warm, professional — like Meta AI but for car sales
9. Always end with a relevant follow-up question or call to action
10. Format prices clearly with ₱ symbol`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nCustomer Message: "${userMessage}"\n\nYour reply as Cara:` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 }
      })
    });

    if (!res.ok) { console.error('[Gemini] HTTP error:', res.status); return null; }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    console.error('[Gemini REST Error]:', err.message);
    return null;
  }
}

// ── Main AI Reply Generator ──────────────────────────────────────
async function generateAutoReply(userMessage) {
  const settings = await getAISettings();
  if (settings && settings.enabled === false) {
    console.log('[AI] Auto-reply is OFF in admin settings.');
    return null;
  }

  const cars   = await getAvailableCars();
  const apiKey = process.env.GEMINI_API_KEY;
  const lang   = detectLanguage(userMessage);
  const intent = detectIntent(userMessage);

  console.log(`[AI] msg="${userMessage}" | lang=${lang} | intent=${intent} | cars=${cars.length}`);

  // ── Try Gemini AI first ──────────────────────────────────────
  if (apiKey && apiKey.startsWith('AIza')) {
    // For model-specific queries, pre-filter cars for Gemini context
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
        : (c.transmission || '').toLowerCase().includes('manual')
      );
      if (filtered.length > 0) carsForGemini = filtered.slice(0, 6);
    }
    const aiText = await callGeminiRestApi(apiKey, userMessage, carsForGemini, lang, intent);
    if (aiText) {
      console.log('[AI] Gemini responded successfully.');
      return aiText;
    }
  }

  // ── Smart Fallback Engine ─────────────────────────────────────
  console.log('[AI] Using smart fallback engine, intent=' + intent);
  const contactLine = '\n\n📞 Call/Text: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur';

  // 1. GREETING
  if (intent === 'greeting') {
    const topCars = cars.slice(0, 3).map(c => `• *${c.name}* — DP ${c.downPaymentFormatted}`).join('\n');
    if (lang === 'bisaya') return `Maayong adlaw! 👋 Welcome sa *Capamul Cars 2.0* — "All in BEST Condition!"\n\nAko si Cara, ang inyong AI Sales Assistant! 😊 Unsay makatabang nako kaninyo?\n\n🚗 Pila sa among popular units:\n${topCars}${contactLine}\n\nI-reply lang ang car model o budget nga imong gipangita!`;
    if (lang === 'tagalog') return `Magandang araw! 👋 Maligayang pagdating sa *Capamul Cars 2.0* — "All in BEST Condition!"\n\nAko si Cara, ang inyong AI Sales Assistant! 😊 Paano kita matutulungan ngayon?\n\n🚗 Ilan sa aming sikat na units:\n${topCars}${contactLine}\n\nI-reply ang car model o budget na hinahanap mo!`;
    return `Hello! 👋 Welcome to *Capamul Cars 2.0* — "All in BEST Condition!"\n\nI'm Cara, your AI Sales Assistant! 😊 How can I help you today?\n\n🚗 Some popular units:\n${topCars}${contactLine}\n\nTell me the car model or your budget to get started!`;
  }

  // 2. LOCATION — ONLY show address, NOT car list
  if (intent === 'location') {
    if (lang === 'bisaya') return `📍 *Lokasyon sa Capamul Cars 2.0:*\n\nPurok 2, Dapdap, Barobo, Surigao del Sur\n\n📞 Para sa direksyon: 09686995654\n⏰ Open: Monday–Saturday, 8AM–6PM\n\nDunay bisan unsa pa ka pangutana? 😊`;
    if (lang === 'tagalog') return `📍 *Lokasyon ng Capamul Cars 2.0:*\n\nPurok 2, Dapdap, Barobo, Surigao del Sur\n\n📞 Para sa direksyon: 09686995654\n⏰ Bukas: Lunes–Sabado, 8AM–6PM\n\nMay iba pa bang katanungan? 😊`;
    return `📍 *Capamul Cars 2.0 Location:*\n\nPurok 2, Dapdap, Barobo, Surigao del Sur\n\n📞 For directions: 09686995654\n⏰ Open: Monday–Saturday, 8AM–6PM\n\nAnything else I can help with? 😊`;
  }

  // 3. FINANCING — explain steps, NOT car list
  if (intent === 'financing') {
    if (lang === 'bisaya') return `💳 *Unsaon pag-apply sa Financing?*\n\n1️⃣ Pili-a ang imong gusto nga sasakyan\n2️⃣ Mag-present og valid ID (1 government ID)\n3️⃣ Proof of income (payslip, ITR, o business permit)\n4️⃣ Bayaran ang Down Payment (DP) para ma-reserve ang unit\n5️⃣ I-process ang loan sa among financing partners\n6️⃣ Ma-release ang sasakyan pagkahuman sa approval (3–5 business days)\n\n💡 *DP starts as low as ₱11,000!*\n\n📞 09686995654 | 📍 Barobo, Surigao del Sur\n\nUnsang sasakyan ang imong interesado? Hatagan tika og exact DP! 😊`;
    if (lang === 'tagalog') return `💳 *Paano mag-apply sa Financing?*\n\n1️⃣ Pumili ng sasakyang gusto mo\n2️⃣ Magdala ng valid ID (1 government ID)\n3️⃣ Proof of income (payslip, ITR, o business permit)\n4️⃣ Bayaran ang Down Payment (DP) para ma-reserve ang unit\n5️⃣ Ipoproseso ang loan sa aming financing partners\n6️⃣ Ma-release ang sasakyan pagkatapos ng approval (3–5 business days)\n\n💡 *DP starts as low as ₱11,000!*\n\n📞 09686995654 | 📍 Barobo, Surigao del Sur\n\nAno pong sasakyan ang interesado ka? Ibibigay ko ang exact na DP! 😊`;
    return `💳 *How to Apply for Financing at Capamul Cars 2.0:*\n\n1️⃣ Choose your desired vehicle from our inventory\n2️⃣ Present a valid government-issued ID\n3️⃣ Provide proof of income (payslip, ITR, or business permit)\n4️⃣ Pay the Down Payment (DP) to reserve the unit\n5️⃣ We process your loan through our financing partners\n6️⃣ Vehicle released upon approval (3–5 business days)\n\n💡 *DP starts as low as ₱11,000!*\n\n📞 09686995654 | 📍 Barobo, Surigao del Sur\n\nWhich vehicle are you interested in? I'll give you the exact DP! 😊`;
  }

  // 4. RESERVATION — explain steps
  if (intent === 'reservation') {
    if (lang === 'bisaya') return `🔖 *Unsaon pag-reserve sa unit?*\n\n1️⃣ Pili-a ang imong gusto nga sasakyan\n2️⃣ Bayaran ang Reservation Fee (refundable within 3 days)\n3️⃣ I-coordinate ang documentary requirements\n4️⃣ Kumpleto ang Down Payment (DP) para ma-finalize\n5️⃣ Pick-up sa inyong sasakyan o pwede'g i-arrange og delivery\n\n📞 Para mag-reserve karon: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur\n\nUnsang unit ang imong gusto i-reserve? 🚗`;
    if (lang === 'tagalog') return `🔖 *Paano mag-reserve ng unit?*\n\n1️⃣ Piliin ang sasakyang gusto mo\n2️⃣ Bayaran ang Reservation Fee (refundable within 3 days)\n3️⃣ I-coordinate ang mga dokumento\n4️⃣ Kumpletuhin ang Down Payment para ma-finalize\n5️⃣ Pick-up o puwedeng i-arrange ang delivery\n\n📞 Para mag-reserve ngayon: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur\n\nAno pong unit ang gusto mong i-reserve? 🚗`;
    return `🔖 *How to Reserve a Unit at Capamul Cars 2.0:*\n\n1️⃣ Choose your preferred vehicle\n2️⃣ Pay the Reservation Fee (refundable within 3 days)\n3️⃣ Submit required documents\n4️⃣ Complete the Down Payment to finalize\n5️⃣ Pick up your car or arrange delivery\n\n📞 To reserve now: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur\n\nWhich unit would you like to reserve? 🚗`;
  }

  // 5. TEST DRIVE
  if (intent === 'testdrive') {
    if (lang === 'bisaya') return `🚗 *Gusto ka mag-test drive?* Dako kaayo nga desisyon!\n\n1️⃣ Pilia ang unit nga gusto nimong subukan\n2️⃣ I-contact kami para sa appointment\n3️⃣ Adto sa aming showroom\n\n📞 I-schedule na: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur\n⏰ Monday–Saturday, 8AM–6PM\n\nUnsang unit ang gusto nimong i-test drive?`;
    if (lang === 'tagalog') return `🚗 *Gusto kang mag-test drive?* Magandang hakbang!\n\n1️⃣ Piliin ang unit na gusto mong subukan\n2️⃣ Makipag-ugnayan para sa appointment\n3️⃣ Pumunta sa aming showroom\n\n📞 Mag-schedule na: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur\n⏰ Lunes–Sabado, 8AM–6PM\n\nAno pong unit ang gusto mong subukan?`;
    return `🚗 *Want to Schedule a Test Drive?* Great choice!\n\n1️⃣ Choose the unit you'd like to try\n2️⃣ Contact us to set an appointment\n3️⃣ Visit our showroom\n\n📞 Book now: 09686995654\n📍 Purok 2, Dapdap, Barobo, Surigao del Sur\n⏰ Monday–Saturday, 8AM–6PM\n\nWhich car would you like to test drive?`;
  }

  // 6. CONTACT / HOURS
  if (intent === 'contact') {
    if (lang === 'bisaya') return `📞 *Capamul Cars 2.0 — Contact Info:*\n\n• Tawag/Text: 09686995654\n• Facebook: facebook.com/CapamulCars\n• Website: capamulcars2.netlify.app\n• Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n• ⏰ Open: Monday–Saturday, 8AM–6PM\n\nDunay bisan unsa pa ka pangutana? 😊`;
    if (lang === 'tagalog') return `📞 *Capamul Cars 2.0 — Makipag-ugnayan:*\n\n• Tumawag/Mag-text: 09686995654\n• Facebook: facebook.com/CapamulCars\n• Website: capamulcars2.netlify.app\n• Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n• ⏰ Bukas: Lunes–Sabado, 8AM–6PM\n\nMay iba pa bang katanungan? 😊`;
    return `📞 *Capamul Cars 2.0 — Contact Info:*\n\n• Call/Text: 09686995654\n• Facebook: facebook.com/CapamulCars\n• Website: capamulcars2.netlify.app\n• Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n• ⏰ Open: Monday–Saturday, 8AM–6PM\n\nAnything else I can help with? 😊`;
  }

  // 7. CHEAPEST / BUDGET
  if (intent === 'cheapest') {
    const sorted = [...cars].sort((a, b) => a.price - b.price).slice(0, 3);
    const list = sorted.map(carDetail).join('\n\n');
    if (lang === 'bisaya') return `💰 *Pinaka-abot-kaya namong available units:*\n\n${list}${contactLine}\n\nGusto ka mag-test drive o mag-reserve? 😊`;
    if (lang === 'tagalog') return `💰 *Aming pinaka-abot-kayang sasakyan ngayon:*\n\n${list}${contactLine}\n\nGusto mo bang mag-test drive o magpa-reserve? 😊`;
    return `💰 *Our Most Affordable Units Right Now:*\n\n${list}${contactLine}\n\nWould you like to schedule a test drive or make a reservation? 😊`;
  }

  // 8. TRANSMISSION FILTER
  if (intent === 'transmission') {
    const isAuto = /\b(automatic|matic|a\/t)\b/i.test(userMessage.toLowerCase());
    const filtered = cars.filter(c => isAuto
      ? (c.transmission || '').toLowerCase().includes('auto')
      : (c.transmission || '').toLowerCase().includes('manual')
    ).slice(0, 3);
    const pool = filtered.length > 0 ? filtered : cars.slice(0, 3);
    const list = pool.map(carDetail).join('\n\n');
    const label = isAuto ? 'Automatic' : 'Manual';
    if (lang === 'bisaya') return `🚗 *Among ${label} units:*\n\n${list}${contactLine}\n\nGusto ka og test drive? 😊`;
    if (lang === 'tagalog') return `🚗 *Aming mga ${label} na sasakyan:*\n\n${list}${contactLine}\n\nGusto mo bang mag-test drive? 😊`;
    return `🚗 *Our ${label} Transmission Units:*\n\n${list}${contactLine}\n\nWould you like a test drive? 😊`;
  }

  // 9. SPECIFIC CAR MODEL MATCH
  const matched = matchCarsByModel(userMessage, cars);
  if (matched.length > 0) {
    const list = matched.slice(0, 3).map(carDetail).join('\n\n');
    if (lang === 'bisaya') return `🚗 *Nakit-an nako ang imong gipangita:*\n\n${list}${contactLine}\n\nGusto ba ka mag-schedule og test drive o magpa-reserve? 😊`;
    if (lang === 'tagalog') return `🚗 *Narito ang detalye ng sasakyan na iyong hinahanap:*\n\n${list}${contactLine}\n\nGusto mo bang mag-test drive o magpa-reserve? 😊`;
    return `🚗 *Here are the matching vehicles in our inventory:*\n\n${list}${contactLine}\n\nWould you like to schedule a test drive or reserve a unit? 😊`;
  }

  // 10. PRICE / DP INQUIRY
  if (intent === 'price') {
    const sorted = [...cars].sort((a, b) => a.price - b.price);
    const topCars = sorted.slice(0, 4).map(c => `• *${c.name}* (${c.year}): DP ${c.downPaymentFormatted} | SRP ${c.priceFormatted}`).join('\n');
    if (lang === 'bisaya') return `💰 *Among available units ug ang ilang presyo:*\n\n${topCars}${contactLine}\n\nI-reply ang specific car model para sa kumpleto nga detalye! 😊`;
    if (lang === 'tagalog') return `💰 *Aming mga sasakyan at presyo:*\n\n${topCars}${contactLine}\n\nI-reply ang car model para sa kumpletong detalye! 😊`;
    return `💰 *Our Available Units & Prices:*\n\n${topCars}${contactLine}\n\nReply with a specific car model for full details! 😊`;
  }

  // 11. DEFAULT — helpful overview with menu of options
  const topCars = cars.slice(0, 4).map(c => `• *${c.name}*: DP ${c.downPaymentFormatted}`).join('\n');
  if (lang === 'bisaya') return `Maayong adlaw! 👋 Ako si Cara sa *Capamul Cars 2.0*!\n\nNaa mi ${cars.length} ka available nga units!\n${topCars}${contactLine}\n\nI-reply lang kung unsa ang imong gipangita:\n• Specific car model o brand\n• Budget o DP range\n• Automatic o Manual?\n• Location, financing, o reservation`;
  if (lang === 'tagalog') return `Magandang araw! 👋 Ako si Cara ng *Capamul Cars 2.0*!\n\nMayroon kaming ${cars.length} available na units!\n${topCars}${contactLine}\n\nI-reply kung ano ang hinahanap mo:\n• Specific car model o brand\n• Budget o DP range\n• Automatic o Manual?\n• Location, financing, o reservation`;
  return `Hello! 👋 I'm Cara, your AI Sales Assistant at *Capamul Cars 2.0* — "All in BEST Condition!"\n\nWe have ${cars.length} available vehicles!\n${topCars}${contactLine}\n\nTell me what you're looking for:\n• A specific car model or brand\n• Your budget or DP range\n• Automatic or Manual?\n• Location, financing, or reservation info 😊`;
}

async function sendTextMessage(recipientPsid, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('[FB Messenger] Token Missing in sendTextMessage!');
    return;
  }
  try {
    const res = await fetch(`${GRAPH_API_URL}?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientPsid },
        message: { text: text }
      })
    });
    const resData = await res.json();
    if (!res.ok) {
      console.error('[FB Messenger Error]:', resData);
    } else {
      console.log('[FB Messenger Success] Replied to PSID:', recipientPsid, resData);
    }
  } catch (err) {
    console.error('[FB Send Message Error]:', err.message);
  }
}

export const handler = async (event, context) => {
  const httpMethod = event.httpMethod;

  if (httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
      return { statusCode: 200, body: challenge };
    }
    return { statusCode: 403, body: 'Verification failed' };
  }

  if (httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');

      if (body.object === 'page') {
        const entries = body.entry || [];
        for (const entry of entries) {
          const webhookEvents = entry.messaging || [];
          for (const webhookEvent of webhookEvents) {
            const senderPsid = webhookEvent.sender?.id;
            const userQuery = webhookEvent.message?.text || webhookEvent.postback?.payload;

            if (senderPsid && userQuery) {
              console.log(`[FB Webhook] Received message from PSID (${senderPsid}): "${userQuery}"`);
              const reply = await generateAutoReply(userQuery);
              if (reply) {
                await sendTextMessage(senderPsid, reply);
              }
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
