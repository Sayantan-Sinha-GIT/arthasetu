/**
 * Phase 1 Integration Test Script
 * Tests Firebase Auth (Signup, Login, Logout, Password Reset) and Firestore User Profile Creation
 * against live Firebase backend using credentials in .env.local.
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { 
  getAuth as getClientAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as clientSignOut,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

import { initializeApp as initAdminApp, cert, getApps as getAdminApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

async function runTests() {
  console.log('🧪 Starting Phase 1 Integration & Firebase Verification Tests...\n');

  // 1. Initialize Client SDK
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  const clientAuth = getClientAuth(clientApp);
  const clientDb = getClientFirestore(clientApp);

  // 2. Initialize Admin SDK for cleanup
  let rawAdminKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawAdminKey) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
  }
  rawAdminKey = rawAdminKey.trim();
  if ((rawAdminKey.startsWith("'") && rawAdminKey.endsWith("'")) || (rawAdminKey.startsWith('"') && rawAdminKey.endsWith('"'))) {
    rawAdminKey = rawAdminKey.slice(1, -1);
  }
  const serviceAccount = JSON.parse(rawAdminKey) as ServiceAccount;
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(serviceAccount) }, 'admin-test') : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  const testName = 'Ramesh Kumar';

  let testUid = '';

  try {
    // TEST 1: SIGNUP
    console.log(`1️⃣ Testing Signup: Creating user (${testEmail})...`);
    const userCredential = await createUserWithEmailAndPassword(clientAuth, testEmail, testPassword);
    testUid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: testName });
    console.log(`   ✅ User created successfully! UID: ${testUid}`);

    // TEST 2: FIRESTORE PROFILE CREATION
    console.log('2️⃣ Testing Firestore Profile Document Creation...');
    const userDocRef = doc(clientDb, 'users', testUid);
    await setDoc(userDocRef, {
      uid: testUid,
      name: testName,
      email: testEmail,
      language: 'hi',
      theme: 'light',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Guwahati',
      pinCode: '781001',
      businessStatus: 'planning',
      businessCategory: 'Livestock',
      businessType: 'Poultry',
      businessExperience: '0-1 years',
      availableCapital: 80000,
      desiredFunding: 150000,
      monthlyIncome: 0,
      monthlyExpenses: 0,
      onboardingComplete: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('   ✅ Firestore document written successfully!');

    // TEST 3: FIRESTORE PROFILE READ
    console.log('3️⃣ Testing Firestore Profile Document Read...');
    const docSnap = await getDoc(userDocRef);
    if (!docSnap.exists()) {
      throw new Error('Firestore document was not found after write');
    }
    const data = docSnap.data();
    console.log(`   ✅ Profile fetched: ${data.name} | ${data.businessType} in ${data.state}, ${data.district}`);

    // TEST 4: LOGOUT
    console.log('4️⃣ Testing Logout...');
    await clientSignOut(clientAuth);
    console.log('   ✅ User signed out successfully!');

    // TEST 5: LOGIN
    console.log('5️⃣ Testing Login with credentials...');
    const loginCredential = await signInWithEmailAndPassword(clientAuth, testEmail, testPassword);
    console.log(`   ✅ Logged in successfully as: ${loginCredential.user.email}`);

    // TEST 6: FORGOT PASSWORD
    console.log('6️⃣ Testing Password Reset Email dispatch...');
    await sendPasswordResetEmail(clientAuth, testEmail);
    console.log('   ✅ Password reset email request processed successfully!');

    // TEST 7: ADMIN CUSTOM CLAIMS SETUP
    console.log('7️⃣ Testing Admin Role Custom Claims...');
    await adminAuth.setCustomUserClaims(testUid, { admin: true });
    const adminUserCheck = await adminAuth.getUser(testUid);
    if (adminUserCheck.customClaims?.admin === true) {
      console.log('   ✅ Custom claim { admin: true } verified on user token!');
    } else {
      throw new Error('Failed to set custom claim on user');
    }

    console.log('\n🎉 ALL 7 PHASE 1 INTEGRATION TESTS PASSED PERFECTLY!\n');
  } finally {
    // CLEANUP
    if (testUid) {
      console.log('🧹 Cleaning up test user and document...');
      try {
        await deleteDoc(doc(clientDb, 'users', testUid));
        await adminAuth.deleteUser(testUid);
        console.log('   ✅ Test user & data cleaned up.');
      } catch (cleanErr) {
        console.warn('   ⚠️ Cleanup warning:', cleanErr);
      }
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed with error:', err);
  process.exit(1);
});
