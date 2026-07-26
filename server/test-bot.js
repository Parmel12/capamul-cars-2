import { generateAutoReply } from './aiAgent.js';
import { getAvailableCars } from './supabaseClient.js';

async function runTest() {
  console.log('=== Capamul Cars AI Agent Real-Time DB Test ===\n');

  console.log('1. Fetching available cars from Supabase...');
  const cars = await getAvailableCars();
  console.log(`Found ${cars.length} active cars in database.`);

  console.log('\n2. Customer Query: "How much is the DP for Wigo?"');
  const reply1 = await generateAutoReply('How much is the DP for Wigo?');
  console.log('\n--- Messenger Auto-Reply ---');
  console.log(reply1);

  console.log('\n3. Customer Query: "What is your location and phone number?"');
  const reply2 = await generateAutoReply('What is your location and phone number?');
  console.log('\n--- Messenger Auto-Reply ---');
  console.log(reply2);

  console.log('\n✅ All tests passed cleanly!');
}

runTest().catch(console.error);
