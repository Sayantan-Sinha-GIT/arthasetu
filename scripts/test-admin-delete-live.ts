import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, addDoc, getDoc } from 'firebase/firestore';
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

async function testAdminDeleteLive() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 LIVE END-TO-END ADMIN USER DELETION VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.ADMIN_TEST_PASSWORD || '';

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: Missing NEXT_PUBLIC_ADMIN_EMAIL or ADMIN_TEST_PASSWORD in .env.local');
    process.exit(1);
  }

  // 1. Sign in as admin to get a real ID token via Admin SDK
  console.log(`1️⃣ Authenticating as Admin (${adminEmail})...`);
  const adminUserRecord = await adminAuth.getUserByEmail(adminEmail);
  const customToken = await adminAuth.createCustomToken(adminUserRecord.uid);
  const { signInWithCustomToken } = await import('firebase/auth');
  const adminCred = await signInWithCustomToken(auth, customToken);
  const adminToken = await adminCred.user.getIdToken(true);
  console.log(`   ✅ Admin ID token obtained for UID: ${adminUserRecord.uid}`);

  // 2. Create a sacrificial test user
  const victimEmail = `victim_user_${Date.now()}@arthasetu.test`;
  const victimPassword = 'SecureVictimPassword123!';
  console.log(`\n2️⃣ Creating sacrificial test user (${victimEmail})...`);
  const victimCred = await createUserWithEmailAndPassword(auth, victimEmail, victimPassword);
  const victimUid = victimCred.user.uid;
  console.log(`   ✅ Test user created with UID: ${victimUid}`);

  // 3. Populate Firestore user document, plans, and advice
  console.log('\n3️⃣ Populating Firestore documents (user profile, plan, advice)...');
  await setDoc(doc(db, 'users', victimUid), {
    uid: victimUid,
    email: victimEmail,
    name: 'Temporary User',
    state: 'Assam',
    district: 'Kamrup',
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  });

  await addDoc(collection(db, 'plans'), {
    userId: victimUid,
    businessName: 'Temporary Poultry Business',
    totalCapex: 100000,
    createdAt: new Date().toISOString(),
  });

  await addDoc(collection(db, 'advice'), {
    userId: victimUid,
    query: 'How to apply for PMEGP?',
    response: 'Here is guidance...',
    createdAt: new Date().toISOString(),
  });

  // Verify records exist before delete
  const userDocBefore = await adminDb.collection('users').doc(victimUid).get();
  const plansBefore = await adminDb.collection('plans').where('userId', '==', victimUid).get();
  const adviceBefore = await adminDb.collection('advice').where('userId', '==', victimUid).get();
  console.log(`   ✅ Confirmed in Firestore: UserDoc=${userDocBefore.exists}, Plans=${plansBefore.size}, Advice=${adviceBefore.size}`);

  // 4. Hit /api/admin/users/delete with the admin token
  console.log('\n4️⃣ Calling POST /api/admin/users/delete with Admin Bearer Token...');
  const res = await fetch('http://localhost:3000/api/admin/users/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      targetUid: victimUid,
      targetEmail: victimEmail,
    }),
  });

  const responseJson = await res.json();
  console.log(`   HTTP Status: ${res.status}`);
  console.log(`   Response Body:`, JSON.stringify(responseJson, null, 2));

  if (res.status !== 200 || !responseJson.success) {
    throw new Error(`Admin delete API failed: status=${res.status}, error=${responseJson.error}`);
  }
  console.log('   ✅ API responded 200 OK with success: true.');

  // 5. Verify erasure in Firestore and Auth
  console.log('\n5️⃣ Verifying complete deletion across Firestore and Firebase Auth...');
  const userDocAfter = await adminDb.collection('users').doc(victimUid).get();
  const plansAfter = await adminDb.collection('plans').where('userId', '==', victimUid).get();
  const adviceAfter = await adminDb.collection('advice').where('userId', '==', victimUid).get();

  let authUserFound = false;
  try {
    await adminAuth.getUser(victimUid);
    authUserFound = true;
  } catch {
    authUserFound = false;
  }

  // 6. Check adminActions audit log
  const auditSnap = await adminDb
    .collection('adminActions')
    .where('targetUid', '==', victimUid)
    .where('action', '==', 'delete_user')
    .get();

  console.log(`   • Firestore User Doc deleted: ${!userDocAfter.exists} (Expected: true)`);
  console.log(`   • Firestore Plans remaining: ${plansAfter.size} (Expected: 0)`);
  console.log(`   • Firestore Advice remaining: ${adviceAfter.size} (Expected: 0)`);
  console.log(`   • Auth User remaining: ${authUserFound} (Expected: false)`);
  console.log(`   • Audit log written to adminActions: ${auditSnap.size >= 1} (Expected: true)`);

  if (userDocAfter.exists || plansAfter.size > 0 || adviceAfter.size > 0 || authUserFound || auditSnap.size === 0) {
    throw new Error('Verification assertion failed on deleted records or missing audit log!');
  }

  console.log('\n🎉 ADMIN USER DELETION END-TO-END TEST PASSED 100%!');
}

testAdminDeleteLive().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
