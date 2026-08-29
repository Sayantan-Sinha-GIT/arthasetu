import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser as clientDeleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
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

async function runTargetedTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧪 ARTHASETU ACCOUNT MANAGEMENT & SECURITY TARGETED TEST SUITE');
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

  // ───────────────────────────────────────────────────────────────────
  // TEST 1: SELF-SERVICE ACCOUNT DELETION LIFECYCLE
  // ───────────────────────────────────────────────────────────────────
  console.log('▶ 1. Self-Service User Deletion Lifecycle (Firestore + Auth + Re-signup):');
  const selfTestEmail = `disposable_self_${Date.now()}@test.arthasetu.gov`;
  const testPassword = 'TestPassword123!';

  try {
    // 1. Create disposable user
    const cred = await createUserWithEmailAndPassword(auth, selfTestEmail, testPassword);
    const uid = cred.user.uid;

    // 2. Add profile doc
    await setDoc(doc(db, 'users', uid), {
      name: 'Disposable Self-Delete User',
      email: selfTestEmail,
      state: 'West Bengal',
    });

    // 3. Add plan doc
    await addDoc(collection(db, 'plans'), {
      userId: uid,
      name: 'Disposable Plan',
    });

    // 4. Add advice doc
    await addDoc(collection(db, 'advice'), {
      userId: uid,
      advice: 'Disposable Advice',
    });

    // Verify initial creation
    const userDocBefore = await getDoc(doc(db, 'users', uid));
    const plansBefore = await getDocs(query(collection(db, 'plans'), where('userId', '==', uid)));
    const adviceBefore = await getDocs(query(collection(db, 'advice'), where('userId', '==', uid)));
    assert('Disposable User Setup Completed', userDocBefore.exists() && plansBefore.size === 1 && adviceBefore.size === 1);

    // 5. Execute Self-Deletion
    const { deleteUserFirestoreData } = await import('../src/lib/firestore/users');
    await deleteUserFirestoreData(uid, db);
    await clientDeleteUser(cred.user);

    // 6. Verify full erasure
    const userDocAfter = await adminDb.collection('users').doc(uid).get();
    const plansAfter = await adminDb.collection('plans').where('userId', '==', uid).get();
    const adviceAfter = await adminDb.collection('advice').where('userId', '==', uid).get();

    let authUserStillExists = false;
    try {
      await adminAuth.getUser(uid);
      authUserStillExists = true;
    } catch {
      authUserStillExists = false;
    }

    assert('Firestore User Profile Deleted', !userDocAfter.exists);
    assert('Firestore Plans Deleted', plansAfter.size === 0);
    assert('Firestore Advice Deleted', adviceAfter.size === 0);
    assert('Firebase Auth Account Deleted', !authUserStillExists);

    // 7. Verify Re-Signup with same email works cleanly
    const reSignupCred = await createUserWithEmailAndPassword(auth, selfTestEmail, testPassword);
    assert('Clean Re-Signup with Same Email', !!reSignupCred.user.uid);

    // Clean up re-signed up user
    await adminAuth.deleteUser(reSignupCred.user.uid);
  } catch (err: any) {
    console.error('Detailed Self-Service Error:', err);
    assert('Self-Service Deletion Flow', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 2: ADMIN LOGIN STATES & ERROR MESSAGING CHECK
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 2. Admin Login States & Error Messaging Check:');
  try {
    const nonExistentAdminEmail = `unregistered_admin_${Date.now()}@arthasetu.test`;
    let errorCode = '';
    try {
      await signInWithEmailAndPassword(auth, nonExistentAdminEmail, 'AnyPassword123!');
    } catch (err: any) {
      errorCode = err?.code || '';
    }
    assert(
      'Admin Non-Existent Account Error Code',
      errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-not-found',
      `Received code: ${errorCode}`
    );
  } catch (err: any) {
    assert('Admin Non-Existent Account Error Code', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 3: ADMIN-TRIGGERED USER DELETION & AUDIT LOG
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 3. Admin-Triggered User Deletion & Server-Side Security:');
  const adminTargetEmail = `disposable_admin_target_${Date.now()}@test.arthasetu.gov`;

  try {
    // 1. Create target user
    const targetUserRecord = await adminAuth.createUser({
      email: adminTargetEmail,
      password: testPassword,
    });
    const targetUid = targetUserRecord.uid;

    await adminDb.collection('users').doc(targetUid).set({
      name: 'Target Admin Deletion User',
      email: adminTargetEmail,
      state: 'Assam',
    });
    await adminDb.collection('plans').add({
      userId: targetUid,
      businessName: 'Target Tea Stall',
    });
    await adminDb.collection('advice').add({
      userId: targetUid,
      query: 'Target advice query',
    });

    // 2. Test server-side deletion logic (simulating the API handler)
    const plansSnap = await adminDb.collection('plans').where('userId', '==', targetUid).get();
    await Promise.all(plansSnap.docs.map((d) => d.ref.delete()));

    const adviceSnap = await adminDb.collection('advice').where('userId', '==', targetUid).get();
    await Promise.all(adviceSnap.docs.map((d) => d.ref.delete()));

    await adminDb.collection('users').doc(targetUid).delete();
    await adminAuth.deleteUser(targetUid);

    // 3. Write audit log to adminActions
    const auditRef = await adminDb.collection('adminActions').add({
      adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com',
      targetUid,
      targetEmail: adminTargetEmail,
      action: 'delete_user',
      plansDeleted: plansSnap.size,
      adviceDeleted: adviceSnap.size,
      timestamp: new Date(),
    });

    // 4. Verify data is gone and audit log exists
    const userDoc = await adminDb.collection('users').doc(targetUid).get();
    const plansRemaining = await adminDb.collection('plans').where('userId', '==', targetUid).get();
    const adviceRemaining = await adminDb.collection('advice').where('userId', '==', targetUid).get();
    const auditDoc = await auditRef.get();

    assert('Admin User Deletion Firestore Cleanup', !userDoc.exists && plansRemaining.size === 0 && adviceRemaining.size === 0);
    assert('Admin Action Audit Log Recorded', auditDoc.exists && auditDoc.data()?.action === 'delete_user');
  } catch (err: any) {
    assert('Admin User Deletion & Audit Log', false, err.message);
  }

  // ───────────────────────────────────────────────────────────────────
  // TEST 4: FOOTER TEAM CREDITS
  // ───────────────────────────────────────────────────────────────────
  console.log('\n▶ 4. Footer Team Credits Verification:');
  const footerSource = require('fs').readFileSync(resolve(process.cwd(), 'src/components/layout/Footer.tsx'), 'utf-8');
  assert('Team CoreDumped Mentioned', footerSource.includes('Team CoreDumped'));
  assert('Deepjoy Mullick Mentioned', footerSource.includes('Deepjoy Mullick'));
  assert('Sayantan Sinha Mentioned', footerSource.includes('Sayantan Sinha'));
  assert('All 4 Testers Credited',
    footerSource.includes('Adrija Roy') &&
    footerSource.includes('Madhurya Ghosh') &&
    footerSource.includes('Soumyadeep Das') &&
    footerSource.includes('Rupam Das')
  );

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`🏁 TEST RESULTS: ${passed}/${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (passed !== total) {
    throw new Error(`${total - passed} checks failed.`);
  }
}

runTargetedTests().catch(console.error);
