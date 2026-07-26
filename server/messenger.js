import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
const GRAPH_API_URL = 'https://graph.facebook.com/v19.0/me/messages';

/**
 * Send text message back to customer on Facebook Messenger
 */
export async function sendTextMessage(recipientPsid, text) {
  if (!FB_PAGE_ACCESS_TOKEN) {
    console.log(`[Messenger Mock Send to ${recipientPsid}]:\n${text}`);
    return;
  }

  try {
    const payload = {
      recipient: { id: recipientPsid },
      message: { text: text }
    };

    const response = await axios.post(
      `${GRAPH_API_URL}?access_token=${FB_PAGE_ACCESS_TOKEN}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );

    return response.data;
  } catch (err) {
    console.error('[Messenger API Error]:', err.response?.data || err.message);
  }
}

/**
 * Send Quick Reply buttons (e.g. Call Us, Browse Web)
 */
export async function sendQuickReplies(recipientPsid, text, quickReplies) {
  if (!FB_PAGE_ACCESS_TOKEN) {
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
      `${GRAPH_API_URL}?access_token=${FB_PAGE_ACCESS_TOKEN}`,
      payload,
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Messenger Quick Reply Error]:', err.response?.data || err.message);
  }
}
