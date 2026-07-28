import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'capamul_cars_messenger_verify_token_123';
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN || '';
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
    const res = await axios.get(`${SUPABASE_URL}/rest/v1/cars?select=*&order=created_at.desc`, { headers: sbHeaders });
    const data = res.data || [];
    const activeCars = data.filter(c => ['available', 'reserved'].includes((c.status || '').toLowerCase()));
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
    const res = await axios.get(`${SUPABASE_URL}/rest/v1/settings?select=value&key=eq.ai_settings&limit=1`, { headers: sbHeaders });
    if (res.data && res.data.length > 0 && res.data[0].value) {
      return res.data[0].value;
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
  if (/\b(pila|naa ba|asa man|tag pila|unsa|ganahan|maayong)\b/i.test(lower)) return 'bisaya';
  if (/\b(magkano|nasaan|ito ba|po ba|opo|pwede po|mayroon)\b/i.test(lower)) return 'tagalog';

  return 'english';
}

async function generateAutoReply(userMessage) {
  const settings = await getAISettings();
  if (settings && settings.enabled === false) {
    console.log('AI Agent is OFF in Admin settings.');
    return null;
  }

  const cars = await getAvailableCars();
  const apiKey = process.env.GEMINI_API_KEY;
  const lang = detectLanguage(userMessage);

  if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.length > 10) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const inventorySummary = cars.length > 0
        ? cars.map(c => `• ${c.name} (${c.year}) | SRP: ${c.priceFormatted} | DP: ${c.downPaymentFormatted} | Status: ${c.status} | ${c.transmission} | ${c.mileage}`).join('\n')
        : 'Currently no vehicles available.';

      const langInstruction = {
        bisaya: `Customer is speaking BISAYA / CEBUANO. You MUST reply entirely in natural Bisaya/Cebuano (e.g. "Maayong adlaw", "naa", "pila", "salamat", "tawag").`,
        tagalog: `Customer is speaking TAGALOG / FILIPINO. You MUST reply entirely in natural Tagalog (e.g. "Magandang araw", "po", "opo", "magkano", "salamat").`,
        english: `Customer is speaking ENGLISH. Reply in clear, friendly English.`
      }[lang];

      const systemPrompt = `You are "Capamul AI", official friendly Facebook Messenger sales assistant for Capamul Cars 2.0 dealership in Barobo, Surigao del Sur.
Location: Purok 2, Dapdap, Barobo, Surigao del Sur | Phone: 09686995654 | Web: https://capamulcars.com

LIVE CAR INVENTORY:
${inventorySummary}

RULES:
1. Always state SRP (Total Price) and Down Payment (DP) in ₱.
2. Use emojis (🚗, 💰, 📍, 📞) appropriately.
3. ${langInstruction}
4. Keep response concise for Facebook Messenger chat.`;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\nCustomer Message: "${userMessage}"\n\nYour reply:`);
      const text = result.response.text()?.trim();
      if (text) return text;
    } catch (err) {
      console.error('Gemini API Error:', err.message);
    }
  }

  // Fallback Engine
  const msg = userMessage.toLowerCase();
  const matchedCars = cars.filter(c => 
    msg.includes(c.name.toLowerCase()) || 
    (c.make && msg.includes(c.make.toLowerCase())) || 
    (c.model && msg.includes(c.model.toLowerCase()))
  );

  if (matchedCars.length > 0) {
    const list = matchedCars.slice(0, 3).map(c => 
      `🚗 *${c.name}*\n• Total Price (SRP): ${c.priceFormatted}\n• Down Payment (DP): ${c.downPaymentFormatted}\n• Status: ${c.status}\n• ${c.transmission} | ${c.mileage}`
    ).join('\n\n');

    if (lang === 'bisaya') return `Maayong adlaw! 👋 Naa diri ang mga detalye sa unit nga imong gipangutana sa Capamul Cars:\n\n${list}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Tawag o Text: 09686995654\nGusto ba ka mag-schedule og test drive o magpa-reserve?`;
    if (lang === 'tagalog') return `Magandang araw! 👋 Narito ang detalye ng sasakyan na iyong tinanong sa Capamul Cars:\n\n${list}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Tumawag o mag-text: 09686995654\nGusto mo bang mag-schedule ng test drive o mag-reserve?`;
    return `Hello! 👋 Here are the vehicle details you inquired about from Capamul Cars:\n\n${list}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\nWould you like to schedule a test drive or make a reservation?`;
  }

  if (/\b(dp|down|price|how much|magkano|pila|tag pila)\b/i.test(msg)) {
    const topCars = cars.slice(0, 4).map(c => `• *${c.name}*: DP ${c.downPaymentFormatted} (SRP ${c.priceFormatted})`).join('\n');
    if (lang === 'bisaya') return `Maayong adlaw! 👋 Naa diri ang uban namong available units ug ang ilang Down Payment (DP):\n\n${topCars}\n\n📍 Barobo, Surigao del Sur\n📞 09686995654\ni-reply lang ang car model para sa kompletong detalye!`;
    if (lang === 'tagalog') return `Magandang araw! 👋 Narito ang aming mga available na units at ang kanilang Down Payment (DP):\n\n${topCars}\n\n📍 Barobo, Surigao del Sur\n📞 09686995654\ni-reply ang car model para sa kumpletong detalye!`;
    return `Hello! 👋 Here are some of our top available cars with their Down Payment (DP) options:\n\n${topCars}\n\n📍 Barobo, Surigao del Sur\n📞 09686995654\nReply with the car model for complete details!`;
  }

  if (lang === 'bisaya') return `Maayong adlaw! 👋 Salamat sa pag-message sa Capamul Cars. Naa kay ${cars.length} ka available nga sasakyan sa among inventory nga adunay flexible down payment options!\n\ni-message lang kung unsa nga car model o budget imong gipangita, o tawag sa 📞 09686995654.`;
  if (lang === 'tagalog') return `Magandang araw! 👋 Salamat sa pagmessage sa Capamul Cars. Mayroon kaming ${cars.length} na available na sasakyan na may flexible down payment options!\n\nI-message lang kung anong car model o budget ang gusto mo, o tumawag sa 📞 09686995654.`;
  return `Hello! 👋 Thank you for messaging Capamul Cars. We have ${cars.length} available vehicles in our inventory with flexible down payment options!\n\nTell us which car model or budget you're looking for, or call us at 📞 09686995654 for fast assistance.`;
}

async function sendTextMessage(recipientPsid, text) {
  const token = process.env.FB_PAGE_ACCESS_TOKEN || FB_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.log('[FB Messenger Token Missing]');
    return;
  }
  try {
    await axios.post(`${GRAPH_API_URL}?access_token=${token}`, {
      recipient: { id: recipientPsid },
      message: { text: text }
    });
    console.log('FB Message sent to PSID:', recipientPsid);
  } catch (err) {
    console.error('FB Send Message Error:', err.response?.data || err.message);
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
          const webhookEvent = entry.messaging?.[0];
          if (!webhookEvent) continue;

          const senderPsid = webhookEvent.sender?.id;
          const userQuery = webhookEvent.message?.text || webhookEvent.postback?.payload;

          if (senderPsid && userQuery) {
            const reply = await generateAutoReply(userQuery);
            if (reply) {
              await sendTextMessage(senderPsid, reply);
            }
          }
        }
        return { statusCode: 200, body: 'EVENT_RECEIVED' };
      }
    } catch (err) {
      console.error('Netlify Webhook Error:', err.message);
    }
    return { statusCode: 200, body: 'OK' };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
