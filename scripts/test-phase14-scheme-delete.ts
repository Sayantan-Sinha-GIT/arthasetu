import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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

async function testSchemeDeleteLive() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 LIVE ADMIN SCHEME DELETION & CASCADE VERIFICATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = (process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();

  if (!adminEmail || !adminPassword) {
    console.error('❌ Error: Missing NEXT_PUBLIC_ADMIN_EMAIL or ADMIN_PASSWORD in .env.local');
    process.exit(1);
  }

  // 1. Obtain Admin ID token
  console.log(`1️⃣ Authenticating as Admin (${adminEmail})...`);
  const adminUserRecord = await adminAuth.getUserByEmail(adminEmail);
  const customToken = await adminAuth.createCustomToken(adminUserRecord.uid);
  const { signInWithCustomToken } = await import('firebase/auth');
  const adminCred = await signInWithCustomToken(auth, customToken);
  const adminToken = await adminCred.user.getIdToken(true);
  console.log(`   ✅ Admin ID token obtained for UID: ${adminUserRecord.uid}`);

  // 2. Create a sacrificial test scheme in Firestore
  const testSchemeId = `test-scheme-${Date.now()}`;
  console.log(`\n2️⃣ Creating sacrificial test scheme (${testSchemeId})...`);
  await adminDb.collection('schemes').doc(testSchemeId).set({
    id: testSchemeId,
    name: 'Temporary Test Welfare Subsidy',
    shortName: 'TTWS',
    category: 'Micro-Credit',
    governmentLevel: 'central',
    description: 'A temporary welfare scheme for automated deletion testing.',
    isActive: true,
    targetBusinessTypes: ['poultry', 'dairy'],
    targetBeneficiaries: ['all'],
    eligibility: { otherConditions: [] },
    benefits: { maxSubsidyPercent: 35, otherBenefits: [] },
    requiredDocuments: ['aadhaar'],
    applicationProcess: 'Online portal',
    officialUrl: 'https://example.gov.in',
    sourceName: 'Official Gazette',
    lastVerifiedDate: '2026-08-30',
  });
  console.log('   ✅ Test scheme created in Firestore.');

  // 3. Create a test plan and test scheme_updates record referencing this scheme
  console.log('\n3️⃣ Populating cascade records (plan with schemeRef & update proposal)...');
  const planRef = await adminDb.collection('plans').add({
    userId: adminUserRecord.uid,
    title: 'Test Plan with Scheme Reference',
    businessType: 'Poultry Farm',
    schemeRefs: [testSchemeId, 'other-permanent-scheme'],
    createdAt: new Date().toISOString(),
  });

  const updateRef = await adminDb.collection('scheme_updates').add({
    schemeId: testSchemeId,
    status: 'pending',
    proposedChanges: { description: { old: 'old', new: 'new' } },
    timestamp: new Date(),
  });

  // Verify records exist
  const schemeBefore = await adminDb.collection('schemes').doc(testSchemeId).get();
  const planBefore = await planRef.get();
  const updateBefore = await updateRef.get();
  console.log(`   ✅ Confirmed before deletion:`);
  console.log(`      • Scheme doc exists: ${schemeBefore.exists}`);
  console.log(`      • Plan schemeRefs: ${JSON.stringify(planBefore.data()?.schemeRefs)}`);
  console.log(`      • Update proposal exists: ${updateBefore.exists}`);

  // 4. Call POST /api/admin/schemes/delete
  console.log('\n4️⃣ Calling POST /api/admin/schemes/delete with Admin Bearer Token...');
  const res = await fetch('http://localhost:3000/api/admin/schemes/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      schemeId: testSchemeId,
    }),
  });

  const resJson = await res.json();
  console.log(`   HTTP Status: ${res.status}`);
  console.log(`   Response Body:`, JSON.stringify(resJson, null, 2));

  if (res.status !== 200 || !resJson.success) {
    throw new Error(`Admin delete scheme API failed: status=${res.status}, error=${resJson.error}`);
  }
  console.log('   ✅ API responded 200 OK with success: true.');

  // 5. Verify direct Firestore deletion & cascade
  console.log('\n5️⃣ Independently verifying Firestore deletion & reference invalidation...');
  const schemeAfter = await adminDb.collection('schemes').doc(testSchemeId).get();
  const planAfter = await planRef.get();
  const updateAfter = await updateRef.get();

  const auditSnap = await adminDb
    .collection('adminActions')
    .where('targetSchemeId', '==', testSchemeId)
    .where('action', '==', 'delete_scheme')
    .get();

  console.log(`   • Firestore Scheme Doc deleted: ${!schemeAfter.exists} (Expected: true)`);
  console.log(`   • Plan schemeRefs updated: ${JSON.stringify(planAfter.data()?.schemeRefs)} (Expected to NOT contain ${testSchemeId})`);
  console.log(`   • Scheme updates purged: ${!updateAfter.exists} (Expected: true)`);
  console.log(`   • Audit log recorded in adminActions: ${auditSnap.size >= 1} (Expected: true)`);

  // Assertions
  if (schemeAfter.exists) {
    throw new Error('Assertion failed: Scheme document still exists in Firestore!');
  }
  if ((planAfter.data()?.schemeRefs || []).includes(testSchemeId)) {
    throw new Error('Assertion failed: Scheme ID reference was not removed from plan!');
  }
  if (updateAfter.exists) {
    throw new Error('Assertion failed: Scheme update proposal was not cleaned up!');
  }
  if (auditSnap.size === 0) {
    throw new Error('Assertion failed: No audit entry found in adminActions collection!');
  }

  // 6. Cleanup test plan
  await planRef.delete();
  console.log('\n6️⃣ Cleanup of temporary plan record completed.');

  console.log('\n🎉 TASK 3: LIVE ADMIN SCHEME DELETION TEST PASSED 100%!');
}

testSchemeDeleteLive().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
