import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function verifyTask2VoiceLanguagePicker() {
  console.log('============================================================');
  console.log('🧪 TASK 2 VERIFICATION — VOICE INPUT 23-LANGUAGE PICKER');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const testEmail = `phase15_task2_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';
  const testName = 'Voice Test User';

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

    // Launch Playwright with mock SpeechRecognition
    console.log('\n2️⃣ Launching Playwright browser with mock SpeechRecognition...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

    // Mock Web Speech API in browser context using pure JS string (avoids TS compiler helper issues)
    await context.addInitScript(`
      window.capturedSpeechLangs = [];
      function MockSpeechRecognition() {
        this.continuous = false;
        this.interimResults = true;
        this.maxAlternatives = 1;
        this.lang = '';
        this.onstart = null;
        this.onresult = null;
        this.onerror = null;
        this.onend = null;
      }
      MockSpeechRecognition.prototype.start = function() {
        window.capturedSpeechLangs.push(this.lang);
        if (this.onstart) setTimeout(this.onstart, 10);
      };
      MockSpeechRecognition.prototype.stop = function() {
        if (this.onend) setTimeout(this.onend, 10);
      };
      MockSpeechRecognition.prototype.abort = function() {
        if (this.onend) setTimeout(this.onend, 10);
      };

      window.SpeechRecognition = MockSpeechRecognition;
      window.webkitSpeechRecognition = MockSpeechRecognition;
    `);

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

    // Navigate to /advisor
    console.log('4️⃣ Navigating to /advisor (AI Advisor Chat)...');
    await page.goto('http://localhost:3000/advisor', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="voice-language-picker"]', { timeout: 15000 });
    console.log('   ✅ Advisor page loaded with 23-Language Speech Picker visible!');

    // Check all 23 language options in dropdown
    const picker = page.locator('[data-testid="voice-language-picker"]');
    const optionCount = await picker.locator('option').count();
    console.log(`   ✅ Speech language picker contains ${optionCount} options (Expected: 23).`);
    if (optionCount !== 23) {
      throw new Error(`Expected 23 language options, got ${optionCount}`);
    }

    const micButton = page.locator('[data-testid="advisor-mic-button"]');

    // TEST 1: Select Bengali (bn-IN)
    console.log('\n5️⃣ TEST 1: Selecting Bengali ("bn-IN")...');
    await picker.selectOption('bn-IN');
    await page.waitForTimeout(300);

    console.log('   Clicking Mic to trigger SpeechRecognition with Bengali...');
    await micButton.click();
    await page.waitForTimeout(400);

    const captured1 = await page.evaluate(() => {
      const langs = (window as any).capturedSpeechLangs || [];
      const storageVal = localStorage.getItem('arthasetu-speech-language');
      return { lastLang: langs[langs.length - 1], allLangs: langs, storageVal };
    });

    console.log(`   • Captured SpeechRecognition.lang: "${captured1.lastLang}" (Expected: "bn-IN")`);
    console.log(`   • localStorage["arthasetu-speech-language"]: "${captured1.storageVal}" (Expected: "bn-IN")`);

    if (captured1.lastLang !== 'bn-IN' || captured1.storageVal !== 'bn-IN') {
      throw new Error(`Assertion failed for Bengali: expected bn-IN, got lang=${captured1.lastLang}, storage=${captured1.storageVal}`);
    }
    console.log('   ✅ Bengali (bn-IN) verified successfully!');

    // Stop listening before next test
    await micButton.click();
    await page.waitForTimeout(300);

    // TEST 2: Select Tamil (ta-IN)
    console.log('\n6️⃣ TEST 2: Selecting Tamil ("ta-IN")...');
    await picker.selectOption('ta-IN');
    await page.waitForTimeout(300);

    console.log('   Clicking Mic to trigger SpeechRecognition with Tamil...');
    await micButton.click();
    await page.waitForTimeout(400);

    const captured2 = await page.evaluate(() => {
      const langs = (window as any).capturedSpeechLangs || [];
      const storageVal = localStorage.getItem('arthasetu-speech-language');
      return { lastLang: langs[langs.length - 1], allLangs: langs, storageVal };
    });

    console.log(`   • Captured SpeechRecognition.lang: "${captured2.lastLang}" (Expected: "ta-IN")`);
    console.log(`   • localStorage["arthasetu-speech-language"]: "${captured2.storageVal}" (Expected: "ta-IN")`);

    if (captured2.lastLang !== 'ta-IN' || captured2.storageVal !== 'ta-IN') {
      throw new Error(`Assertion failed for Tamil: expected ta-IN, got lang=${captured2.lastLang}, storage=${captured2.storageVal}`);
    }
    console.log('   ✅ Tamil (ta-IN) verified successfully!');

    // Stop listening
    await micButton.click();
    await page.waitForTimeout(300);

    // TEST 3: Select Punjabi (pa-IN)
    console.log('\n7️⃣ TEST 3: Selecting Punjabi ("pa-IN")...');
    await picker.selectOption('pa-IN');
    await page.waitForTimeout(300);

    console.log('   Clicking Mic to trigger SpeechRecognition with Punjabi...');
    await micButton.click();
    await page.waitForTimeout(400);

    const captured3 = await page.evaluate(() => {
      const langs = (window as any).capturedSpeechLangs || [];
      const storageVal = localStorage.getItem('arthasetu-speech-language');
      return { lastLang: langs[langs.length - 1], allLangs: langs, storageVal };
    });

    console.log(`   • Captured SpeechRecognition.lang: "${captured3.lastLang}" (Expected: "pa-IN")`);
    console.log(`   • localStorage["arthasetu-speech-language"]: "${captured3.storageVal}" (Expected: "pa-IN")`);

    if (captured3.lastLang !== 'pa-IN' || captured3.storageVal !== 'pa-IN') {
      throw new Error(`Assertion failed for Punjabi: expected pa-IN, got lang=${captured3.lastLang}, storage=${captured3.storageVal}`);
    }
    console.log('   ✅ Punjabi (pa-IN) verified successfully!');

    // TEST 4: Persistence across Page Reload
    console.log('\n8️⃣ TEST 4: Verifying Persistence across page reload...');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="voice-language-picker"]', { timeout: 10000 });

    const persistedPickerValue = await page.locator('[data-testid="voice-language-picker"]').inputValue();
    const persistedLocalStorage = await page.evaluate(() => localStorage.getItem('arthasetu-speech-language'));

    console.log(`   • Restored Picker Value on reload: "${persistedPickerValue}" (Expected: "pa-IN")`);
    console.log(`   • Restored localStorage Value: "${persistedLocalStorage}" (Expected: "pa-IN")`);

    if (persistedPickerValue !== 'pa-IN' || persistedLocalStorage !== 'pa-IN') {
      throw new Error(`Assertion failed: localStorage persistence failed across page reload`);
    }
    console.log('   ✅ localStorage persistence across reload confirmed!');

    console.log('\n🎉 ALL TASK 2 VOICE LANGUAGE PICKER ASSERTIONS PASSED WITH REAL LIVE OUTPUT!');
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

verifyTask2VoiceLanguagePicker().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
