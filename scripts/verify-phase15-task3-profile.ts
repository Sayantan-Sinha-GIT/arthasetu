import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getAuth as getClientAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { adminAuth, adminDb } from '../src/lib/firebase-admin';
import { createUserProfile, updateUserProfile, getUserProfile } from '../src/lib/firestore/users';

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

async function verifyTask3ProfileIntegrity() {
  console.log('============================================================');
  console.log('🧪 TASK 3 VERIFICATION — PROFILE INTEGRITY & COMPLETENESS');
  console.log('============================================================\n');

  const timestamp = Date.now();
  const testEmail = `phase15_task3_${timestamp}@example.com`;
  const testPassword = 'Password123!@#';

  let testUid = '';

  try {
    console.log('1️⃣ Creating test user via Admin SDK...');
    const userRecord = await adminAuth.createUser({
      email: testEmail,
      password: testPassword,
      displayName: 'Task3 Test User',
      emailVerified: true,
    });
    testUid = userRecord.uid;
    console.log(`   ✅ Created test user: ${testEmail} (UID: ${testUid})`);

    // Sign in to client SDK to establish auth context for Firestore security rules
    await signInWithEmailAndPassword(clientAuth, testEmail, testPassword);
    console.log('   ✅ Client SDK authenticated.');

    // TEST 1: Attempt to write profile with empty name and onboardingComplete: true
    console.log('\n2️⃣ TEST 1: Attempting createUserProfile with EMPTY NAME and onboardingComplete: true...');
    await createUserProfile({
      uid: testUid,
      email: testEmail,
      name: '',
      state: 'Assam',
      district: 'Kamrup',
      locality: 'Guwahati',
      onboardingComplete: true,
    });

    let doc = await getUserProfile(testUid);
    console.log(`   • Resulting onboardingComplete in Firestore: ${doc?.onboardingComplete} (Expected: false)`);
    if (doc?.onboardingComplete !== false) {
      throw new Error('FAILED: Profile with empty name was marked onboardingComplete: true!');
    }
    console.log('   ✅ Rejected: Empty name prevented onboardingComplete: true.');

    // TEST 2: Attempt to write profile with empty state and onboardingComplete: true
    console.log('\n3️⃣ TEST 2: Attempting createUserProfile with EMPTY STATE and onboardingComplete: true...');
    await createUserProfile({
      uid: testUid,
      email: testEmail,
      name: 'Ramesh Kumar',
      state: '',
      district: 'Kamrup',
      locality: 'Guwahati',
      onboardingComplete: true,
    });

    doc = await getUserProfile(testUid);
    console.log(`   • Resulting onboardingComplete in Firestore: ${doc?.onboardingComplete} (Expected: false)`);
    if (doc?.onboardingComplete !== false) {
      throw new Error('FAILED: Profile with empty state was marked onboardingComplete: true!');
    }
    console.log('   ✅ Rejected: Empty state prevented onboardingComplete: true.');

    // TEST 3: Attempt to write profile with empty district and onboardingComplete: true
    console.log('\n4️⃣ TEST 3: Attempting createUserProfile with EMPTY DISTRICT and onboardingComplete: true...');
    await createUserProfile({
      uid: testUid,
      email: testEmail,
      name: 'Ramesh Kumar',
      state: 'Assam',
      district: '',
      locality: 'Guwahati',
      onboardingComplete: true,
    });

    doc = await getUserProfile(testUid);
    console.log(`   • Resulting onboardingComplete in Firestore: ${doc?.onboardingComplete} (Expected: false)`);
    if (doc?.onboardingComplete !== false) {
      throw new Error('FAILED: Profile with empty district was marked onboardingComplete: true!');
    }
    console.log('   ✅ Rejected: Empty district prevented onboardingComplete: true.');

    // TEST 4: Attempt updateUserProfile with incomplete fields and onboardingComplete: true
    console.log('\n5️⃣ TEST 4: Attempting updateUserProfile with incomplete data and onboardingComplete: true...');
    await updateUserProfile(testUid, {
      name: '',
      onboardingComplete: true,
    });

    doc = await getUserProfile(testUid);
    console.log(`   • Resulting onboardingComplete after updateUserProfile: ${doc?.onboardingComplete} (Expected: false)`);
    if (doc?.onboardingComplete !== false) {
      throw new Error('FAILED: updateUserProfile allowed incomplete profile to be onboardingComplete: true!');
    }
    console.log('   ✅ Rejected: updateUserProfile enforced non-empty name, state, district.');

    // TEST 5: Create valid complete profile and confirm onboardingComplete: true succeeds
    console.log('\n6️⃣ TEST 5: Creating VALID complete profile (name, state, district filled)...');
    await createUserProfile({
      uid: testUid,
      email: testEmail,
      name: 'Ramesh Kumar',
      state: 'Chhattisgarh',
      district: 'Dhamtari',
      locality: 'Test Village',
      pinCode: '767437',
      businessCategory: 'Agriculture & Allied',
      businessType: 'Dairy and Vegetable Farming Unit',
      onboardingComplete: true,
    });

    doc = await getUserProfile(testUid);
    console.log(`   • Resulting Firestore Profile:`);
    console.log(`     - Name: "${doc?.name}"`);
    console.log(`     - State: "${doc?.state}"`);
    console.log(`     - District: "${doc?.district}"`);
    console.log(`     - Locality: "${doc?.locality}"`);
    console.log(`     - OnboardingComplete: ${doc?.onboardingComplete}`);

    if (doc?.onboardingComplete !== true || doc?.district !== 'Dhamtari') {
      throw new Error('FAILED: Valid profile failed to save with onboardingComplete: true!');
    }
    console.log('   ✅ Succeeded: Valid complete profile successfully stored with onboardingComplete: true.');

    console.log('\n🎉 ALL TASK 3 PROFILE INTEGRITY SERVER-SIDE CHECKS PASSED WITH REAL LIVE OUTPUT!');
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

verifyTask3ProfileIntegrity().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
