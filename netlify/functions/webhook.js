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

function detectLanguage(msg) {
  const lower = msg.toLowerCase();
  const bisayaWords = ['pila', 'tag pila', 'tag-pila', 'naa', 'naa pa', 'naa bay', 'wala na', 'asa', 'dapit', 'inyong', 'inyo', 'ninyo', 'ako', 'akong', 'ikaw', 'unsa', 'unsay', 'ganahan', 'gusto', 'showroom', 'tawag', 'salamat', 'maayong', 'adlaw', 'buntag', 'hapon', 'gabii'];
  const tagalogWords = ['magkano', 'ano', 'paano', 'saan', 'nasaan', 'kailan', 'yung', 'ito', 'doon', 'kami', 'tayo', 'namin', 'ko', 'ka', 'po', 'opo', 'hindi', 'wala', 'meron', 'pwede', 'gusto', 'maganda', 'mura', 'salamat', 'sige'];

  let bScore = 0, tScore = 0;
  for (const w of bisayaWords) { if (lower.includes(w)) bScore++; }
  for (const w of tagalogWords) { if (lower.includes(w)) tScore++; }

  if (bScore > tScore && bScore > 0) return 'bisaya';
  if (tScore > bScore && tScore > 0) return 'tagalog';
  if (/\b(pila|naa ba|asa man|tag pila|unsa|ganahan|maayong|ika recommend|ika-recommend|sakyanan)\b/i.test(lower)) return 'bisaya';
  if (/\b(magkano|nasaan|ito ba|po ba|opo|pwede po|mayroon)\b/i.test(lower)) return 'tagalog';

  return 'english';
}

async function callGeminiRestApi(apiKey, userMessage, cars, lang) {
  try {
    const inventorySummary = cars.length > 0
      ? cars.map(c => `• ${c.name} (${c.year}) | SRP: ${c.priceFormatted} | DP: ${c.downPaymentFormatted} | Status: ${c.status} | ${c.transmission} | ${c.mileage}`).join('\n')
      : 'Currently no vehicles available.';

    const langInstruction = {
      bisaya: `Customer is speaking BISAYA / CEBUANO. Reply fluently in natural Bisaya/Cebuano (e.g. "Maayong adlaw", "naa", "pila", "salamat").`,
      tagalog: `Customer is speaking TAGALOG / FILIPINO. Reply fluently in natural Tagalog (e.g. "Magandang araw", "po", "opo", "magkano").`,
      english: `Customer is speaking ENGLISH. Reply in clear, friendly English.`
    }[lang];

    const systemPrompt = `You are "Capamul AI", official sales assistant for Capamul Cars 2.0 dealership in Barobo, Surigao del Sur.
Location: Purok 2, Dapdap, Barobo, Surigao del Sur | Phone: 09686995654 | Web: https://capamulcars.com

LIVE CAR INVENTORY:
${inventorySummary}

RULES:
1. State exact SRP (Total Price) and Down Payment (DP) in ₱ for any car mentioned.
2. Use emojis (🚗, 💰, 📍, 📞) appropriately.
3. ${langInstruction}
4. Directly answer the user's specific request.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\nCustomer Message: "${userMessage}"\n\nYour reply:` }] }]
      })
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch (err) {
    console.error('[Gemini REST Error]:', err.message);
    return null;
  }
}

async function generateAutoReply(userMessage) {
  const settings = await getAISettings();
  if (settings && settings.enabled === false) {
    console.log('[AI Agent] Auto-reply is OFF in Admin settings.');
    return null;
  }

  const cars = await getAvailableCars();
  const apiKey = process.env.GEMINI_API_KEY;
  const lang = detectLanguage(userMessage);
  console.log(`[AI Agent] Query: "${userMessage}" | Language: ${lang} | Cars: ${cars.length}`);

  // 1. Try Gemini API via REST if API key exists
  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.length > 10) {
    const aiText = await callGeminiRestApi(apiKey, userMessage, cars, lang);
    if (aiText) {
      console.log('[AI Agent] Gemini REST response generated successfully.');
      return aiText;
    }
  }

  // 2. Enhanced Fallback Engine (No third-party dependencies required!)
  console.log('[AI Agent] Using enhanced rule-based response engine.');
  const msg = userMessage.toLowerCase();

  // A. CHEAPEST CAR / LOWEST PRICE INQUIRY
  const isCheapestInquiry = /\b(cheap|cheapest|lowest|barato|pinaka barato|pinakamura|mura|lowest price|pinaka mura)\b/i.test(msg);
  if (isCheapestInquiry && cars.length > 0) {
    const availableOnly = cars.filter(c => (c.status || '').toLowerCase() === 'available');
    const sorted = [...(availableOnly.length > 0 ? availableOnly : cars)].sort((a, b) => a.price - b.price);
    const cheapestList = sorted.slice(0, 3).map(c => 
      `🚗 *${c.name}* (${c.year})\n` +
      `• Total Price (SRP): ${c.priceFormatted}\n` +
      `• Down Payment (DP): ${c.downPaymentFormatted}\n` +
      `• Status: ${c.status === 'Reserved' ? '🔒 Reserved (Waitlist available)' : '✅ Available'}\n` +
      `• ${c.transmission} | ${c.mileage}`
    ).join('\n\n');

    if (lang === 'bisaya') {
      return `Maayong adlaw! 👋 Naa diri ang pinaka-barato namong available units sa Capamul Cars:\n\n${cheapestList}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawag/Text: 09686995654\n\nGusto ka mag-test drive o magpa-reserve sa bisan unsa nga unit?`;
    }
    if (lang === 'tagalog') {
      return `Magandang araw! 👋 Narito ang aming pinakamura at pinakasulit na available units sa Capamul Cars:\n\n${cheapestList}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawagan/Mag-text: 09686995654\n\nGusto mo bang mag-test drive o magpa-reserve ng alinman sa mga ito?`;
    }
    return `Hello! 👋 Here are our most affordable vehicle options currently available at Capamul Cars:\n\n${cheapestList}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\n\nWould you like to schedule a test drive or make a reservation?`;
  }

  // B. RECOMMENDATION / "GOOD AS NEW" / BEST CONDITION INQUIRY
  const isRecommendInquiry = /\b(recommend|rekomenda|ika recommend|ika-recommend|good as new|best|nindot|maganda|suggest)\b/i.test(msg);
  if (isRecommendInquiry && cars.length > 0) {
    const availableOnly = cars.filter(c => (c.status || '').toLowerCase() === 'available');
    const pool = availableOnly.length > 0 ? availableOnly : cars;
    const topRecs = pool.slice(0, 3).map(c => 
      `🚗 *${c.name}* (${c.year})\n` +
      `• Total Price (SRP): ${c.priceFormatted}\n` +
      `• Down Payment (DP): ${c.downPaymentFormatted}\n` +
      `• Status: ${c.status === 'Reserved' ? '🔒 Reserved' : '✅ Available'}\n` +
      `• ${c.transmission} | ${c.mileage}`
    ).join('\n\n');

    if (lang === 'bisaya') {
      return `Maayong adlaw! 👋 Mao kini ang among gina-recommend nga mga units nga top condition ug "good as new" pa kaayo:\n\n${topRecs}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawag/Text: 09686995654\n\nAsa man niani ang imong pinaka-ganahan?`;
    }
    if (lang === 'tagalog') {
      return `Magandang araw! 👋 Ito ang aming inirerekomendang mga units na nasa top condition at "good as new" pa:\n\n${topRecs}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tumawag o mag-text: 09686995654\n\nAlin sa mga ito ang pinakagusto mo?`;
    }
    return `Hello! 👋 Here are our recommended top-condition, "good as new" vehicles available at Capamul Cars:\n\n${topRecs}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\n\nWhich of these would you like to check out?`;
  }

  // C. TRANSMISSION INQUIRY (AUTOMATIC / MANUAL)
  const isTransmissionInquiry = /\b(automatic|manual|matic|a\/t|m\/t|at|mt)\b/i.test(msg);
  if (isTransmissionInquiry && cars.length > 0) {
    const isAuto = /\b(automatic|matic|a\/t|at)\b/i.test(msg);
    const transFiltered = cars.filter(c => 
      isAuto ? (c.transmission || '').toLowerCase().includes('auto') : (c.transmission || '').toLowerCase().includes('manual')
    );
    const pool = transFiltered.length > 0 ? transFiltered : cars;
    const transList = pool.slice(0, 3).map(c =>
      `🚗 *${c.name}* (${c.year})\n` +
      `• Total Price (SRP): ${c.priceFormatted}\n` +
      `• Down Payment (DP): ${c.downPaymentFormatted}\n` +
      `• Transmission: ${c.transmission}\n` +
      `• Status: ${c.status === 'Reserved' ? '🔒 Reserved' : '✅ Available'}`
    ).join('\n\n');

    if (lang === 'bisaya') return `Maayong adlaw! 👋 Naa diri ang among mga ${isAuto ? 'Automatic' : 'Manual'} units:\n\n${transList}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654`;
    if (lang === 'tagalog') return `Magandang araw! 👋 Narito ang aming mga ${isAuto ? 'Automatic' : 'Manual'} units:\n\n${transList}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654`;
    return `Hello! 👋 Here are our ${isAuto ? 'Automatic' : 'Manual'} transmission vehicles:\n\n${transList}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654`;
  }

  // D. SPECIFIC CAR MODEL/MAKE INQUIRY
  const matchedCars = cars.filter(c => 
    msg.includes(c.name.toLowerCase()) || 
    (c.make && msg.includes(c.make.toLowerCase())) || 
    (c.model && msg.includes(c.model.toLowerCase()))
  );

  if (matchedCars.length > 0) {
    const list = matchedCars.slice(0, 3).map(c => 
      `🚗 *${c.name}* (${c.year})\n` +
      `• Total Price (SRP): ${c.priceFormatted}\n` +
      `• Down Payment (DP): ${c.downPaymentFormatted}\n` +
      `• Status: ${c.status === 'Reserved' ? '🔒 Reserved (Waitlist open)' : '✅ Available'}\n` +
      `• ${c.transmission} | ${c.mileage}`
    ).join('\n\n');

    if (lang === 'bisaya') return `Maayong adlaw! 👋 Naa diri ang mga detalye sa unit nga imong gipangutana:\n\n${list}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Tawag o Text: 09686995654\n\nGusto ba ka mag-schedule og test drive o magpa-reserve?`;
    if (lang === 'tagalog') return `Magandang araw! 👋 Narito ang detalye ng sasakyan na iyong tinanong:\n\n${list}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Tumawag o mag-text: 09686995654\n\nGusto mo bang mag-schedule ng test drive o magpa-reserve?`;
    return `Hello! 👋 Here are the vehicle details you inquired about:\n\n${list}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\n\nWould you like to schedule a test drive or make a reservation?`;
  }

  // E. DOWN PAYMENT / PRICE INQUIRY
  if (/\b(dp|down|price|how much|magkano|pila|tag pila|presyo)\b/i.test(msg)) {
    const topCars = cars.slice(0, 4).map(c => `• *${c.name}*: DP ${c.downPaymentFormatted} (SRP ${c.priceFormatted})`).join('\n');
    if (lang === 'bisaya') return `Maayong adlaw! 👋 Naa diri ang uban namong available units ug ang ilang Down Payment (DP):\n\n${topCars}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654\ni-reply lang ang car model para sa kompletong detalye!`;
    if (lang === 'tagalog') return `Magandang araw! 👋 Narito ang aming mga available na units at ang kanilang Down Payment (DP):\n\n${topCars}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654\ni-reply ang car model para sa kumpletong detalye!`;
    return `Hello! 👋 Here are some of our top available cars with their Down Payment (DP) options:\n\n${topCars}\n\n📍 Barobo, Surigao del Sur | 📞 09686995654\nReply with the car model for complete details!`;
  }

  // F. DEFAULT HELPFUL INVENTORY SUMMARY
  const topAvailable = cars.slice(0, 4).map(c => `• *${c.name}*: DP ${c.downPaymentFormatted}`).join('\n');

  if (lang === 'bisaya') return `Maayong adlaw! 👋 Salamat sa pag-message sa *Capamul Cars 2.0*!\n\nNaa mi ${cars.length} ka available nga units! Pila sa among popular models:\n${topAvailable}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawag/Text: 09686995654\n\ni-message lang kung unsa nga car model o budget imong gipangita!`;
  if (lang === 'tagalog') return `Magandang araw! 👋 Salamat sa pagmessage sa *Capamul Cars 2.0*!\n\nMayroon kaming ${cars.length} na available na units! Ilan sa aming popular models:\n${topAvailable}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tumawag/Mag-text: 09686995654\n\nI-message lang kung anong car model o budget ang gusto mo!`;
  return `Hello! 👋 Thank you for messaging *Capamul Cars 2.0*!\n\nWe have ${cars.length} available vehicles! Here are some popular options:\n${topAvailable}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\n\nTell us what car model or budget you're looking for!`;
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
