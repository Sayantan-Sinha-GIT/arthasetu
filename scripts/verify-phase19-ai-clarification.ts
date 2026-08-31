import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyAiClarification() {
  console.log('============================================================');
  console.log('🤖 VERIFYING TASK 7: AI CLARIFICATION LOGIC');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(name: string, condition: boolean, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}${details ? ` (${details})` : ''}`);
    } else {
      console.error(`  ❌ [FAIL] ${name}${details ? ` (${details})` : ''}`);
    }
  }

  // 1. /api/validate flags gibberish business input
  console.log('1️⃣ Testing /api/validate with gibberish business type:');
  const resVal = await fetch('http://localhost:3000/api/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessType: 'asdfghjk 12345 nonsense',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
    }),
  });
  const dataVal = await resVal.json();
  assert('Validation API identifies gibberish business and flags error', !!dataVal.data?.errors?.businessType);

  // 2. /api/advisor asks for clarification when asked about ambiguous/gibberish business
  console.log('\n2️⃣ Testing /api/advisor response on ambiguous business query:');
  const resAdv = await fetch('http://localhost:3000/api/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Can you help me start my xyz123 business in Assam?',
      conversationHistory: [],
      userProfile: { state: 'Assam', district: 'Kamrup Metropolitan' },
      language: 'en',
    }),
  });

  const reader = resAdv.body?.getReader();
  let fullAdvText = '';
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullAdvText += decoder.decode(value);
    }
  }
  const asksClarification = /clarify|what kind|what type|tell me more|examples|specific/i.test(fullAdvText);
  assert('AI Advisor asks for clarification rather than guessing', asksClarification, fullAdvText.slice(0, 100));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 7 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyAiClarification().catch((err) => {
  console.error(err);
  process.exit(1);
});
