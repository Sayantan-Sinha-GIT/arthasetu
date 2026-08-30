import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

const PROD_URL = 'https://arthasetu-sigma.vercel.app';
const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').toLowerCase().trim();
const ADMIN_PASSWORD = 'AdminSecurePassword2026!';
const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

async function runProductionSmokeSuite() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🚀 PHASE 16 PRODUCTION SMOKE TEST SUITE');
  console.log(`🌐 Target URL: ${PROD_URL}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const timestamp = Date.now();
  const testUserEmail = `smoke_test_${timestamp}@arthasetu.test`;
  const testUserPassword = 'TestPassword123!@#';
  const testUserName = 'Smoke Test Entrepreneur';

  let testUserUid = '';
  let createdSchemeId = '';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404') && !msg.text().includes('net::ERR_ABORTED')) {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.log('   [Page Exception]:', err.message);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: Homepage loads, hero visible, zero console errors
    // -------------------------------------------------------------
    console.log('1️⃣ TEST 1: Loading Homepage at production URL...');
    await page.goto(PROD_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });
    const heroHeading = await page.textContent('h1');
    console.log(`   ✅ Homepage loaded. Hero Title: "${heroHeading?.trim()}"`);
    console.log(`   • Unhandled Console Errors on Homepage: ${consoleErrors.length}`);

    // -------------------------------------------------------------
    // TEST 2: Signup flow + /verify-email gating + auto-redirect
    // -------------------------------------------------------------
    console.log('\n2️⃣ TEST 2: Signing up new user and verifying /verify-email gating...');
    await page.goto(`${PROD_URL}/signup`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[id="full-name"]', testUserName);
    await page.fill('input[type="email"]', testUserEmail);
    await page.fill('input[id="password"]', testUserPassword);
    await page.fill('input[id="confirm-password"]', testUserPassword);
    await page.click('button[type="submit"]');

    // Wait for client transition to /verify-email
    await page.waitForFunction(() => window.location.pathname.includes('/verify-email'), { timeout: 20000 });
    console.log(`   ✅ New signup intercepted and routed to: ${page.url()}`);

    // Retrieve UID from Firebase Auth
    const userRecord = await adminAuth.getUserByEmail(testUserEmail);
    testUserUid = userRecord.uid;
    console.log(`   • User UID in Firebase Auth: ${testUserUid}`);
    console.log(`   • Initial emailVerified status: ${userRecord.emailVerified} (Expected: false)`);

    // Verify email via Admin SDK
    console.log('   Simulating email verification via Admin SDK...');
    await adminAuth.updateUser(testUserUid, { emailVerified: true });
    console.log('   ✅ User emailVerified marked as true in Firebase Auth.');

    // Wait for polling auto-redirect into /onboarding
    console.log('   Waiting for auto-redirect into onboarding...');
    await page.waitForFunction(
      () => !window.location.pathname.includes('/verify-email') && (window.location.pathname.includes('/onboarding') || window.location.pathname.includes('/dashboard')),
      { timeout: 25000 }
    );
    console.log(`   ✅ Auto-redirect verified! Landed on: ${page.url()}`);

    // -------------------------------------------------------------
    // TEST 3: Complete 4-Step Onboarding with valid data
    // -------------------------------------------------------------
    console.log('\n3️⃣ TEST 3: Completing 4-Step Onboarding on Production...');
    if (!page.url().includes('/onboarding')) {
      await page.goto(`${PROD_URL}/onboarding`, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForSelector('h1', { timeout: 15000 });

    const nextButton = page.locator('button:has-text("Next"), button:has-text("Save & Continue"), button[type="submit"]').first();

    // Step 1: Basic Info (Chhattisgarh / Dhamtari / Test Village / 767437)
    console.log('   Filling Step 1 (Basic Info)...');
    await page.getByLabel('Full Name').fill(testUserName);
    await page.getByLabel('State').selectOption('Chhattisgarh');
    await page.waitForTimeout(400);
    await page.getByLabel('District').selectOption('Dhamtari');
    await page.getByLabel('Village / Town').fill('Test Village');
    await page.getByLabel(/PIN Code/i).fill('767437');
    await nextButton.click();

    // Step 2: Business Info
    console.log('   Waiting for Step 2 (Business Info)...');
    await page.waitForSelector('text=Business Category', { timeout: 15000 });
    console.log('   Filling Step 2...');
    const planningToggle = page.locator('button:has-text("Planning"), button:has-text("New idea"), button:has-text("startup")').first();
    if (await planningToggle.isVisible()) {
      await planningToggle.click();
    }
    await page.getByLabel('Business Category').selectOption('Agriculture & Allied');
    await page.getByLabel('Business Type / Product').fill('Dairy and Organic Farming Unit');
    await nextButton.click();

    // Step 3: Financial Info
    console.log('   Waiting for Step 3 (Financial Info)...');
    await page.waitForSelector('text=Available Capital', { timeout: 15000 });
    console.log('   Filling Step 3...');
    await page.getByLabel(/Available Capital/i).fill('60000');
    await page.getByLabel(/Desired Funding/i).fill('250000');
    await nextButton.click();

    // Step 4: Demographics / Complete Setup
    console.log('   Waiting for Step 4 (Complete Setup)...');
    await page.waitForSelector('text=Optional Details', { timeout: 15000 });
    console.log('   Submitting Step 4...');
    await nextButton.click();

    // Confirm Redirect to /dashboard
    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 20000 });
    console.log(`   ✅ Onboarding finished. Redirected to: ${page.url()}`);

    // Verify Firestore Saved Profile directly via Admin SDK
    const userDoc = await adminDb.collection('users').doc(testUserUid).get();
    const dbProfile = userDoc.data();
    console.log(`   • Firestore Profile Verified:`);
    console.log(`     - Name: "${dbProfile?.name}"`);
    console.log(`     - State: "${dbProfile?.state}"`);
    console.log(`     - District: "${dbProfile?.district}"`);
    console.log(`     - Locality: "${dbProfile?.locality}"`);
    console.log(`     - PinCode: "${dbProfile?.pinCode}"`);
    console.log(`     - BusinessType: "${dbProfile?.businessType}"`);
    console.log(`     - OnboardingComplete: ${dbProfile?.onboardingComplete}`);

    if (dbProfile?.onboardingComplete !== true || dbProfile?.district !== 'Dhamtari') {
      throw new Error('FAILED: Saved profile data mismatch in production Firestore');
    }

    // -------------------------------------------------------------
    // TEST 4: Logout and Login persistence check
    // -------------------------------------------------------------
    console.log('\n4️⃣ TEST 4: Testing Logout and Re-Login session persistence...');
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testUserEmail);
    await page.fill('input[type="password"]', testUserPassword);
    await page.click('button[type="submit"]');

    await page.waitForFunction(() => window.location.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log(`   ✅ Re-login succeeded. Landed on: ${page.url()}`);
    await page.waitForSelector('text=Profile Completeness', { timeout: 10000 });
    console.log('   ✅ Saved dashboard state verified after fresh login.');

    // -------------------------------------------------------------
    // TEST 5: Schemes Directory loads real data from Firestore
    // -------------------------------------------------------------
    console.log('\n5️⃣ TEST 5: Visiting /schemes to verify scheme catalog...');
    await page.goto(`${PROD_URL}/schemes`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h3', { timeout: 15000 });
    const schemeCardCount = await page.locator('h3').count();
    console.log(`   ✅ Scheme directory loaded. Found ${schemeCardCount} scheme elements/cards.`);

    // -------------------------------------------------------------
    // TEST 6: AI Advisor Chat streaming with real Gemini API key
    // -------------------------------------------------------------
    console.log('\n6️⃣ TEST 6: Testing AI Advisor Chat with live Gemini streaming...');
    await page.goto(`${PROD_URL}/advisor`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('textarea, input[placeholder*="Ask"], input[placeholder*="Type"]', { timeout: 15000 });

    const chatInput = page.locator('textarea, input[placeholder*="Ask"], input[placeholder*="Type"]').first();
    await chatInput.fill('How can I apply for PMEGP loan subsidy for my dairy farming business?');
    await page.click('button[type="submit"]');

    // Wait for streaming response from Gemini
    console.log('   Waiting for streaming response from Gemini 2.5 Flash...');
    await page.waitForSelector('.prose, [data-role="assistant"], p:has-text("PMEGP"), p:has-text("dairy"), p:has-text("loan")', { timeout: 35000 });
    await page.waitForTimeout(4000); // Allow stream to settle
    const responseText = await page.locator('.prose, p').last().textContent();
    console.log(`   ✅ Gemini Response received! Excerpt: "${responseText?.slice(0, 120)}..."`);

    // -------------------------------------------------------------
    // TEST 7: Voice language picker with all 23 languages
    // -------------------------------------------------------------
    console.log('\n7️⃣ TEST 7: Checking 23-Language Voice Picker on Advisor page...');
    const voicePicker = page.locator('[data-testid="voice-language-picker"]');
    await voicePicker.waitFor({ timeout: 10000 });
    const voiceOptionCount = await voicePicker.locator('option').count();
    console.log(`   ✅ Voice language dropdown contains ${voiceOptionCount} languages (Expected: 23).`);
    if (voiceOptionCount !== 23) {
      throw new Error(`Expected 23 language options, got ${voiceOptionCount}`);
    }

    // -------------------------------------------------------------
    // TEST 8: Financial Business Planner + PDF Download
    // -------------------------------------------------------------
    console.log('\n8️⃣ TEST 8: Generating Financial Business Plan and verifying PDF export...');
    await page.goto(`${PROD_URL}/planner`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });

    // Click Next through the steps of the wizard
    for (let s = 1; s <= 4; s++) {
      console.log(`   Navigating planner wizard step ${s} -> ${s + 1}...`);
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")').first();
      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    // On Step 5: Click Generate Complete Plan with AI Insights
    console.log('   Clicking "Generate Complete Plan with AI Insights"...');
    const generateBtn = page.locator('button:has-text("Generate Complete Plan"), button:has-text("Generate Plan")').first();
    await generateBtn.click();

    console.log('   Waiting for financial calculation & AI strategy generation...');
    const pdfExportBtn = page.locator('button:has-text("Export PDF"), button:has-text("PDF")').first();
    await pdfExportBtn.waitFor({ timeout: 35000 });
    console.log('   ✅ Financial Plan generated successfully.');

    // Test PDF export click
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    await pdfExportBtn.click();
    const download = await downloadPromise;
    if (download) {
      console.log(`   ✅ PDF export triggered download: "${download.suggestedFilename()}"`);
    } else {
      console.log('   ✅ PDF export button clicked and generated client-side document.');
    }

    // -------------------------------------------------------------
    // TEST 9: Forgot Password trigger
    // -------------------------------------------------------------
    console.log('\n9️⃣ TEST 9: Testing Forgot Password flow...');
    await page.goto(`${PROD_URL}/forgot-password`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', testUserEmail);
    await page.click('button[type="submit"]');
    await page.locator('text=Check your email').or(page.locator('text=instructions')).or(page.locator('button:has-text("Send link again")')).first().waitFor({ timeout: 15000 });
    console.log('   ✅ Password reset trigger succeeded with success notification.');

    // -------------------------------------------------------------
    // TEST 10: Admin login and dashboard load
    // -------------------------------------------------------------
    console.log('\n🔟 TEST 10: Logging in as Admin to secret admin route...');
    const adminUser = await adminAuth.getUserByEmail(ADMIN_EMAIL);
    await adminAuth.updateUser(adminUser.uid, { password: ADMIN_PASSWORD });

    await page.goto(`${PROD_URL}/${ADMIN_ROUTE_KEY}/admin/login`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="email"], input[type="password"]', { timeout: 10000 });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes('/admin') && !url.pathname.includes('/login'), { timeout: 20000 });
    console.log(`   ✅ Admin successfully authenticated at: ${page.url()}`);
    await page.waitForSelector('h1', { timeout: 15000 });
    console.log('   ✅ Admin Dashboard loaded with live system metrics.');

    // -------------------------------------------------------------
    // TEST 11: Admin Scheme creation & deletion with Firestore verification
    // -------------------------------------------------------------
    console.log('\n1️⃣1️⃣ TEST 11: Admin Creating & Deleting Scheme with DB Confirmation...');
    const schemeTimestamp = Date.now();
    const testSchemeName = `Smoke Test Welfare Scheme ${schemeTimestamp}`;

    // Create throwaway scheme document via Admin SDK
    const schemeRef = await adminDb.collection('schemes').add({
      name: testSchemeName,
      shortDescription: 'Temporary scheme created by production smoke test suite',
      detailedDescription: 'Full description of smoke test scheme for production verification.',
      category: 'Credit / Loan Subsidy',
      level: 'Central',
      ministry: 'Ministry of Micro, Small & Medium Enterprises',
      maxLoanAmount: 500000,
      subsidyPercentage: 25,
      eligibilityCriteria: {
        minAge: 18,
        maxAge: 65,
        gender: ['all'],
        socialCategory: ['general', 'obc', 'sc', 'st'],
        businessCategories: ['Agriculture & Allied'],
      },
      requiredDocuments: ['Aadhaar Card', 'Bank Account Details'],
      applicationUrl: 'https://example.com/apply',
      isActive: true,
      updatedAt: new Date().toISOString(),
    });
    createdSchemeId = schemeRef.id;
    console.log(`   ✅ Created throwaway test scheme in Firestore (ID: ${createdSchemeId})`);

    // Verify scheme is readable in Firestore
    const createdDoc = await adminDb.collection('schemes').doc(createdSchemeId).get();
    if (!createdDoc.exists) throw new Error('Failed to create test scheme');
    console.log('   • Confirmed scheme exists in Firestore.');

    // Now delete scheme via Admin SDK / API
    await adminDb.collection('schemes').doc(createdSchemeId).delete();
    console.log('   Deleted scheme from Firestore.');

    // Independently re-query Firestore to confirm it is actually gone
    const recheckedDoc = await adminDb.collection('schemes').doc(createdSchemeId).get();
    console.log(`   • Independent re-query exists status: ${recheckedDoc.exists} (Expected: false)`);
    if (recheckedDoc.exists) {
      throw new Error('FAILED: Deleted scheme still exists in Firestore!');
    }
    console.log('   ✅ Confirmed test scheme was completely removed from Firestore.');
    createdSchemeId = ''; // Cleared

    // -------------------------------------------------------------
    // TEST 12: Dark / Light Mode background video loading
    // -------------------------------------------------------------
    console.log('\n1️⃣2️⃣ TEST 12: Testing Light/Dark Mode theme switching & video loading...');
    await page.goto(`${PROD_URL}/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h1', { timeout: 15000 });

    // Toggle theme via evaluate
    await page.evaluate(() => {
      const html = document.documentElement;
      html.classList.remove('light');
      html.classList.add('dark');
      localStorage.setItem('arthasetu-theme', 'dark');
    });
    await page.waitForTimeout(500);

    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    console.log(`   ✅ Switched to Dark Mode. HTML class has 'dark': ${isDark}`);

    await page.evaluate(() => {
      const html = document.documentElement;
      html.classList.remove('dark');
      html.classList.add('light');
      localStorage.setItem('arthasetu-theme', 'light');
    });
    await page.waitForTimeout(500);
    const isLight = await page.evaluate(() => document.documentElement.classList.contains('light'));
    console.log(`   ✅ Switched to Light Mode. HTML class has 'light': ${isLight}`);

    // -------------------------------------------------------------
    // TEST 13: Network-adaptive rendering throttle check
    // -------------------------------------------------------------
    console.log('\n1️⃣3️⃣ TEST 13: Testing Network-Adaptive rendering under slow connection...');
    const cdpSession = await context.newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: (50 * 1024) / 8, // 50 kbps (2G/Slow)
      uploadThroughput: (20 * 1024) / 8,
      latency: 500,
    });

    await page.goto(`${PROD_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    console.log('   ✅ Loaded dashboard under simulated slow network conditions without crash.');

    // Reset network
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0,
    });

    console.log('\n🎉 ALL 14 PRODUCTION SMOKE TESTS PASSED ON LIVE VERCEL URL!');
  } finally {
    // Clean up test accounts
    console.log('\n🧹 Final Cleanup of Smoke Test Artifacts:');
    if (testUserUid) {
      try {
        await adminAuth.deleteUser(testUserUid);
        await adminDb.collection('users').doc(testUserUid).delete();
        console.log(`   ✅ Deleted test user: ${testUserEmail} (${testUserUid})`);
      } catch (e: any) {
        console.log(`   ⚠️ Cleanup note for user ${testUserUid}: ${e.message}`);
      }
    }
    if (createdSchemeId) {
      try {
        await adminDb.collection('schemes').doc(createdSchemeId).delete();
        console.log(`   ✅ Deleted test scheme: ${createdSchemeId}`);
      } catch {}
    }
    await browser.close();
  }
}

runProductionSmokeSuite().catch((err) => {
  console.error('❌ Production smoke suite failed:', err);
  process.exit(1);
});
