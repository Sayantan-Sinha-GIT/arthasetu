import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function verifyTask3UICompleteness() {
  console.log('============================================================');
  console.log('🧪 TASK 3 UI VERIFICATION — PROFILE COMPLETENESS GATING');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const unverifiedEmail = `unverified_task3_${timestamp}@example.com`;
  const verifiedEmail = `verified_task3_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';

  let unverifiedUid = '';
  let verifiedUid = '';

  try {
    console.log('1️⃣ Creating unverified user account with complete profile in Firestore...');
    const unverifiedRecord = await adminAuth.createUser({
      email: unverifiedEmail,
      password: testPassword,
      displayName: 'Unverified Entrepreneur',
      emailVerified: false,
    });
    unverifiedUid = unverifiedRecord.uid;

    await adminDb.collection('users').doc(unverifiedUid).set({
      uid: unverifiedUid,
      email: unverifiedEmail,
      name: 'Unverified Entrepreneur',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Guwahati',
      pinCode: '781001',
      businessStatus: 'existing',
      businessCategory: 'Retail & Trading',
      businessType: 'General Store',
      businessExperience: '3-5 years',
      availableCapital: 50000,
      desiredFunding: 200000,
      monthlyIncome: 30000,
      monthlyExpenses: 15000,
      dob: '1990-01-01',
      onboardingComplete: true,
    });
    console.log(`   ✅ Unverified user profile set in Firestore (UID: ${unverifiedUid})`);

    console.log('2️⃣ Creating verified user account with complete profile in Firestore...');
    const verifiedRecord = await adminAuth.createUser({
      email: verifiedEmail,
      password: testPassword,
      displayName: 'Verified Entrepreneur',
      emailVerified: true,
    });
    verifiedUid = verifiedRecord.uid;

    await adminDb.collection('users').doc(verifiedUid).set({
      uid: verifiedUid,
      email: verifiedEmail,
      name: 'Verified Entrepreneur',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Guwahati',
      pinCode: '781001',
      businessStatus: 'existing',
      businessCategory: 'Retail & Trading',
      businessType: 'General Store',
      businessExperience: '3-5 years',
      availableCapital: 50000,
      desiredFunding: 200000,
      monthlyIncome: 30000,
      monthlyExpenses: 15000,
      dob: '1990-01-01',
      onboardingComplete: true,
    });
    console.log(`   ✅ Verified user profile set in Firestore (UID: ${verifiedUid})`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // TEST UNVERIFIED USER
    console.log('\n3️⃣ Logging in as UNVERIFIED user to check email verification guard / ProfileCompleteness...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', unverifiedEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should land on /verify-email due to auth guard
    await page.waitForURL((url) => url.pathname.includes('/verify-email'), { timeout: 15000 });
    console.log(`   ✅ Unverified account correctly routed to: ${page.url()}`);

    // TEST VERIFIED USER
    console.log('\n4️⃣ Logging in as VERIFIED user to check 100% Completeness...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', verifiedEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((url) => url.pathname.includes('/dashboard'), { timeout: 15000 });
    console.log(`   ✅ Verified user redirected to: ${page.url()}`);

    // Check ProfileCompleteness widget on dashboard
    await page.locator('text=Profile Completeness').waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    const hasAllSet = await page.locator('text=All profile details are set').isVisible();
    const percent100 = await page.locator('text=100%').isVisible();
    console.log(`   • "100%" badge visible: ${percent100}`);
    console.log(`   • "All profile details are set! Schemes and advice are fully tailored." visible: ${hasAllSet}`);

    if (!hasAllSet || !percent100) {
      throw new Error('FAILED: Verified complete profile did not show 100% fully tailored message');
    }
    console.log('   ✅ Verified complete profile displays 100% fully tailored message!');

    console.log('\n🎉 ALL TASK 3 UI PROFILE INTEGRITY ASSERTIONS PASSED WITH REAL LIVE OUTPUT!');
    await browser.close();
  } finally {
    if (unverifiedUid) {
      try {
        await adminAuth.deleteUser(unverifiedUid);
        await adminDb.collection('users').doc(unverifiedUid).delete();
      } catch {}
    }
    if (verifiedUid) {
      try {
        await adminAuth.deleteUser(verifiedUid);
        await adminDb.collection('users').doc(verifiedUid).delete();
      } catch {}
    }
  }
}

verifyTask3UICompleteness().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
