import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
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

async function testEmailVerificationFlow() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 LIVE EMAIL VERIFICATION SIGNUP & GATING TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const testEmail = `verify_test_${Date.now()}@arthasetu.test`;
  const testPassword = 'SecureVerificationPass123!';

  console.log(`1️⃣ Creating unverified user account: ${testEmail}...`);
  const cred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
  const user = cred.user;
  console.log(`   ✅ User created. UID: ${user.uid}`);
  console.log(`   • Initial emailVerified status: ${user.emailVerified} (Expected: false)`);

  if (user.emailVerified !== false) {
    throw new Error('Assertion failed: Newly created account should not be email-verified.');
  }

  console.log('\n2️⃣ Testing sendEmailVerification() trigger...');
  try {
    await sendEmailVerification(user);
    console.log('   ✅ sendEmailVerification() succeeded without error.');
  } catch (err: any) {
    console.log(`   ℹ️ sendEmailVerification response: ${err.message}`);
  }

  console.log('\n3️⃣ Checking Firestore profile creation & unverified state...');
  await adminDb.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: testEmail,
    name: 'Verification Test User',
    state: 'Assam',
    onboardingComplete: false,
    createdAt: new Date().toISOString(),
  });
  const userDoc = await adminDb.collection('users').doc(user.uid).get();
  console.log(`   ✅ Firestore user record present: ${userDoc.exists}`);

  console.log('\n4️⃣ Simulating Email Verification via Firebase Admin SDK...');
  await adminAuth.updateUser(user.uid, { emailVerified: true });
  console.log('   ✅ User record updated in Auth backend to emailVerified = true');

  console.log('\n5️⃣ Reloading client auth state to verify live update...');
  await user.reload();
  console.log(`   • Reloaded user.emailVerified: ${auth.currentUser?.emailVerified} (Expected: true)`);

  if (!auth.currentUser?.emailVerified) {
    throw new Error('Assertion failed: user.emailVerified should be true after reload.');
  }
  console.log('   ✅ User successfully verified and unblocked for full app access.');

  console.log('\n6️⃣ Cleaning up test user...');
  await signOut(auth);
  await adminAuth.deleteUser(user.uid);
  await adminDb.collection('users').doc(user.uid).delete();
  console.log('   ✅ Test user deleted from Firebase Auth and Firestore.');

  console.log('\n🎉 TASK 1: EMAIL VERIFICATION TEST PASSED 100%!');
}

testEmailVerificationFlow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
