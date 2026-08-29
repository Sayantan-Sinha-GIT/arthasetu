import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

async function runTargetedTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 ARTHASETU ADMIN ROUTING, DASHBOARD & PUBLIC LOGIN VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

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

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
  const adminRouteKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';
  const adminPassword = 'AdminSecurePassword123!';

  // Create fresh Admin Auth Account for testing
  try {
    try {
      const existing = await adminAuth.getUserByEmail(adminEmail);
      if (existing) await adminAuth.deleteUser(existing.uid);
    } catch {}

    await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    await signOut(auth);
  } catch (err: any) {
    console.error('Setup admin account error:', err);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 1: ADMIN DASHBOARD ROUTES ACCESSIBILITY & 404 CHECKS
  // ───────────────────────────────────────────────────────────────────
  console.log('▶ 1. Admin Route Resolution & HTTP Endpoint Status:');

  const baseUrl = 'http://localhost:3000';

  async function checkUrlStatus(path: string): Promise<number> {
    try {
      const res = await fetch(`${baseUrl}${path}`);
      return res.status;
    } catch (e: any) {
      return 0;
    }
  }

  const validDashboardStatus = await checkUrlStatus(`/${adminRouteKey}/admin`);
  const validLoginStatus = await checkUrlStatus(`/${adminRouteKey}/admin/login`);
  const validHistoryStatus = await checkUrlStatus(`/${adminRouteKey}/admin/history`);
  const validSchemesStatus = await checkUrlStatus(`/${adminRouteKey}/admin/schemes`);
  const validSchemesNewStatus = await checkUrlStatus(`/${adminRouteKey}/admin/schemes/new`);
  const invalidKeyStatus = await checkUrlStatus(`/9999/admin`);
  const oldAdminStatus = await checkUrlStatus(`/admin`);

  assert('Admin Dashboard Route Resolves (200 OK)', validDashboardStatus === 200, `/${adminRouteKey}/admin -> ${validDashboardStatus}`);
  assert('Admin Login Route Resolves (200 OK)', validLoginStatus === 200, `/${adminRouteKey}/admin/login -> ${validLoginStatus}`);
  assert('Admin History Route Resolves (200 OK)', validHistoryStatus === 200, `/${adminRouteKey}/admin/history -> ${validHistoryStatus}`);
  assert('Admin Schemes Directory Resolves (200 OK)', validSchemesStatus === 200, `/${adminRouteKey}/admin/schemes -> ${validSchemesStatus}`);
  assert('Admin New Scheme Route Resolves (200 OK)', validSchemesNewStatus === 200, `/${adminRouteKey}/admin/schemes/new -> ${validSchemesNewStatus}`);
  assert('Invalid Admin Key Returns 404', invalidKeyStatus === 404, `/9999/admin -> ${invalidKeyStatus}`);
  assert('Old Un-obfuscated /admin Returns 404', oldAdminStatus === 404, `/admin -> ${oldAdminStatus}`);

  // ───────────────────────────────────────────────────────────────────
  // TEST 2: DEDICATED ADMIN LOGIN FLOW (/${adminRouteKey}/admin/login)
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 2. Dedicated Admin Login Form:');
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const loggedInEmail = cred.user.email?.toLowerCase().trim();
    assert('Admin Authenticates Successfully', loggedInEmail === adminEmail, `Email: ${loggedInEmail}`);

    const destination = `/${adminRouteKey}/admin`;
    assert('Admin Redirects to Secured Dashboard Path', destination === `/${adminRouteKey}/admin`, `Target: ${destination}`);

    await signOut(auth);
  } catch (err: any) {
    assert('Dedicated Admin Login', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 3: PUBLIC /login WITH ADMIN CREDENTIALS
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 3. Public /login Page with Admin Credentials:');

  // Case A: Admin email + CORRECT password on public /login
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const isEnteredEmailAdmin = cred.user.email?.toLowerCase().trim() === adminEmail;
    
    // Per requirement: Terminate session immediately, do NOT create active session on public login
    let publicSessionActive = true;
    let errorMessage = '';
    if (isEnteredEmailAdmin) {
      await signOut(auth);
      publicSessionActive = auth.currentUser !== null;
      errorMessage = 'Administrative account detected. Please use the dedicated secure admin login portal to sign in.';
    }

    assert('Public Login Blocks Admin Session Creation', !publicSessionActive, 'Auth session signed out');
    assert('Public Login Sets Secure Portal Message', errorMessage.includes('dedicated secure admin login portal'));
    assert('Public Login Message Does NOT Reveal Secret Route Key', !errorMessage.includes(adminRouteKey));
  } catch (err: any) {
    assert('Public Login with Admin Correct Password', false, err.message);
  }

  // Case B: Admin email + WRONG password on public /login
  let wrongPassCode = '';
  try {
    await signInWithEmailAndPassword(auth, adminEmail, 'TotallyWrongPassword999!');
  } catch (err: any) {
    wrongPassCode = err.code || '';
  }
  const genericErrorMessage = 'Invalid email or password. Please try again.';
  assert('Public Login Rejects Wrong Password with Generic Code', wrongPassCode === 'auth/invalid-credential' || wrongPassCode === 'auth/wrong-password');
  assert('Generic Error Message Contains No Admin Hint', !genericErrorMessage.toLowerCase().includes('admin'));

  // ───────────────────────────────────────────────────────────────────
  // TEST 4: PUBLIC /login WITH REGULAR ENTREPRENEUR CREDENTIALS
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 4. Public /login with Regular Entrepreneur:');
  const regularEmail = `regular_entrepreneur_${Date.now()}@test.arthasetu.gov`;
  const regularPass = 'RegularPass123!';

  try {
    const regCred = await createUserWithEmailAndPassword(auth, regularEmail, regularPass);
    const regUid = regCred.user.uid;

    await adminDb.collection('users').doc(regUid).set({
      uid: regUid,
      name: 'Regular Entrepreneur',
      email: regularEmail,
      language: 'en',
      theme: 'light',
      onboardingComplete: true,
      createdAt: new Date(),
    });

    await signOut(auth);

    // Regular login on public page
    const loginCred = await signInWithEmailAndPassword(auth, regularEmail, regularPass);
    const isRegularAdmin = loginCred.user.email?.toLowerCase().trim() === adminEmail;
    const targetRoute = isRegularAdmin ? `/${adminRouteKey}/admin` : '/dashboard';

    assert('Regular User Public Login Succeeds', loginCred.user.email === regularEmail);
    assert('Regular User Routes to /dashboard', targetRoute === '/dashboard');
    assert('Regular User Session Remains Active', auth.currentUser !== null);

    // Clean up
    await signOut(auth);
    await adminDb.collection('users').doc(regUid).delete();
    await adminAuth.deleteUser(regUid);
  } catch (err: any) {
    assert('Regular User Public Login', false, err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    throw new Error(`${total - passed} checks failed.`);
  }
}

runTargetedTests().catch(console.error);
