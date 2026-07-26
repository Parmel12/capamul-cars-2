import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uwwgrhjpcfmdnhcbampu.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3d2dyaGpwY2ZtZG5oY2JhbXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4MDQ3ODQsImV4cCI6MjA5OTM4MDc4NH0.kFQqZ-06V9T6UijLwNviyjF2m19mV8evqUT9humN074';
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'capamul_cars_messenger_verify_token_123';
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
      mileage: c.mileage ? `${Number(c.mileage).toLocaleString()} km` : 'N/A'
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

async function generateAutoReply(userMessage) {
  const settings = await getAISettings();
  if (settings && settings.enabled === false) {
    console.log('AI Agent is OFF in Admin settings.');
    return null;
  }

  const cars = await getAvailableCars();
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const inventorySummary = cars.map(c => 
        `- ${c.name} (${c.year}): SRP ${c.priceFormatted} | Down Payment (DP): ${c.downPaymentFormatted} | Status: ${c.status} | Transmission: ${c.transmission} | Mileage: ${c.mileage}`
      ).join('\n');

      const systemPrompt = `You are "Capamul AI", official friendly auto-reply sales assistant for Capamul Cars 2.0 dealership in Barobo, Surigao del Sur.
Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur | Contact: 09686995654 | Website: https://capamulcars.com

LIVE CAR INVENTORY:
${inventorySummary.length > 0 ? inventorySummary : "Currently all vehicles pending restock."}

INSTRUCTIONS:
1. Always state Total Price (SRP) and Down Payment (DP).
2. Use exact values in Philippine Pesos (₱).
3. Use emojis (🚗, 💰, 📍, 📞) appropriately.
4. MULTILINGUAL ADAPTATION: Respond fluently in the SAME language used by the customer (Bisaya / Cebuano, Tagalog / Taglish, or English)!`;

      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`${systemPrompt}\n\nCustomer Message: "${userMessage}"`);
      const text = result.response.text()?.trim();
      if (text) return text;
    } catch (err) {
      console.error('Gemini API Error:', err.message);
    }
  }

  // Fallback engine (Bisaya & Tagalog & English)
  const msg = userMessage.toLowerCase();
  const isBisaya = msg.includes('pila') || msg.includes('tag') || msg.includes('naa') || msg.includes('asa') || msg.includes('inyong') || msg.includes('dapit');

  const matchedCars = cars.filter(c => 
    msg.includes(c.name.toLowerCase()) || 
    (c.make && msg.includes(c.make.toLowerCase())) || 
    (c.model && msg.includes(c.model.toLowerCase()))
  );

  if (matchedCars.length > 0) {
    const list = matchedCars.map(c => 
      `🚗 *${c.name}*\n• Total Price (SRP): ${c.priceFormatted}\n• Down Payment (DP): ${c.downPaymentFormatted}\n• Status: ${c.status}\n• Transmission: ${c.transmission} | Mileage: ${c.mileage}`
    ).join('\n\n');

    if (isBisaya) {
      return `Maayong adlaw! 👋 Naa diri ang mga detalye sa unit nga imong gipangutana sa Capamul Cars:\n\n${list}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Tawag o Text: 09686995654\nGusto ba ka mag-schedule og test drive o magpa-reserve?`;
    }
    return `Hello! 👋 Here are the vehicle details you inquired about from Capamul Cars:\n\n${list}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\nWould you like to schedule a test drive or make a reservation?`;
  }

  if (msg.includes('dp') || msg.includes('down') || msg.includes('price') || msg.includes('how much') || msg.includes('pila') || msg.includes('tag')) {
    const topCars = cars.slice(0, 4).map(c => `• *${c.name}*: DP ${c.downPaymentFormatted} (SRP ${c.priceFormatted})`).join('\n');
    if (isBisaya) {
      return `Maayong adlaw! 👋 Welcome sa Capamul Cars. Naa diri ang uban namong available units ug ang ilang Down Payment (DP):\n\n${topCars}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Tawag o Text: 09686995654\ni-reply lang ang car model para sa kompletong detalye!`;
    }
    return `Hello! 👋 Welcome to Capamul Cars. Here are some of our top available cars with their Down Payment (DP) options:\n\n${topCars}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Contact Us: 09686995654\nReply with the specific car model to get complete details!`;
  }

  if (isBisaya) {
    return `Maayong adlaw! 👋 Salamat sa pag-message sa Capamul Cars. Naa kay ${cars.length} ka available nga sasakyan sa among inventory nga adunay flexible down payment options!\n\ni-message lang kung unsa nga car model o budget imong gipangita, o tawag sa 📞 09686995654 para matabangan tika dayon.`;
  }

  return `Hello! 👋 Thank you for messaging Capamul Cars. We have ${cars.length} available vehicles in our inventory with flexible down payment options!\n\nTell us which car model or budget you're looking for, or call us at 📞 09686995654 for fast assistance.`;
}

async function sendTextMessage(recipientPsid, text) {
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageToken) {
    console.log('[FB Messenger Token Missing]');
    return;
  }
  try {
    await axios.post(`${GRAPH_API_URL}?access_token=${pageToken}`, {
      recipient: { id: recipientPsid },
      message: { text: text }
    });
  } catch (err) {
    console.error('FB Send Message Error:', err.response?.data || err.message);
  }
}

export const handler = async (event, context) => {
  const httpMethod = event.httpMethod;

  // 1. Meta Webhook Verification GET Request
  if (httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const token = params['hub.verify_token'];
    const challenge = params['hub.challenge'];

    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
      return {
        statusCode: 200,
        body: challenge
      };
    }
    return { statusCode: 403, body: 'Verification failed' };
  }

  // 2. Incoming Facebook Messenger Event POST Request
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
