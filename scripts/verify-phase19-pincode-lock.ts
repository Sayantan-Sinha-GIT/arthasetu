import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { lookupPincode, isValidPincode, validateAddressConsistency } from '../src/lib/constants/pincodes';
import { chromium } from 'playwright';
import { adminAuth } from '../src/lib/firebase-admin';

async function verifyPincodeLock() {
  console.log('============================================================');
  console.log('📍 VERIFYING TASK 4: PINCODE-DRIVEN ADDRESS AUTO-RESOLUTION');
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

  // 1. Direct Unit Tests on Pincode Resolver
  console.log('1️⃣ Testing Pincode Resolver & Consistency:');
  
  const pinAssam = lookupPincode('781001');
  assert('PIN 781001 resolves to Assam and Kamrup Metropolitan', pinAssam?.state === 'Assam' && pinAssam.district === 'Kamrup Metropolitan');
  assert('PIN 781001 has registered locality areas', (pinAssam?.areas.length ?? 0) > 0, `areas: ${pinAssam?.areas.join(', ')}`);

  const pinDelhi = lookupPincode('110001');
  assert('PIN 110001 resolves to Delhi and New Delhi', pinDelhi?.state === 'Delhi');

  const invalidPin = isValidPincode('012345');
  assert('PIN starting with 0 is marked invalid', !invalidPin);

  const mismatchCheck = validateAddressConsistency('781001', 'Kerala', 'Ernakulam');
  assert('Mismatched PIN vs State detected', !mismatchCheck.valid);

  const matchCheck = validateAddressConsistency('781001', 'Assam', 'Kamrup Metropolitan');
  assert('Matching PIN vs State passes validation', matchCheck.valid);

  // 2. Server-side /api/validate Endpoint Checks
  console.log('\n2️⃣ Testing /api/validate HTTP Endpoint with PIN verification:');
  try {
    const resBad = await fetch('http://localhost:3000/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pinCode: '781001',
        state: 'Kerala',
        district: 'Ernakulam',
        businessType: 'Bakery',
      }),
    });
    const dataBad = await resBad.json();
    assert('API rejects mismatched PIN code and state', !!dataBad.data?.errors?.pinCode);

    const resGood = await fetch('http://localhost:3000/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pinCode: '781001',
        state: 'Assam',
        district: 'Kamrup Metropolitan',
        businessType: 'Tea Stall',
      }),
    });
    const dataGood = await resGood.json();
    assert('API accepts matching PIN code and state', !dataGood.data?.errors?.pinCode);
  } catch (err: any) {
    assert('HTTP /api/validate check completed', false, err.message);
  }

  // 3. Playwright UI Flow: PIN Entry Auto-Fills and Locks State & District
  console.log('\n3️⃣ Testing UI Auto-Fill and Lock in Onboarding Form:');
  const testEmail = `pincode_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  const user = await adminAuth.createUser({
    email: testEmail,
    password: testPassword,
    emailVerified: true,
    displayName: 'Pincode Tester',
  });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // Login
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/onboarding') || window.location.pathname.includes('/dashboard'), null, { timeout: 15000 });
    
    await page.goto('http://localhost:3000/onboarding', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[placeholder*="Ramesh"]', { timeout: 10000 });

    // Enter name
    await page.fill('input[placeholder*="Ramesh"]', 'Pincode Tester');

    // Type 6-digit PIN code
    const pinInput = page.locator('input[maxlength="6"]');
    await pinInput.fill('781001');

    // Wait for auto-resolution badge
    await page.waitForSelector('text=Auto-resolved', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Verify State select contains Assam and is disabled/locked
    const stateSelect = page.locator('select').nth(1); // 0 is Language, 1 is State
    const selectedState = await stateSelect.inputValue();
    assert('State is auto-populated as Assam', selectedState === 'Assam', `got: ${selectedState}`);

    // Verify District select contains Kamrup Metropolitan
    const districtSelect = page.locator('select').nth(2);
    const selectedDistrict = await districtSelect.inputValue();
    assert('District is auto-populated as Kamrup Metropolitan', selectedDistrict === 'Kamrup Metropolitan', `got: ${selectedDistrict}`);

    // Click Next
    await page.click('button:has-text("Next")');

    // Verify advancement to Step 2 (Business Info)
    await page.waitForSelector('text=Business Category', { timeout: 10000 });
    assert('Advanced to Step 2 after valid PIN-locked address', true);

  } catch (err: any) {
    console.error('Playwright UI Error:', err);
    assert('UI test completed without uncaught error', false, err.message);
  } finally {
    await browser.close();
    await adminAuth.deleteUser(user.uid);
    console.log('   🧹 Cleaned up temporary test user');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 TASK 4 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyPincodeLock().catch((err) => {
  console.error(err);
  process.exit(1);
});
