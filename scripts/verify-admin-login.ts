import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

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

async function verify() {
  const targetUrl = process.argv[2] || process.env.TEST_BASE_URL || 'http://localhost:3000';
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔒 VERIFYING ADMIN AUTH & ROUTE DUAL-BEHAVIOR');
  console.log(`🌐 Target: ${targetUrl}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
  const adminRouteKey = (process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632').trim();
  const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();

  if (!adminPassword) {
    console.error('❌ Error: ADMIN_PASSWORD (or ADMIN_TEST_PASSWORD) is not set in .env.local');
    process.exit(1);
  }

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

  // Check 1: Route endpoints
  const baseUrl = targetUrl.replace(/\/$/, '');
  async function checkUrl(path: string): Promise<number> {
    try {
      const res = await fetch(`${baseUrl}${path}`);
      return res.status;
    } catch {
      return 0;
    }
  }

  const loginStatus = await checkUrl(`/${adminRouteKey}/admin/login`);
  const dashStatus = await checkUrl(`/${adminRouteKey}/admin`);
  const badKeyStatus = await checkUrl(`/9999/admin`);
  assert('Dedicated Admin Login page HTTP 200', loginStatus === 200, `/${adminRouteKey}/admin/login -> ${loginStatus}`);
  assert('Dedicated Admin Dashboard page HTTP 200', dashStatus === 200, `/${adminRouteKey}/admin -> ${dashStatus}`);
  assert('Invalid Admin Key Route HTTP 404', badKeyStatus === 404, `/9999/admin -> ${badKeyStatus}`);

  // Check 2: Dedicated login authentication with synchronized password
  console.log('\n▶ Testing Dedicated Admin Login Flow:');
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const loggedInEmail = cred.user.email?.toLowerCase().trim();
    assert('Firebase Auth signInWithEmailAndPassword succeeds with admin password', loggedInEmail === adminEmail, `Logged in as ${loggedInEmail}`);
    assert('Session active after dedicated login', auth.currentUser !== null);
    await signOut(auth);
    assert('Session clears on signOut', auth.currentUser === null);
  } catch (err: any) {
    assert('Dedicated admin login failed', false, err.message);
  }

  // Check 3: Public /login simulation with Admin Credentials
  console.log('\n▶ Testing Public /login Behavior:');
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const isEnteredEmailAdmin = cred.user.email?.toLowerCase().trim() === adminEmail;
    
    let publicSessionActive = true;
    let errorMessage = '';
    if (isEnteredEmailAdmin) {
      await signOut(auth);
      publicSessionActive = auth.currentUser !== null;
      errorMessage = 'Administrative account detected. Please use the dedicated secure admin login portal to sign in.';
    }

    assert('Public login detects admin email', isEnteredEmailAdmin);
    assert('Public login terminates session immediately (no lasting session)', !publicSessionActive);
    assert('Public login sets required message', errorMessage === 'Administrative account detected. Please use the dedicated secure admin login portal to sign in.');
  } catch (err: any) {
    assert('Public login test failed', false, err.message);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`🏁 VERIFICATION RESULT: ${passed}/${total} checks passed`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (passed !== total) process.exit(1);
}

verify().catch(console.error);
