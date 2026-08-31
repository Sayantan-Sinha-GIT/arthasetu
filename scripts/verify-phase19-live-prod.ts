import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyLiveProd() {
  console.log('============================================================');
  console.log('🌐 VERIFYING PHASE 19 LIVE PRODUCTION DEPLOYMENT');
  console.log('URL: https://arthasetu-sigma.vercel.app');
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

  const BASE_URL = 'https://arthasetu-sigma.vercel.app';

  // 1. Homepage & Admin Login Route
  console.log('1️⃣ Testing Live Public & Admin Route Responses:');
  const resHome = await fetch(`${BASE_URL}/`);
  assert('Homepage returns HTTP 200', resHome.status === 200);

  const resAdminLogin = await fetch(`${BASE_URL}/4632/admin/login`);
  assert('Secure Admin Login route returns HTTP 200', resAdminLogin.status === 200);

  // 2. Live /api/validate with PIN Code Consistency
  console.log('\n2️⃣ Testing Live /api/validate with PIN Code Consistency:');
  const resBadPin = await fetch(`${BASE_URL}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pinCode: '781001',
      state: 'Kerala',
      district: 'Ernakulam',
      businessType: 'Bakery',
    }),
  });
  const dataBadPin = await resBadPin.json();
  assert('Live API catches PIN code mismatch', !!dataBadPin.data?.errors?.pinCode);

  const resGoodPin = await fetch(`${BASE_URL}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pinCode: '781001',
      state: 'Assam',
      district: 'Kamrup Metropolitan',
      businessType: 'Bakery Unit',
    }),
  });
  const dataGoodPin = await resGoodPin.json();
  assert('Live API accepts valid matching PIN code', !dataGoodPin.data?.errors?.pinCode);

  // 3. Live /api/advisor Scope Enforcement
  console.log('\n3️⃣ Testing Live /api/advisor Scope Enforcement:');
  const resOffTopic = await fetch(`${BASE_URL}/api/advisor`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Write python code for a binary search tree',
      language: 'en',
    }),
  });
  const reader = resOffTopic.body?.getReader();
  let offTopicText = '';
  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      offTopicText += decoder.decode(value);
    }
  }
  const isRedirected = /micro-enterprise|small business|schemes|financial|advisor/i.test(offTopicText);
  assert('Live Advisor streams polite off-topic redirect for coding query', isRedirected, offTopicText.slice(0, 80));

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 LIVE PRODUCTION VERIFICATION: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyLiveProd().catch((err) => {
  console.error(err);
  process.exit(1);
});
