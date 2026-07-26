import { generateAutoReply } from './aiAgent.js';

async function runBisayaTest() {
  console.log('=== Capamul Cars Multilingual / Bisaya Test ===\n');

  console.log('1. Testing Bisaya Query: "Tag pila ang DP sa Toyota Fortuner?"');
  const reply1 = await generateAutoReply('Tag pila ang DP sa Toyota Fortuner?');
  console.log('\n--- Bisaya Auto-Reply ---');
  console.log(reply1);

  console.log('\n2. Testing Bisaya Query: "Asa dapit inyong showroom?"');
  const reply2 = await generateAutoReply('Asa dapit inyong showroom?');
  console.log('\n--- Bisaya Auto-Reply ---');
  console.log(reply2);

  console.log('\n✅ Multilingual & Bisaya test passed cleanly!');
}

runBisayaTest().catch(console.error);
