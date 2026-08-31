import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function verifyPhase20LiveProd() {
  console.log('============================================================');
  console.log('🌐 VERIFYING PHASE 20 LIVE PRODUCTION DEPLOYMENT');
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

  // 1. Live Precision Verification for 5 Real PIN codes
  console.log('1️⃣ Testing Live Production /api/pincode Precision for 5 Real PINs:');
  const testPins = [
    { pin: '700001', district: 'Kolkata', areaMatch: 'Lalbazar' },
    { pin: '110001', district: 'New Delhi', areaMatch: 'Connaught Place' },
    { pin: '400001', district: 'Mumbai', areaMatch: 'Fort' },
    { pin: '636701', district: 'Dharmapuri', areaMatch: 'Dharmapuri' },
    { pin: '493773', district: 'Dhamtari', areaMatch: 'Dhamtari' },
  ];

  for (const t of testPins) {
    const res = await fetch(`${BASE_URL}/api/pincode?pin=${t.pin}`);
    const json = await res.json();
    const matchesDistrict = json.data?.district === t.district;
    const matchesArea = json.data?.areas?.some((a: string) => a.toLowerCase().includes(t.areaMatch.toLowerCase()));
    assert(
      `Live PIN ${t.pin} (${t.district}) returns genuine areas including ${t.areaMatch}`,
      Boolean(json.success && matchesDistrict && matchesArea),
      `Areas: ${json.data?.areas?.slice(0, 2).join(', ')}`
    );
  }

  // 2. Live Persistent Cache Performance on Dynamic PIN
  console.log('\n2️⃣ Testing Live Persistent Caching on Dynamic PIN (682016):');
  const dynamicPin = '682016';
  const t0 = Date.now();
  const resDynamic1 = await fetch(`${BASE_URL}/api/pincode?pin=${dynamicPin}`);
  const jsonDynamic1 = await resDynamic1.json();
  const dur1 = Date.now() - t0;
  assert(`Live first lookup of PIN ${dynamicPin} succeeds`, jsonDynamic1.success, `${dur1}ms`);

  const t1 = Date.now();
  const resDynamic2 = await fetch(`${BASE_URL}/api/pincode?pin=${dynamicPin}`);
  const jsonDynamic2 = await resDynamic2.json();
  const dur2 = Date.now() - t1;
  assert(`Live second lookup of PIN ${dynamicPin} is cached and fast`, jsonDynamic2.success && dur2 < 400, `${dur2}ms`);

  // 3. Live /api/validate Address Consistency with PIN
  console.log('\n3️⃣ Testing Live /api/validate PIN Consistency:');
  const resValidate = await fetch(`${BASE_URL}/api/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pinCode: '700001',
      state: 'West Bengal',
      district: 'Kolkata',
      businessType: 'Bakery Shop',
    }),
  });
  const jsonValidate = await resValidate.json();
  assert('Live address validation accepts matching 700001 / Kolkata / West Bengal', !jsonValidate.data?.errors?.pinCode);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 LIVE PRODUCTION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyPhase20LiveProd().catch((err) => {
  console.error(err);
  process.exit(1);
});
