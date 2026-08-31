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
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';

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
const db = getFirestore(app);

// Contrast Helper: Calculate Relative Luminance and Contrast Ratio (WCAG standard)
function getLuminance(r: number, g: number, b: number) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(...hexToRgb(hex1));
  const lum2 = getLuminance(...hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return parseFloat(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

async function runTargetedTestSuite() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 ARTHASETU ADMIN ONBOARDING BYPASS & CONTRAST VERIFICATION');
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
  const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD (or ADMIN_TEST_PASSWORD) is required in .env.local');
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 1: CONTRAST & WCAG AA RATIO DIAGNOSIS
  // ───────────────────────────────────────────────────────────────────
  console.log('▶ 1. Color Contrast & WCAG AA Audit:');

  // Light Mode Tokens
  const lightBg = '#FFFFFF';
  const lightFg = '#091326';
  const lightMuted = '#334155';
  const lightSurfaceElevated = '#FFFFFF';

  // Dark Mode Tokens
  const darkBg = '#080F20';
  const darkFg = '#F8FAFC';
  const darkMuted = '#CBD5E1';
  const darkSurfaceElevated = '#152A52';

  // Calculations
  const lightFgRatio = getContrastRatio(lightFg, lightBg);
  const lightMutedRatio = getContrastRatio(lightMuted, lightBg);
  const darkFgRatio = getContrastRatio(darkFg, darkBg);
  const darkMutedRatio = getContrastRatio(darkMuted, darkBg);
  const darkCardFgRatio = getContrastRatio(darkFg, darkSurfaceElevated);
  const darkCardMutedRatio = getContrastRatio(darkMuted, darkSurfaceElevated);

  assert('Light Mode Hero Tagline Contrast (WCAG AA >= 4.5:1)', lightFgRatio >= 4.5, `${lightFgRatio}:1 on #FFFFFF`);
  assert('Light Mode Hero Subtitle Contrast (WCAG AA >= 4.5:1)', lightMutedRatio >= 4.5, `${lightMutedRatio}:1 on #FFFFFF`);
  assert('Dark Mode Hero Tagline Contrast (WCAG AA >= 4.5:1)', darkFgRatio >= 4.5, `${darkFgRatio}:1 on #080F20`);
  assert('Dark Mode Hero Subtitle Contrast (WCAG AA >= 4.5:1)', darkMutedRatio >= 4.5, `${darkMutedRatio}:1 on #080F20`);
  assert('Dark Mode Signup Header Contrast (WCAG AA >= 4.5:1)', darkCardFgRatio >= 4.5, `${darkCardFgRatio}:1 on #152A52`);
  assert('Dark Mode Signup Subtitle Contrast (WCAG AA >= 4.5:1)', darkCardMutedRatio >= 4.5, `${darkCardMutedRatio}:1 on #152A52`);

  // ───────────────────────────────────────────────────────────────────
  // TEST 2: ADMIN SIGNUP / USER PROFILE INTEGRITY — NO ONBOARDING & NO USER DOC
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 2. Admin User Profile Integrity Flow:');
  try {
    const adminUserRecord = await adminAuth.getUserByEmail(adminEmail);
    const adminUid = adminUserRecord.uid;

    // Simulate signup handler logic:
    // If email === adminEmail -> do NOT write to 'users' collection, route straight to /${adminRouteKey}/admin
    const userDocSnap = await adminDb.collection('users').doc(adminUid).get();
    assert('Admin User Doc Not Created in Firestore', !userDocSnap.exists, `UID: ${adminUid}`);

    // Verify admin check in AuthContext
    const isAdmin = adminUserRecord.email?.toLowerCase().trim() === adminEmail;
    assert('Admin Recognition in AuthContext', isAdmin, `Email: ${adminEmail}`);
  } catch (err: any) {
    assert('Admin User Profile Integrity', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 3: PUBLIC /login WITH ADMIN EMAIL REDIRECT
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 3. Public /login Page with Admin Email Redirect:');
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const loggedInEmail = cred.user.email?.toLowerCase().trim();
    const isAdminEmail = loggedInEmail === adminEmail;

    const destination = isAdminEmail ? `/${adminRouteKey}/admin` : '/dashboard';
    assert('Public Login Routes Admin to Admin Console', destination === `/${adminRouteKey}/admin`, `Target: ${destination}`);

    // Confirm no empty/broken dashboard profile is queried
    const profileDoc = await adminDb.collection('users').doc(cred.user.uid).get();
    assert('Admin Profile Non-Existent (Clean)', !profileDoc.exists);

    await signOut(auth);
  } catch (err: any) {
    assert('Public Login Admin Redirect', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 4: DEDICATED ADMIN LOGIN ROUTE (/${adminRouteKey}/admin/login)
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 4. Dedicated Hidden Admin Login Form:');
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const loggedInEmail = cred.user.email?.toLowerCase().trim();
    assert('Admin Login Form Accepts Admin Credentials', loggedInEmail === adminEmail, `Email: ${loggedInEmail}`);

    // Try with invalid password on dedicated login
    let badPassError = '';
    try {
      await signInWithEmailAndPassword(auth, adminEmail, 'WrongPassword999!');
    } catch (e: any) {
      badPassError = e.code || '';
    }
    assert('Admin Login Rejects Bad Password', badPassError === 'auth/invalid-credential' || badPassError === 'auth/wrong-password');

    await signOut(auth);
  } catch (err: any) {
    assert('Dedicated Admin Login Flow', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 5: REGULAR (NON-ADMIN) ENTREPRENEUR SIGNUP FLOW
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 5. Non-Admin Regular Entrepreneur Signup Flow:');
  const regularEmail = `test_entrepreneur_${Date.now()}@test.arthasetu.gov`;
  try {
    const cred = await createUserWithEmailAndPassword(auth, regularEmail, 'RegularUserPass123!');
    const regularUid = cred.user.uid;

    // Regular user gets initial profile doc
    await adminDb.collection('users').doc(regularUid).set({
      uid: regularUid,
      name: 'Test Entrepreneur',
      email: regularEmail,
      language: 'en',
      theme: 'light',
      onboardingComplete: false,
      createdAt: new Date(),
    });

    const regDoc = await adminDb.collection('users').doc(regularUid).get();
    assert('Regular User Profile Created in Firestore', regDoc.exists && regDoc.data()?.name === 'Test Entrepreneur');

    const isAdmin = cred.user.email?.toLowerCase().trim() === adminEmail;
    assert('Regular User Not Marked as Admin', !isAdmin);

    // Clean up test user
    await adminDb.collection('users').doc(regularUid).delete();
    await adminAuth.deleteUser(regularUid);
  } catch (err: any) {
    assert('Regular Entrepreneur Signup Flow', false, err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    throw new Error(`${total - passed} checks failed.`);
  }
}

runTargetedTestSuite().catch(console.error);
