# 🚗 Capamul Cars - Facebook Messenger AI Auto-Reply Agent

This backend server connects your **Capamul Cars Facebook Page Messenger** to your **Supabase Database**, enabling an AI Auto-Reply Agent that automatically identifies available cars, total prices (SRP), down payments (DP), monthly financing, and vehicle status in real-time.

---

## ⚡ Features
- 🔄 **Real-Time Supabase Integration**: Automatically fetches inventory directly from your `cars` table in Supabase.
- 💰 **Down Payment & Price Calculations**: Automatically provides Total Cash Price and Minimum Down Payment (using `car.dp` or 15% rounded calculation rule).
- 🧠 **Google Gemini 2.5 AI Powered**: Generates natural, friendly, accurate responses to customer queries on Facebook Messenger.
- 🛡️ **Built-In Fallback Engine**: If AI API limit is reached or key is absent, the bot automatically switches to smart rule-based keyword & budget matching.
- 💬 **Messenger Webhook Compliant**: Pre-built Meta Graph API integration with GET verification and POST event handling.

---

## 🛠️ Step 1: Local Setup & Testing

1. Open terminal inside the project directory:
   ```bash
   cd "server"
   npm install
   ```

2. Configure your `.env` file inside `server/`:
   ```env
   PORT=3000
   SUPABASE_URL="https://uwwgrhjpcfmdnhcbampu.supabase.co"
   SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
   GEMINI_API_KEY="YOUR_FREE_GEMINI_API_KEY" # Optional (Get at https://aistudio.google.com/)
   FB_PAGE_ACCESS_TOKEN="YOUR_META_PAGE_ACCESS_TOKEN"
   FB_VERIFY_TOKEN="capamul_cars_messenger_verify_token_123"
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Test locally using curl or PowerShell:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method Post -ContentType "application/json" -Body '{"message": "Is Toyota Vios available and how much is the DP?"}'
   ```

---

## 🌐 Step 2: Deploying to Free Cloud Hosting (Render / Railway / Vercel)

To connect Facebook Messenger, your server must be hosted on a public HTTPS URL.

### Free Deployment on Render.com:
1. Push your repository to GitHub.
2. Log in to [Render.com](https://render.com/) -> Click **New +** -> **Web Service**.
3. Select your repository.
4. Set Build Command: `npm install`
5. Set Start Command: `node index.js`
6. Under **Environment Variables**, add:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - `FB_PAGE_ACCESS_TOKEN`
   - `FB_VERIFY_TOKEN`
7. Render will provide a URL like: `https://capamul-cars-bot.onrender.com`

---

## 📱 Step 3: Meta / Facebook Developer Console Setup

1. Go to [Facebook Developers](https://developers.facebook.com/) and log in.
2. Create a **Business App** (e.g., *Capamul Cars Assistant*).
3. Add the **Messenger** Product to your app.
4. Under **Access Tokens**, add your Capamul Cars Facebook Page and generate a **Page Access Token**. Copy this token into your `FB_PAGE_ACCESS_TOKEN` env variable.
5. Under **Webhooks**:
   - Click **Configure Webhooks**.
   - **Callback URL**: `https://your-render-app.onrender.com/webhook`
   - **Verify Token**: `capamul_cars_messenger_verify_token_123`
   - Click **Verify and Save**.
6. Under **Webhook Subscriptions**, subscribe to `messages` and `messaging_postbacks`.

---

## 🧪 Testing Live Messenger Auto-Reply

Send a message from any Facebook personal account to your **Capamul Cars Facebook Page**:
- *"Hi, what cars do you have available?"*
- *"Is the Vios available? How much is the down payment?"*
- *"What is your location and phone number?"*

The AI Agent will query Supabase in real-time and reply on Messenger! 🚀
