import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0/me/messages';

function getToken() {
  return process.env.FB_PAGE_ACCESS_TOKEN;
}

/**
 * Send text message back to customer on Facebook Messenger
 */
export async function sendTextMessage(recipientPsid, text) {
  const token = getToken();

  if (!token) {
    console.log(`[Messenger Mock Send to ${recipientPsid}]:\n${text}`);
    return;
  }

  try {
    const payload = {
      recipient: { id: recipientPsid },
      message: { text: text }
    };

    const response = await axios.post(
      `${GRAPH_API_URL}?access_token=${token}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    console.log(`[Messenger API Success] Replied to PSID ${recipientPsid}: ${response.data?.message_id}`);
    return response.data;
  } catch (err) {
    console.error('[Messenger API Error]:', err.response?.data || err.message);
  }
}

/**
 * Send Quick Reply buttons (e.g. Call Us, Browse Web)
 */
export async function sendQuickReplies(recipientPsid, text, quickReplies) {
  const token = getToken();

  if (!token) {
    console.log(`[Messenger Quick Replies to ${recipientPsid}]: ${text}`);
    return;
  }

  try {
    const payload = {
      recipient: { id: recipientPsid },
      message: {
        text: text,
        quick_replies: quickReplies.map(qr => ({
          content_type: 'text',
          title: qr.title,
          payload: qr.payload
        }))
      }
    };

    await axios.post(
      `${GRAPH_API_URL}?access_token=${token}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Messenger Quick Reply Error]:', err.response?.data || err.message);
  }
}
