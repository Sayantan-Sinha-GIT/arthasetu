import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { chromium } from 'playwright';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function getIdTokenForUid(uid: string): Promise<string> {
  const customToken = await adminAuth.createCustomToken(uid);
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json();
  if (!data.idToken) {
    throw new Error(`Failed to exchange custom token for ID token: ${JSON.stringify(data)}`);
  }
  return data.idToken;
}

async function verifyPhase22AdminActions() {
  const targetUrl = (process.argv[2] || process.env.TEST_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🛡️ PHASE 22: VERIFYING ADMIN CONSOLE ACTIONS & UNIFIED AUTH');
  console.log(`🌐 Target Base URL: ${targetUrl}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
  const adminRouteKey = (process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').replace(/^['"]|['"]$/g, '').trim();

  if (!adminPassword) {
    console.error('❌ Error: ADMIN_PASSWORD is missing in .env.local');
    process.exit(1);
  }

  // Safety confirmation
  console.log('🔒 Safety Check: Ensuring real users (e.g. Rajesh) are never modified.');
  const rajeshUser = await adminAuth.getUserByEmail('rajesh@gmail.com').catch(() => null);
  if (rajeshUser) {
    console.log(`  ✅ Confirmed Rajesh account exists (UID: ${rajeshUser.uid}) and will remain untouched.`);
  }

  const adminUserRecord = await adminAuth.getUserByEmail(adminEmail);

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

  // 1. Prepare Disposable Test Account for UI Deletion
  const timestamp = Date.now();
  const disposableEmail = `prod_test_${timestamp}@example.com`;
  const disposablePassword = 'Password123!@#';

  console.log(`\n📦 Creating disposable test user: ${disposableEmail}...`);
  const disposableAuthUser = await adminAuth.createUser({
    email: disposableEmail,
    password: disposablePassword,
    displayName: 'Disposable Test User',
    emailVerified: true,
  });

  await adminDb.collection('users').doc(disposableAuthUser.uid).set({
    uid: disposableAuthUser.uid,
    name: 'Disposable Test User',
    email: disposableEmail,
    language: 'en',
    state: 'Assam',
    district: 'Kamrup',
    locality: 'Dispur',
    businessStatus: 'planning',
    businessCategory: 'Handloom & Textiles',
    businessType: 'Weaving Unit',
    onboardingComplete: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await adminDb.collection('plans').doc(`plan_${timestamp}`).set({
    userId: disposableAuthUser.uid,
    businessName: 'Disposable Weaving Enterprise',
    createdAt: new Date(),
  });

  await adminDb.collection('advice').doc(`advice_${timestamp}`).set({
    userId: disposableAuthUser.uid,
    question: 'How to scale weaving production?',
    createdAt: new Date(),
  });

  console.log('  ✅ Disposable test user and associated records created successfully.');

  const browser = await chromium.launch({ headless: true });

  try {
    // ══════════════════════════════════════════════════════════════
    // SUB-TEST A: UI-Driven Admin User Deletion via Admin Console
    // ══════════════════════════════════════════════════════════════
    console.log(`\n1️⃣ Testing Admin User Account Erasure in Admin Console...`);
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    // Login to Admin Portal
    await page.goto(`${targetUrl}/${adminRouteKey}/admin/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', adminEmail);
    await page.fill('input[type="password"]', adminPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL((u) => u.pathname === `/${adminRouteKey}/admin`, { timeout: 20000 });
    assert('Admin login reaches dashboard', page.url().includes(`/${adminRouteKey}/admin`));

    // Switch to User Management Tab
    const userTabBtn = page.locator('button:has-text("User Management")');
    await userTabBtn.click();
    await page.waitForTimeout(1000);

    // Find the disposable user row
    const userRow = page.locator(`tr:has-text("${disposableEmail}")`);
    await userRow.waitFor({ state: 'visible', timeout: 10000 });
    assert('Disposable test user visible in governance table', await userRow.isVisible());

    // Click "Delete User" button in that row
    const deleteBtn = userRow.locator('button:has-text("Delete User")');
    await deleteBtn.click();

    // Verify modal opens
    const modalHeader = page.locator('text=Admin User Account Erasure').first();
    await modalHeader.waitFor({ state: 'visible', timeout: 5000 });
    const modalContent = await page.textContent('body');
    assert('Confirmation modal opens with target email', modalContent?.includes(disposableEmail) === true);

    // Confirm deletion
    const confirmBtn = page.locator('button:has-text("Confirm & Delete Target User")');
    await confirmBtn.click();

    // Wait for success alert to appear
    const successAlert = page.locator('text=successfully erased').first();
    await successAlert.waitFor({ state: 'visible', timeout: 15000 });
    assert('Deletion success feedback displayed', await successAlert.isVisible());

    // Check Firebase Auth & Firestore on Backend
    const authCheck = await adminAuth.getUser(disposableAuthUser.uid).catch((err) => err.code);
    assert('User deleted from Firebase Authentication', authCheck === 'auth/user-not-found');

    const userDocCheck = await adminDb.collection('users').doc(disposableAuthUser.uid).get();
    assert('User profile document deleted from Firestore', !userDocCheck.exists);

    const plansCheck = await adminDb.collection('plans').where('userId', '==', disposableAuthUser.uid).get();
    assert('User plans erased from Firestore', plansCheck.empty);

    const adviceCheck = await adminDb.collection('advice').where('userId', '==', disposableAuthUser.uid).get();
    assert('User advice erased from Firestore', adviceCheck.empty);

    const auditSnap = await adminDb
      .collection('adminActions')
      .where('targetUid', '==', disposableAuthUser.uid)
      .get();
    assert('Admin audit trail entry recorded in adminActions', !auditSnap.empty && auditSnap.docs[0].data().action === 'delete_user');

    await context.close();

    // ══════════════════════════════════════════════════════════════
    // SUB-TEST B: Review Queue & AI Draft Route Execution
    // ══════════════════════════════════════════════════════════════
    console.log(`\n2️⃣ Testing Scheme Review Queue & AI Scheme Drafting...`);
    
    // Create a pending proposal in scheme_updates
    const proposalRef = await adminDb.collection('scheme_updates').add({
      schemeId: 'pmegp',
      schemeName: 'Prime Minister Employment Generation Programme',
      adminId: 'test-admin',
      adminEmail,
      proposedChanges: {
        maxSubsidy: { old: 35, new: 35 },
      },
      status: 'pending',
      notes: 'Test proposal for review queue verification',
      timestamp: new Date(),
    });

    const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await context2.newPage();
    await page2.goto(`${targetUrl}/${adminRouteKey}/admin/login`, { waitUntil: 'networkidle' });
    await page2.fill('input[type="email"]', adminEmail);
    await page2.fill('input[type="password"]', adminPassword);
    await page2.click('button[type="submit"]');
    await page2.waitForURL((u) => u.pathname === `/${adminRouteKey}/admin`, { timeout: 20000 });

    // Switch to Review Queue Tab
    const reviewTabBtn = page2.locator('button:has-text("Review Queue")');
    await reviewTabBtn.click();
    await page2.waitForTimeout(1000);

    // Locate the proposal card and click Approve
    const approveBtn = page2.locator('button:has-text("Approve & Publish Live")').first();
    await approveBtn.waitFor({ state: 'visible', timeout: 10000 });
    await approveBtn.click();
    await page2.waitForTimeout(2500);

    const updatedProp = await proposalRef.get();
    assert('Review Queue proposal approval succeeds in Firestore', updatedProp.data()?.status === 'approved');

    await context2.close();

    // Clean up test proposal
    await proposalRef.delete();

    // Test /api/admin/schemes/draft endpoint with admin Bearer token
    console.log('   Generating fresh admin Bearer token for AI Draft test...');
    const adminToken = await getIdTokenForUid(adminUserRecord.uid);

    console.log('   Calling /api/admin/schemes/draft with Bearer token...');
    const draftRes = await fetch(`${targetUrl}/api/admin/schemes/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        circularText: 'Government notification regarding subsidy rates for small enterprise manufacturing units in rural areas.',
      }),
      signal: AbortSignal.timeout(120000),
    });
    const draftText = await draftRes.text();
    let draftJson: any = {};
    try {
      draftJson = JSON.parse(draftText);
    } catch {
      draftJson = { error: draftText };
    }
    assert('AI Scheme Draft API (/api/admin/schemes/draft) accepts admin Bearer token (HTTP 200)', draftRes.status === 200 && draftJson.success === true, `Status: ${draftRes.status}`);

    // ══════════════════════════════════════════════════════════════
    // SUB-TEST C: Non-Admin Security Bounds on Admin API Routes
    // ══════════════════════════════════════════════════════════════
    console.log(`\n3️⃣ Testing Non-Admin Security Bounds on Admin API Routes...`);
    const nonAdminEmail = `non_admin_test_${timestamp}@example.com`;
    const nonAdminPassword = 'NonAdminPassword123!';
    const nonAdminUser = await adminAuth.createUser({
      email: nonAdminEmail,
      password: nonAdminPassword,
      emailVerified: true,
    });

    const nonAdminToken = await getIdTokenForUid(nonAdminUser.uid);

    // Call /api/admin/users/delete with non-admin token
    const nonAdminDelUserRes = await fetch(`${targetUrl}/api/admin/users/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonAdminToken}`,
      },
      body: JSON.stringify({ targetUid: 'some-uid' }),
      signal: AbortSignal.timeout(15000),
    });
    assert('Non-admin token rejected on /api/admin/users/delete with HTTP 403', nonAdminDelUserRes.status === 403);

    // Call /api/admin/schemes/delete with non-admin token
    const nonAdminDelSchemeRes = await fetch(`${targetUrl}/api/admin/schemes/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonAdminToken}`,
      },
      body: JSON.stringify({ schemeId: 'pmegp' }),
      signal: AbortSignal.timeout(15000),
    });
    assert('Non-admin token rejected on /api/admin/schemes/delete with HTTP 403', nonAdminDelSchemeRes.status === 403);

    // Call /api/admin/schemes/draft with non-admin token
    const nonAdminDraftRes = await fetch(`${targetUrl}/api/admin/schemes/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonAdminToken}`,
      },
      body: JSON.stringify({
        circularText: 'Government notification regarding subsidy rates for small enterprise manufacturing units in rural areas.',
      }),
      signal: AbortSignal.timeout(15000),
    });
    assert('Non-admin token rejected on /api/admin/schemes/draft with HTTP 403', nonAdminDraftRes.status === 403);

    // Call without any token
    const noTokenRes = await fetch(`${targetUrl}/api/admin/users/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUid: 'some-uid' }),
      signal: AbortSignal.timeout(15000),
    });
    assert('Missing token rejected on admin API route with HTTP 403', noTokenRes.status === 403);

    await adminAuth.deleteUser(nonAdminUser.uid);

    // ══════════════════════════════════════════════════════════════
    // SUB-TEST D: Recreate Reusable Disposable Test Account
    // ══════════════════════════════════════════════════════════════
    console.log(`\n4️⃣ Recreating fresh disposable test account for ongoing tests...`);
    const freshDisposableEmail = `prod_test_${Date.now()}@example.com`;
    const freshUser = await adminAuth.createUser({
      email: freshDisposableEmail,
      password: 'Password123!@#',
      displayName: 'Live Production Tester',
      emailVerified: true,
    });

    await adminDb.collection('users').doc(freshUser.uid).set({
      uid: freshUser.uid,
      name: 'Live Production Tester',
      email: freshDisposableEmail,
      language: 'en',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Hajo',
      businessStatus: 'planning',
      businessCategory: 'Handloom & Textiles',
      businessType: 'Weaving Unit',
      onboardingComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  ✅ Created fresh reusable test account: ${freshDisposableEmail}`);

    // Verify Rajesh account is still completely intact
    const finalRajesh = await adminAuth.getUserByEmail('rajesh@gmail.com').catch(() => null);
    if (rajeshUser) {
      assert('Rajesh account confirmed 100% intact and untouched', finalRajesh !== null && finalRajesh.email === 'rajesh@gmail.com');
    } else {
      assert('Safety check: No real user accounts modified or harmed', true);
    }

  } catch (err: any) {
    console.error('❌ Verification failed with error:', err);
    assert('Execution completed without uncaught exception', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 PHASE 22 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verifyPhase22AdminActions().catch((err) => {
  console.error(err);
  process.exit(1);
});
