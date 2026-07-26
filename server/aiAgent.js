import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAvailableCars, getAISettingsFromDb } from './supabaseClient.js';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Google Generative AI client if API key is provided
let genAI = null;
if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

/**
 * Generate AI Response grounded in real-time Supabase car inventory
 */
export async function generateAutoReply(userMessage) {
  // Check if AI Agent is enabled by Admin
  const aiSettings = await getAISettingsFromDb();
  if (aiSettings && aiSettings.enabled === false) {
    console.log('[AI Agent] Auto-reply is currently PAUSED / OFF in Admin Settings.');
    return null; // Return null so server skips sending auto-reply
  }

  const availableCars = await getAvailableCars();

  // If no Gemini API Key is configured, fallback to smart rule-based response
  if (!GEMINI_API_KEY || !genAI) {
    console.log('[AI Agent] GEMINI_API_KEY not configured in .env. Using smart rule-based inventory matcher.');
    return generateFallbackReply(userMessage, availableCars);
  }

  try {
    const inventorySummary = availableCars.map(c => 
      `- ${c.name} (${c.year}): SRP ${c.priceFormatted} | Down Payment (DP): ${c.downPaymentFormatted} | Status: ${c.status} | Transmission: ${c.transmission} | Mileage: ${c.mileage}`
    ).join('\n');

    const systemPrompt = `You are "Capamul AI", the official friendly auto-reply sales assistant for Capamul Cars 2.0 dealership.

DEALERSHIP INFO:
- Location: Purok 2, Dapdap, Barobo, Surigao del Sur
- Contact Phone: 09686995654
- Website: https://capamulcars.com

LIVE CAR INVENTORY (Direct from Database):
${inventorySummary.length > 0 ? inventorySummary : "Currently all vehicles are pending restock."}

STRICT INSTRUCTIONS:
1. ALWAYS present exact prices in Philippine Pesos (₱).
2. For any car mentioned, highlight BOTH the Total Price (SRP) and the Down Payment (DP).
3. Only state information about cars listed in the inventory above. Do not fabricate inventory.
4. Keep replies friendly, clean, and concise for mobile Messenger reading.
5. Use emojis (🚗, 💰, 📍, 📞) appropriately.
6. Invite the customer to visit the showroom or call 09686995654 to book a test drive or reserve.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(`${systemPrompt}\n\nCustomer Message: "${userMessage}"`);

    const replyText = result.response.text()?.trim();
    if (replyText) return replyText;

    return generateFallbackReply(userMessage, availableCars);
  } catch (err) {
    console.error('[AI Agent Error]:', err.message);
    return generateFallbackReply(userMessage, availableCars);
  }
}

/**
 * Smart Fallback Reply Engine when AI API key is not yet set
 */
function generateFallbackReply(userMessage, cars) {
  const msg = userMessage.toLowerCase();

  // 1. Search by car model/name match
  const matchedCars = cars.filter(c => 
    msg.includes(c.name.toLowerCase()) || 
    (c.make && msg.includes(c.make.toLowerCase())) || 
    (c.model && msg.includes(c.model.toLowerCase()))
  );

  if (matchedCars.length > 0) {
    const list = matchedCars.map(c => 
      `🚗 *${c.name}*\n` +
      `• Total Price (SRP): ${c.priceFormatted}\n` +
      `• Down Payment (DP): ${c.downPaymentFormatted}\n` +
      `• Status: ${c.status}\n` +
      `• Transmission: ${c.transmission} | Mileage: ${c.mileage}`
    ).join('\n\n');

    return `Hello! 👋 Here are the vehicle details you inquired about from Capamul Cars:\n\n${list}\n\n📍 Showroom: Purok 2, Dapdap, Barobo, Surigao del Sur\n📞 Call/SMS: 09686995654\nWould you like to schedule a test drive or make a reservation?`;
  }

  // 2. Budget/DP inquiry
  if (msg.includes('dp') || msg.includes('down') || msg.includes('downpayment') || msg.includes('price') || msg.includes('how much')) {
    const topCars = cars.slice(0, 4).map(c => 
      `• *${c.name}*: DP ${c.downPaymentFormatted} (SRP ${c.priceFormatted})`
    ).join('\n');

    return `Hello! 👋 Welcome to Capamul Cars. Here are some of our top available cars with their Down Payment (DP) options:\n\n${topCars}\n\n📍 Showroom: Barobo, Surigao del Sur\n📞 Contact Us: 09686995654\nReply with the specific car model to get complete details!`;
  }

  // 3. General Greeting
  return `Hello! 👋 Thank you for messaging Capamul Cars. We have ${cars.length} available vehicles in our inventory with flexible down payment options!\n\nTell us which car model or budget you're looking for, or call us at 📞 09686995654 for fast assistance.`;
}
