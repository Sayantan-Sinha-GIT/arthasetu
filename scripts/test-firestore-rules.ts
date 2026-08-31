import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getAuth as getClientAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

async function testSecurityRules() {
  console.log('🧪 Testing Live Firestore Security Rules Enforcement...\n');

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  console.log(`• Configured Admin Email (.env.local): "${adminEmail}"`);

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  const auth = getClientAuth(clientApp);
  const db = getClientFirestore(clientApp);

  // Initialize admin app for test user provisioning
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(sa) }) : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  // 1. TEST OLD ADMIN EMAIL (old-admin@example.com) -> SHOULD BE REJECTED WITH PERMISSION DENIED
  console.log('\n1️⃣ Testing Old Email (old-admin@example.com) -> MUST BE REJECTED...');
  const oldEmail = 'old-admin@example.com';
  const testPassword = 'SecurePassword123!';

  // Ensure user exists in Auth
  try {
    await adminAuth.createUser({ email: oldEmail, password: testPassword });
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      await adminAuth.updateUser((await adminAuth.getUserByEmail(oldEmail)).uid, { password: testPassword });
    }
  }

  await signInWithEmailAndPassword(auth, oldEmail, testPassword);
  console.log(`   • Logged in as old email: ${oldEmail}`);

  let oldEmailBlocked = false;
  try {
    await setDoc(doc(db, 'schemes', 'test-old-email-scheme'), {
      name: 'Old Email Test Scheme',
      shortName: 'OLD_TEST',
      category: 'Test',
      governmentLevel: 'central',
      description: 'Should be rejected',
    });
    console.log('   ❌ Security failure: Old email was able to write to /schemes!');
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission-denied') || err?.message?.includes('Missing or insufficient permissions')) {
      oldEmailBlocked = true;
      console.log(`   ✅ Correctly blocked: Old email received [${err.code}]: "${err.message}"`);
    } else {
      console.log('   ⚠️ Unexpected error:', err);
    }
  }

  if (!oldEmailBlocked) {
    throw new Error('Security failure: Old email was NOT blocked from writing to /schemes');
  }
  await signOut(auth);

  // 2. TEST RANDOM NON-ADMIN USER -> SHOULD BE REJECTED WITH PERMISSION DENIED
  console.log('\n2️⃣ Testing Random Non-Admin User -> MUST BE REJECTED...');
  const randomUserEmail = `random_user_${Date.now()}@example.com`;
  await createUserWithEmailAndPassword(auth, randomUserEmail, testPassword);
  console.log(`   • Logged in as regular user: ${randomUserEmail}`);

  let randomUserBlocked = false;
  try {
    await setDoc(doc(db, 'schemes', 'test-random-scheme'), {
      name: 'Random User Test Scheme',
      shortName: 'RAND_TEST',
      category: 'Test',
      governmentLevel: 'central',
      description: 'Should be rejected',
    });
    console.log('   ❌ Security failure: Random user was able to write to /schemes!');
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permission-denied') || err?.message?.includes('Missing or insufficient permissions')) {
      randomUserBlocked = true;
      console.log(`   ✅ Correctly blocked: Regular user received [${err.code}]: "${err.message}"`);
    } else {
      console.log('   ⚠️ Unexpected error:', err);
    }
  }

  if (!randomUserBlocked) {
    throw new Error('Security failure: Random user was NOT blocked from writing to /schemes');
  }
  await signOut(auth);

  // 3. TEST NEW ADMIN EMAIL (sayantansinha2005@gmail.com) -> MUST BE ALLOWED TO WRITE
  console.log(`\n3️⃣ Testing New Admin Email (${adminEmail}) -> MUST BE ALLOWED...`);
  const newAdminEmail = adminEmail!;
  const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD (or ADMIN_TEST_PASSWORD) is required in .env.local');
  }

  await signInWithEmailAndPassword(auth, newAdminEmail, adminPassword);
  console.log(`   • Logged in as new admin: ${newAdminEmail}`);

  let newAdminSucceeded = false;
  const adminTestDocRef = doc(db, 'schemes', 'test-new-admin-verified-scheme');
  try {
    await setDoc(adminTestDocRef, {
      id: 'test-new-admin-verified-scheme',
      name: 'New Admin Security Verification Scheme',
      shortName: 'ADMIN_VERIFIED',
      category: 'Administration',
      governmentLevel: 'central',
      description: 'Verified live write access by new admin',
      targetBusinessTypes: ['All'],
      targetBeneficiaries: ['All'],
      eligibility: { otherConditions: [] },
      benefits: { maxSubsidyPercent: 0 },
      requiredDocuments: [],
      applicationProcess: 'Test',
      officialUrl: 'https://arthasetu.gov.in',
      sourceName: 'Admin System',
      lastVerifiedDate: '2026-08-29',
      isActive: true,
    });
    newAdminSucceeded = true;
    console.log('   ✅ Write permitted: New admin successfully wrote verified document to /schemes!');
  } catch (err: any) {
    console.log('   ❌ Error: New admin write was rejected:', err);
  }

  if (!newAdminSucceeded) {
    throw new Error('Security failure: New admin was unable to write to /schemes');
  }

  // Cleanup test scheme
  try {
    await deleteDoc(adminTestDocRef);
    console.log('   🧹 Deleted test document from /schemes.');
  } catch {}

  await signOut(auth);

  // 4. TEST PUBLIC READ ON /schemes -> MUST REMAIN ACCESSIBLE
  console.log('\n4️⃣ Testing Public Read Access on /schemes...');
  const pmegpDoc = await getDoc(doc(db, 'schemes', 'central-pmegp'));
  if (pmegpDoc.exists()) {
    console.log(`   ✅ Public read verified: fetched "${pmegpDoc.data()?.shortName}"`);
  } else {
    throw new Error('Public read failed on /schemes');
  }

  console.log('\n🎉 ALL 4 FIRESTORE SECURITY RULES TESTS PASSED WITH 100% PRECISION!');
}

testSecurityRules().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
