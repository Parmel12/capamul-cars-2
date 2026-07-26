import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateAutoReply } from './aiAgent.js';
import { sendTextMessage } from './messenger.js';
import { getAvailableCars, searchInventory } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;
const FB_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'capamul_cars_messenger_verify_token_123';

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Capamul Cars Facebook Messenger AI Auto-Reply Agent',
    timestamp: new Date().toISOString()
  });
});

// Direct Web API Endpoint (For testing from website/browser)
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message field is required.' });
    }
    const reply = await generateAutoReply(message);
    res.json({ reply });
  } catch (err) {
    console.error('API Chat Error:', err);
    res.status(500).json({ error: 'Failed to process AI chat message.' });
  }
});

// API Endpoint to fetch live cars data for Messenger or Web
app.get('/api/cars', async (req, res) => {
  try {
    const cars = await getAvailableCars();
    res.json({ count: cars.length, cars });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API Endpoint to get or set AI status
app.get('/api/ai-status', async (req, res) => {
  try {
    const { getAISettingsFromDb } = await import('./supabaseClient.js');
    const settings = await getAISettingsFromDb();
    res.json({ enabled: settings.enabled !== false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai-status', async (req, res) => {
  try {
    const { enabled } = req.body;
    const { updateAISettingsInDb } = await import('./supabaseClient.js');
    const result = await updateAISettingsInDb({ enabled: !!enabled, mode: 'ai' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * 1. Meta Facebook Messenger Webhook Verification (GET)
 * Meta calls this when you configure your Webhook URL in Facebook Developer Console.
 */
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === FB_VERIFY_TOKEN) {
      console.log('✅ Facebook Messenger Webhook Verified Successfully!');
      return res.status(200).send(challenge);
    } else {
      console.error('❌ Webhook Verification Failed: Invalid Token');
      return res.sendStatus(403);
    }
  }
  res.sendStatus(400);
});

/**
 * 2. Meta Facebook Messenger Message Receiver (POST)
 * Triggered whenever a customer sends a message to your Facebook Page.
 */
app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'page') {
    // Return 200 OK immediately to Meta so it doesn't retry
    res.status(200).send('EVENT_RECEIVED');

    for (const entry of body.entry) {
      const webhookEvent = entry.messaging?.[0];
      if (!webhookEvent) continue;

      const senderPsid = webhookEvent.sender?.id;
      const messageText = webhookEvent.message?.text;
      const postbackPayload = webhookEvent.postback?.payload;

      const userQuery = messageText || postbackPayload;

      if (senderPsid && userQuery) {
        console.log(`📩 Incoming Messenger message from PSID (${senderPsid}): "${userQuery}"`);

        // Generate AI grounded response with Supabase data
        const aiResponse = await generateAutoReply(userQuery);

        // Auto-reply back to Facebook Messenger if AI is enabled
        if (aiResponse) {
          await sendTextMessage(senderPsid, aiResponse);
        } else {
          console.log(`⏸️ Skipping Messenger auto-reply (AI Assistant is turned OFF by Admin).`);
        }
      }
    }
  } else {
    res.sendStatus(404);
  }
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Capamul Cars AI Webhook Server running on port ${PORT}`);
  console.log(`📍 Webhook Verification URL: http://localhost:${PORT}/webhook`);
  console.log(`🔑 Verify Token: ${FB_VERIFY_TOKEN}`);
  console.log(`====================================================`);
});
