import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAvailableCars, getAISettingsFromDb } from './supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Google Generative AI client when API key is present
let genAI = null;
if (GEMINI_API_KEY && GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' && GEMINI_API_KEY.length > 10) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('[AI Agent] ✅ Gemini AI initialized successfully.');
} else {
  console.log('[AI Agent] ⚠️  GEMINI_API_KEY not set — running in smart fallback mode.');
}

// ─── Language Detection ───────────────────────────────────────────────────────

/**
 * Detects the primary language used in the customer message.
 * Returns: 'bisaya' | 'tagalog' | 'english'
 */
function detectLanguage(msg) {
  const lower = msg.toLowerCase();

  // Bisaya / Cebuano markers
  const bisayaWords = [
    'pila', 'tag pila', 'tag-pila', 'naa', 'naa pa', 'naa bay', 'wala na', 'asa',
    'dapit', 'inyong', 'inyo', 'ninyo', 'ako', 'akong', 'ikaw', 'siya', 'sila',
    'unsa', 'unsay', 'kanus-a', 'ganahan', 'gusto', 'pangutan-a', 'pangutana',
    'showroom', 'tawag', 'magpa', 'palihug', 'salamat', 'maayong', 'adlaw',
    'gabii', 'hapon', 'buntag', 'kaila', 'amoa', 'among', 'amo', 'atong',
    'libre', 'libre ba', 'dali', 'sulit', 'kaayo', 'ra ba', 'lang', 'ko ba',
    'maka', 'makakuha', 'mao', 'mao ba', 'pwede ba', 'pwedi', 'pwede ko',
    'yung', 'lagi', 'manlalabas', 'makita', 'tan-awa', 'lahi', 'lahi ba',
    'ingon', 'ingon ana', 'ingon niana'
  ];

  // Tagalog / Filipino markers
  const tagalogWords = [
    'magkano', 'ano', 'paano', 'saan', 'nasaan', 'kailan', 'sino', 'bakit',
    'yung', 'ito', 'iyon', 'dito', 'doon', 'kami', 'tayo', 'kayo', 'sila',
    'namin', 'natin', 'ninyo', 'nila', 'nila', 'ko', 'ka', 'siya', 'ito',
    'ang', 'ng', 'mga', 'na', 'pa', 'din', 'rin', 'ba', 'po', 'opo',
    'hindi', 'wala', 'may', 'meron', 'pwede', 'pede', 'gusto', 'ayaw',
    'maganda', 'mura', 'mahal', 'bago', 'luma', 'malaki', 'maliit',
    'salamat', 'sige', 'okay', 'saan', 'nasaan', 'gaano', 'ilang',
    'pang', 'nang', 'naman', 'lang', 'kasi', 'kaya', 'pero', 'at',
    'para', 'dahil', 'kung', 'kapag', 'pag', 'bago', 'pagkatapos',
    'mayroon', 'walang', 'anong', 'alin', 'kanino', 'magkano po',
    'available po', 'tanong ko lang', 'pabili', 'bilhin', 'bibilhin',
    'kumuha', 'kukuha', 'makuha', 'makita', 'ipakita', 'ipapakita'
  ];

  // Count keyword matches
  let bisayaScore = 0;
  let tagalogScore = 0;

  for (const word of bisayaWords) {
    if (lower.includes(word)) bisayaScore++;
  }
  for (const word of tagalogWords) {
    if (lower.includes(word)) tagalogScore++;
  }

  // Bisaya wins if it has more or equal strong signals
  if (bisayaScore > tagalogScore && bisayaScore > 0) return 'bisaya';
  if (tagalogScore > bisayaScore && tagalogScore > 0) return 'tagalog';

  // Tiebreaker: check for strong Bisaya-only unique patterns
  if (/\b(pila|naa ba|asa man|tag pila|unsa|ganahan|maayong)\b/i.test(lower)) return 'bisaya';
  // Tiebreaker: check for strong Tagalog-only unique patterns
  if (/\b(magkano|nasaan|ito ba|po ba|opo|pwede po|mayroon|bibilhin)\b/i.test(lower)) return 'tagalog';

  return 'english';
}

// ─── Greeting templates per language ─────────────────────────────────────────
const greetings = {
  bisaya: ['Maayong adlaw! 👋', 'Kumusta! 👋', 'Hello! 👋'],
  tagalog: ['Magandang araw! 👋', 'Kumusta po! 👋', 'Hello po! 👋'],
  english: ['Hello! 👋', 'Hi there! 👋', 'Good day! 👋'],
};

function randomGreeting(lang) {
  const g = greetings[lang] || greetings.english;
  return g[Math.floor(Math.random() * g.length)];
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Generates an AI reply grounded in real-time Supabase car inventory.
 * Returns null if AI agent is disabled by admin (no auto-reply sent).
 */
export async function generateAutoReply(userMessage) {
  // 1. Check if AI Agent is enabled in Admin Settings
  const aiSettings = await getAISettingsFromDb();
  if (aiSettings && aiSettings.enabled === false) {
    console.log('[AI Agent] Auto-reply is PAUSED (disabled by Admin).');
    return null;
  }

  // 2. Fetch live inventory
  const availableCars = await getAvailableCars();

  // 3. Detect language upfront so both Gemini and fallback use same logic
  const lang = detectLanguage(userMessage);
  console.log(`[AI Agent] Detected language: ${lang} | Message: "${userMessage}"`);

  // 4. Route to Gemini AI or smart fallback
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE' || GEMINI_API_KEY.length <= 10 || !genAI) {
    console.log('[AI Agent] Using smart fallback engine (no Gemini key).');
    return generateFallbackReply(userMessage, availableCars, lang);
  }

  try {
    const reply = await callGemini(userMessage, availableCars, lang);
    if (reply) return reply;
    return generateFallbackReply(userMessage, availableCars, lang);
  } catch (err) {
    console.error('[AI Agent Error]:', err.message);
    return generateFallbackReply(userMessage, availableCars, lang);
  }
}

// ─── Gemini AI Engine ─────────────────────────────────────────────────────────

async function callGemini(userMessage, cars, lang) {
  const inventorySummary = cars.length > 0
    ? cars.map(c =>
      `• ${c.name} (${c.year}) | SRP: ${c.priceFormatted} | DP: ${c.downPaymentFormatted} | Status: ${c.status} | Transmission: ${c.transmission} | Fuel: ${c.fuelType} | Mileage: ${c.mileage} | Body: ${c.bodyType}`
    ).join('\n')
    : 'No vehicles currently available. New arrivals coming soon.';

  const langInstruction = {
    bisaya: `The customer is speaking in BISAYA / CEBUANO. You MUST reply entirely in warm, natural, conversational Bisaya/Cebuano. Use words like "Maayong adlaw", "naa", "pila", "salamat", "tawag", "ganahan", "gusto", "dapit". Do NOT switch to Tagalog or English.`,
    tagalog: `The customer is speaking in TAGALOG / FILIPINO. You MUST reply entirely in warm, natural Tagalog. Use "Magandang araw", "po", "opo", "magkano", "saan", "salamat". Do NOT switch to English or Bisaya.`,
    english: `The customer is speaking in ENGLISH. Reply in clear, friendly, professional English.`,
  }[lang];

  const systemPrompt = `You are "Capamul AI", the official friendly Facebook Messenger sales assistant for Capamul Cars 2.0 — a reputable pre-owned car dealership in Barobo, Surigao del Sur, Philippines.

═══ DEALERSHIP INFO ═══
• Name: Capamul Cars 2.0
• Tagline: "All in BEST Condition"
• Location: Purok 2, Dapdap, Barobo, Surigao del Sur
• Contact: 09686995654
• Website: https://capamulcars2.netlify.app
• Facebook: https://www.facebook.com/share/1Eq7cKc5uA/

═══ LIVE INVENTORY (real-time from database) ═══
${inventorySummary}

═══ LANGUAGE RULE (NON-NEGOTIABLE) ═══
${langInstruction}

═══ RESPONSE RULES ═══
1. Keep replies SHORT and mobile-friendly (suitable for Facebook Messenger chat bubbles).
2. Always show the exact SRP (Total Price) AND DP (Down Payment) for any car you mention.
3. Use Philippine Peso symbol ₱ for all prices.
4. Use emojis naturally: 🚗 for cars, 💰 for prices/DP, 📍 for location, 📞 for phone, ✅ for available.
5. Only mention cars that exist in the Live Inventory above — never invent cars.
6. If all cars are reserved or unavailable, politely say so and invite them to check back or contact directly.
7. Always end with a call-to-action: invite to visit, call, or reserve online.
8. If the customer asks something unrelated to cars/dealership, politely redirect the conversation back to Capamul Cars.
9. If asked for test drive, say to call 09686995654 or visit the showroom.
10. Never share personal opinions. Stay professional and on-brand.`;

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(
    `${systemPrompt}\n\n───────────────\nCustomer Message: "${userMessage}"\n\nYour reply:`
  );

  const replyText = result.response.text()?.trim();
  return replyText || null;
}

// ─── Smart Fallback Engine ────────────────────────────────────────────────────
// Handles all 3 languages when Gemini key is not yet configured.

function generateFallbackReply(userMessage, cars, lang) {
  const msg = userMessage.toLowerCase();

  // ── 1. Car model/make specific match ────────────────────────────────────
  const matchedCars = cars.filter(c => {
    const haystack = [c.name, c.make, c.model].filter(Boolean).map(s => s.toLowerCase());
    return haystack.some(h => msg.includes(h));
  });

  if (matchedCars.length > 0) {
    const list = matchedCars.slice(0, 3).map(c =>
      `🚗 *${c.name}* (${c.year})\n` +
      `• SRP: ${c.priceFormatted}\n` +
      `• Down Payment (DP): ${c.downPaymentFormatted}\n` +
      `• ${c.status === 'Reserved' ? '🔒 Reserved' : '✅ Available'} | ${c.transmission} | ${c.mileage}`
    ).join('\n\n');

    if (lang === 'bisaya') {
      return `${randomGreeting('bisaya')} Naa diri ang imong gipangutana sa Capamul Cars! 😊\n\n${list}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawag/Text: 09686995654\n\nGusto ka ba magpa-schedule og test drive o mag-reserve? Pwede ka lang tawag o text!`;
    }
    if (lang === 'tagalog') {
      return `${randomGreeting('tagalog')} Narito ang detalye ng sasakyan na iyong tinanong sa Capamul Cars! 😊\n\n${list}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawagan/Mag-text: 09686995654\n\nGusto mo bang mag-schedule ng test drive o mag-reserve? Makipag-ugnayan lang sa amin!`;
    }
    return `${randomGreeting('english')} Here are the vehicle details from Capamul Cars! 😊\n\n${list}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Call/Text: 09686995654\n\nWould you like to schedule a test drive or make a reservation?`;
  }

  // ── 2. Budget / DP / Price inquiry ──────────────────────────────────────
  const isPriceInquiry = /\b(dp|down|price|how much|magkano|pila|tag pila|tag-pila|presyo|bayad|downpayment)\b/i.test(msg);

  if (isPriceInquiry) {
    const topCars = cars.slice(0, 5).map(c =>
      `🚗 ${c.name} — DP: ${c.downPaymentFormatted} (SRP: ${c.priceFormatted})`
    ).join('\n');

    if (lang === 'bisaya') {
      return `${randomGreeting('bisaya')} Salamat sa pag-message sa *Capamul Cars*! Naa diri ang among mga available na sasakyan ug ang ilang Down Payment (DP):\n\n${topCars}\n\n💡 Ang DP nagsugod sa ₱50,000 pataas depende sa unit.\n\n📍 Barobo, Surigao del Sur\n📞 09686995654\n\nI-reply lang ang car model nga imong ganahan para sa dugang pa nga detalye!`;
    }
    if (lang === 'tagalog') {
      return `${randomGreeting('tagalog')} Salamat sa pagmessage sa *Capamul Cars*! Narito ang aming mga available na sasakyan at ang kanilang Down Payment (DP):\n\n${topCars}\n\n💡 Ang DP ay nagsisimula sa ₱50,000 pataas depende sa unit.\n\n📍 Barobo, Surigao del Sur\n📞 09686995654\n\nI-reply ang car model na gusto mo para sa mas detalyadong impormasyon!`;
    }
    return `${randomGreeting('english')} Thanks for messaging *Capamul Cars*! Here are our available vehicles with their Down Payment (DP):\n\n${topCars}\n\n💡 DP starts at ₱50,000 depending on the unit.\n\n📍 Barobo, Surigao del Sur\n📞 09686995654\n\nReply with a car model for full details!`;
  }

  // ── 3. Location inquiry ──────────────────────────────────────────────────
  const isLocationInquiry = /\b(where|location|address|asa|nasaan|saan|lugar|showroom|dealership|barobo)\b/i.test(msg);

  if (isLocationInquiry) {
    if (lang === 'bisaya') {
      return `${randomGreeting('bisaya')} Ang among showroom naa sa:\n\n📍 *Purok 2, Dapdap, Barobo, Surigao del Sur*\n\n📞 Para sa mas dali nga tabang, tawag o text kami sa: *09686995654*\n🌐 Website: https://capamulcars.com\n\nNaghulat mi sa inyong bisita! 🚗`;
    }
    if (lang === 'tagalog') {
      return `${randomGreeting('tagalog')} Ang aming showroom ay nasa:\n\n📍 *Purok 2, Dapdap, Barobo, Surigao del Sur*\n\n📞 Para sa mabilis na tulong, tumawag o mag-text sa: *09686995654*\n🌐 Website: https://capamulcars.com\n\nNaghihintay kami sa inyong pagbisita! 🚗`;
    }
    return `${randomGreeting('english')} Our showroom is located at:\n\n📍 *Purok 2, Dapdap, Barobo, Surigao del Sur*\n\n📞 For fast assistance, call or text: *09686995654*\n🌐 Website: https://capamulcars.com\n\nWe'd love to have you visit! 🚗`;
  }

  // ── 4. Test drive inquiry ─────────────────────────────────────────────────
  const isTestDrive = /\b(test drive|test|tryout|subayan|tikman|tikman ba|subay|biyahe|vroom|drive)\b/i.test(msg);

  if (isTestDrive) {
    if (lang === 'bisaya') {
      return `${randomGreeting('bisaya')} Gusto ka mag-test drive? 🚗 Dali ra! I-schedule ta.\n\n📞 Tawag o text lang sa *09686995654* para ma-set ang inyong oras.\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n\nHulaton namo ang inyong mensahe! 😊`;
    }
    if (lang === 'tagalog') {
      return `${randomGreeting('tagalog')} Gusto mo bang mag-test drive? 🚗 Madali lang!\n\n📞 Tumawag o mag-text sa *09686995654* para ma-schedule ang iyong oras.\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n\nNaghihintay kami sa iyo! 😊`;
    }
    return `${randomGreeting('english')} Interested in a test drive? 🚗 We'd love to set one up!\n\n📞 Call or text us at *09686995654* to schedule your visit.\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n\nWe look forward to seeing you! 😊`;
  }

  // ── 5. Reservation inquiry ────────────────────────────────────────────────
  const isReservation = /\b(reserve|reservation|book|order|mag-reserve|mag-book|magpa-reserve|pag-reserve)\b/i.test(msg);

  if (isReservation) {
    if (lang === 'bisaya') {
      return `${randomGreeting('bisaya')} Gusto ka mag-reserve og unit? ✅ Mahimo!\n\n🚗 Adto sa among website: https://capamulcars.com\nO tawag/text: 📞 *09686995654*\n\nPara sa online reservation, pindot ang "Reserve" button sa car detail page. Naa puy option sa waitlist kung reserved na ang unit!`;
    }
    if (lang === 'tagalog') {
      return `${randomGreeting('tagalog')} Gusto mong mag-reserve ng unit? ✅ Kaya namin iyan!\n\n🚗 Bisitahin ang aming website: https://capamulcars.com\nO tumawag/mag-text: 📞 *09686995654*\n\nPara sa online reservation, i-click ang "Reserve" button sa car detail page. May waitlist option din kung reserved na ang unit!`;
    }
    return `${randomGreeting('english')} Want to reserve a vehicle? ✅ We've got you covered!\n\n🚗 Visit our website: https://capamulcars.com\nOr call/text: 📞 *09686995654*\n\nClick the "Reserve" button on any car detail page. There's also a waitlist option if the unit is already reserved!`;
  }

  // ── 6. Inventory / "what cars do you have" ────────────────────────────────
  const isInventoryCheck = /\b(what cars|available|what do you have|sasakyan|mga sasakyan|naa ba|naa kay|lista|inventory|units)\b/i.test(msg);

  if (isInventoryCheck || cars.length > 0) {
    const topCars = cars.slice(0, 5).map(c =>
      `🚗 *${c.name}* — DP: ${c.downPaymentFormatted} | ${c.status === 'Reserved' ? '🔒 Reserved' : '✅ Available'}`
    ).join('\n');

    const noInventory = cars.length === 0;

    if (lang === 'bisaya') {
      if (noInventory) return `${randomGreeting('bisaya')} Sa pagkakaron, ang among mga units kay temporarily out of stock. Apil-apil na check ang among Facebook page o website para sa mga bag-ong arrivals!\n\n📞 09686995654 | 🌐 capamulcars.com`;
      return `${randomGreeting('bisaya')} Naa diri ang among mga available nga units sa Capamul Cars:\n\n${topCars}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654\n\nI-reply ang car model nga imong gusto para sa kompleto nga detalye!`;
    }
    if (lang === 'tagalog') {
      if (noInventory) return `${randomGreeting('tagalog')} Sa ngayon, pansamantalang wala kaming available na units. Sundan ang aming Facebook page o website para sa mga bagong arrivals!\n\n📞 09686995654 | 🌐 capamulcars.com`;
      return `${randomGreeting('tagalog')} Narito ang aming mga available na units sa Capamul Cars:\n\n${topCars}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654\n\nI-reply ang car model na gusto mo para sa kumpletong detalye!`;
    }
    if (noInventory) return `${randomGreeting('english')} We're temporarily out of stock. Follow our Facebook page or website for new arrivals!\n\n📞 09686995654 | 🌐 capamulcars.com`;
    return `${randomGreeting('english')} Here are our available units at Capamul Cars:\n\n${topCars}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654\n\nReply with a car model for full details!`;
  }

  // ── 7. Default greeting / general message ─────────────────────────────────
  if (lang === 'bisaya') {
    return `${randomGreeting('bisaya')} Salamat sa pag-message sa *Capamul Cars 2.0* — "All in BEST Condition!" 🚗\n\nNaa mi ${cars.length} ka available nga sasakyan nga adunay flexible down payment options.\n\nPwede ko tabulangang pangutana:\n• Unsay available nga units?\n• Tag pila ang DP?\n• Asa ang showroom?\n• Gusto mag-test drive o mag-reserve?\n\n📞 09686995654 | 🌐 capamulcars.com`;
  }
  if (lang === 'tagalog') {
    return `${randomGreeting('tagalog')} Salamat sa pagmessage sa *Capamul Cars 2.0* — "All in BEST Condition!" 🚗\n\nMayroon kaming ${cars.length} na available na sasakyan na may flexible down payment options.\n\nMaaari akong sumagot tungkol sa:\n• Anong units ang available?\n• Magkano ang DP?\n• Nasaan ang showroom?\n• Gusto mag-test drive o mag-reserve?\n\n📞 09686995654 | 🌐 capamulcars.com`;
  }
  return `${randomGreeting('english')} Thank you for messaging *Capamul Cars 2.0* — "All in BEST Condition!" 🚗\n\nWe have ${cars.length} available vehicles with flexible down payment options.\n\nI can help you with:\n• What units are available?\n• How much is the DP?\n• Where is the showroom?\n• Test drive or reservation?\n\n📞 09686995654 | 🌐 capamulcars.com`;
}
