import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function verifyTask1Onboarding() {
  console.log('============================================================');
  console.log('🧪 TASK 1 VERIFICATION — ONBOARDING NEXT BUTTON & STEP FLOW');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const testEmail = `phase15_task1_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';
  const testName = 'Ramesh Kumar';

  let testUid = '';

  try {
    console.log('1️⃣ Creating verified test user via Admin SDK...');
    const userRecord = await adminAuth.createUser({
      email: testEmail,
      password: testPassword,
      displayName: testName,
      emailVerified: true,
    });
    testUid = userRecord.uid;
    console.log(`   ✅ Created test user: ${testEmail} (UID: ${testUid})`);

    // Launch Playwright
    console.log('\n2️⃣ Launching Playwright browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Login
    console.log('3️⃣ Logging in at http://localhost:3000/login...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`   ✅ Logged in successfully. Current URL: ${page.url()}`);

    // Navigate to /onboarding
    console.log('4️⃣ Navigating to /onboarding...');
    await page.goto('http://localhost:3000/onboarding', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });
    const h1Text = await page.textContent('h1');
    console.log(`   ✅ Onboarding loaded. Heading: "${h1Text?.trim()}"`);

    // TEST INVALID CASE FIRST
    console.log('\n5️⃣ Testing INVALID Case on Step 1 (leaving required field empty)...');
    const nameInput = page.getByLabel('Full Name');
    const localityInput = page.getByLabel('Village / Town');
    const stateSelect = page.getByLabel('State');
    const districtSelect = page.getByLabel('District');
    const nextButton = page.locator('button[type="submit"]');

    // Clear locality and name
    await nameInput.fill('');
    await localityInput.fill('');
    await nextButton.click();

    // Assert error appears and step does NOT advance
    await page.locator('text=Please enter your full name').waitFor({ timeout: 5000 });
    const errorMsg = await page.locator('text=Please enter your full name').textContent();
    console.log(`   ✅ Asserted inline validation error appeared: "${errorMsg?.trim()}"`);

    const step2Visible = await page.locator('text=Select category').isVisible().catch(() => false);
    if (step2Visible) {
      throw new Error('FAILED: UI advanced on invalid data!');
    }
    console.log('   ✅ Step correctly did NOT advance when required fields were missing.');

    // TEST VALID CASE - STEP 1
    console.log('\n6️⃣ Filling Step 1 with valid data (Chhattisgarh / Dhamtari / Test Village / 767437)...');
    await nameInput.fill('Ramesh Kumar');
    await stateSelect.selectOption('Chhattisgarh');
    await page.waitForTimeout(400);

    await districtSelect.selectOption('Dhamtari');
    await localityInput.fill('Test Village');

    const pinInput = page.getByLabel(/PIN Code/i);
    await pinInput.fill('767437');

    console.log('   Submitting Step 1 ("Next →")...');
    await nextButton.click();

    // Assert advancement to Step 2
    console.log('7️⃣ Asserting UI advances to Step 2 (Business Info)...');
    await page.waitForSelector('text=Business Category', { timeout: 10000 });
    console.log('   ✅ ADVANCED TO STEP 2! Business Category selection is now visible on screen.');

    // STEP 2 - Business Info
    console.log('\n8️⃣ Filling Step 2 with valid business data...');
    const categorySelect = page.getByLabel('Business Category');
    await categorySelect.selectOption('Agriculture & Allied');

    const businessTypeInput = page.getByLabel('Business Type / Product');
    await businessTypeInput.fill('Dairy and Vegetable Farming Unit');

    console.log('   Submitting Step 2 ("Next →")...');
    await nextButton.click();

    // Assert advancement to Step 3
    console.log('9️⃣ Asserting UI advances to Step 3 (Financial Info)...');
    await page.waitForSelector('text=Available Capital', { timeout: 10000 });
    console.log('   ✅ ADVANCED TO STEP 3! Capital & Funding fields are visible.');

    // STEP 3 - Financial Info
    console.log('\n🔟 Filling Step 3 with valid financial data...');
    const capitalInput = page.getByLabel(/Available Capital/i);
    await capitalInput.fill('50000');
    const fundingInput = page.getByLabel(/Desired Funding/i);
    await fundingInput.fill('200000');

    console.log('   Submitting Step 3 ("Next →")...');
    await nextButton.click();

    // Assert advancement to Step 4
    console.log('1️⃣1️⃣ Asserting UI advances to Step 4 (Eligibility & Demographics)...');
    await page.waitForSelector('text=Optional Details', { timeout: 10000 });
    console.log('   ✅ ADVANCED TO STEP 4! Optional Details / Final step reached.');

    // Complete Onboarding
    console.log('\n1️⃣2️⃣ Submitting Final Step ("Complete Setup")...');
    const finishButton = page.locator('button[type="submit"]');
    await finishButton.click();

    // Confirm Redirect to /dashboard
    console.log('1️⃣3️⃣ Confirming redirect to /dashboard...');
    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log(`   ✅ REDIRECT CONFIRMED! Final URL: ${page.url()}`);

    // Verify saved profile in Firestore
    const savedDoc = await adminDb.collection('users').doc(testUid).get();
    const data = savedDoc.data();
    console.log('\n1️⃣4️⃣ Verifying Firestore Saved Profile:');
    console.log(`   - Name: "${data?.name}"`);
    console.log(`   - State: "${data?.state}"`);
    console.log(`   - District: "${data?.district}"`);
    console.log(`   - Locality: "${data?.locality}"`);
    console.log(`   - PinCode: "${data?.pinCode}"`);
    console.log(`   - BusinessType: "${data?.businessType}"`);
    console.log(`   - OnboardingComplete: ${data?.onboardingComplete}`);

    if (data?.onboardingComplete !== true || data?.district !== 'Dhamtari') {
      throw new Error('FAILED: Saved profile data mismatch in Firestore');
    }

    console.log('\n🎉 ALL TASK 1 ASSERTIONS PASSED WITH REAL LIVE OUTPUT!');
    await browser.close();
  } finally {
    if (testUid) {
      try {
        await adminAuth.deleteUser(testUid);
        await adminDb.collection('users').doc(testUid).delete();
        console.log(`🧹 Cleaned up test user ${testUid}`);
      } catch {}
    }
  }
}

verifyTask1Onboarding().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
