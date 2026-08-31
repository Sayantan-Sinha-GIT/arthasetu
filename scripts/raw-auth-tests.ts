export {};

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

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

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
const ADMIN_ROUTE_KEY = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';
const PASSWORD = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();

if (!PASSWORD) {
  console.error('❌ Error: ADMIN_PASSWORD (or ADMIN_TEST_PASSWORD) is not set in .env.local');
  process.exit(1);
}

async function runRawTests() {
  console.log('----------------------------------------------------------------------');
  console.log('>>> EXECUTING TEST 5: Public /login Form Submission with Admin Email');
  console.log('----------------------------------------------------------------------');
  
  // Step 1: Simulate public /login page form submission handler
  const publicEmailInput = 'sayantansinha2005@gmail.com';
  const publicPasswordInput = PASSWORD;
  
  console.log(`[Form Submission] Target: /login`);
  console.log(`[Form Submission] Form Input Email: "${publicEmailInput}"`);
  console.log(`[Form Submission] Form Input Password: "[REDACTED (${publicPasswordInput.length} chars)]"`);

  let publicError = '';
  let publicRedirectTarget = '';

  try {
    const cred = await signInWithEmailAndPassword(auth, publicEmailInput, publicPasswordInput);
    console.log(`[Firebase Auth Response] Authenticated UID: "${cred.user.uid}"`);
    console.log(`[Firebase Auth Response] Authenticated Email: "${cred.user.email}"`);

    // Exact logic from src/app/(auth)/login/page.tsx
    const configuredAdminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
    const isEmailAdmin = publicEmailInput.trim().toLowerCase() === configuredAdminEmail;
    console.log(`[Public Login Page Check] Is admin email? -> ${isEmailAdmin}`);

    if (isEmailAdmin) {
      console.log(`[Public Login Action] Administrative account detected. Calling signOut(auth)...`);
      await signOut(auth);
      publicError = 'Administrative account detected. Please use the dedicated secure admin login portal to sign in.';
      console.log(`[Public Login Action] Session cleared. Current user: ${auth.currentUser}`);
      console.log(`[Public Login UI State] Error Message displayed on screen: "${publicError}"`);
      console.log(`[Public Login Navigation] Redirect to /dashboard BLOCKED: Yes`);
    } else {
      publicRedirectTarget = '/dashboard';
      console.log(`[Public Login Navigation] Redirect Target: "${publicRedirectTarget}"`);
    }
  } catch (err: any) {
    publicError = err.message;
    console.error(`[Public Login Error]`, err.message);
  }

  console.log('\n----------------------------------------------------------------------');
  console.log('>>> EXECUTING TEST 6: Dedicated /4632/admin/login Form Submission');
  console.log('----------------------------------------------------------------------');

  const adminEmailInput = 'sayantansinha2005@gmail.com';
  const adminPasswordInput = PASSWORD;

  console.log(`[Form Submission] Target: /${ADMIN_ROUTE_KEY}/admin/login`);
  console.log(`[Form Submission] Form Input Email: "${adminEmailInput}"`);
  console.log(`[Form Submission] Form Input Password: "[REDACTED (${adminPasswordInput.length} chars)]"`);

  let adminError = '';
  let adminRedirectTarget = '';

  try {
    const credential = await signInWithEmailAndPassword(auth, adminEmailInput, adminPasswordInput);
    console.log(`[Firebase Auth Response] Authenticated UID: "${credential.user.uid}"`);
    console.log(`[Firebase Auth Response] Authenticated Email: "${credential.user.email}"`);

    // Retrieve Token & Claims
    const tokenResult = await credential.user.getIdTokenResult();
    console.log(`[Firebase ID Token Claims] Custom Claims:`, JSON.stringify(tokenResult.claims, null, 2));

    // Exact logic from src/components/admin/AdminLoginForm.tsx
    const loggedInEmail = credential.user.email?.toLowerCase().trim();
    const expectedEmail = ADMIN_EMAIL;

    if (!expectedEmail || loggedInEmail !== expectedEmail) {
      await signOut(auth);
      adminError = 'Access Denied: Email does not match configured admin credentials.';
      console.log(`[Admin Login Page Check] Access Denied: mismatch.`);
    } else {
      adminRedirectTarget = `/${ADMIN_ROUTE_KEY}/admin`;
      console.log(`[Admin Login UI State] Error Message: None (Clean)`);
      console.log(`[Admin Login State] Active Auth Session UID: "${auth.currentUser?.uid}"`);
      console.log(`[Admin Login Navigation] Redirecting router.push -> "${adminRedirectTarget}"`);

      // Check HTTP accessibility of redirect target
      const res = await fetch(`http://localhost:3000${adminRedirectTarget}`);
      console.log(`[Server Check] Fetching "${adminRedirectTarget}" on Next.js server -> HTTP Status: ${res.status} ${res.statusText}`);
    }

    await signOut(auth);
  } catch (err: any) {
    adminError = err.message;
    console.error(`[Admin Login Error]`, err.message);
  }

  console.log('----------------------------------------------------------------------\n');
}

runRawTests().catch(console.error);
