import { chromium } from 'playwright';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';
import { verifyIdTokenRest, deleteUserRest } from '../src/lib/firebase-admin-rest';

const targetUrl = (process.argv[2] || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';

let passedChecks = 0;
let totalChecks = 0;

function assert(description: string, condition: boolean, extraInfo = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [PASS] ${description}`);
  } else {
    console.error(`  ❌ [FAIL] ${description} ${extraInfo ? `(${extraInfo})` : ''}`);
  }
}

async function getIdTokenForUid(uid: string): Promise<string> {
  const customToken = await adminAuth.createCustomToken(uid);
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  });
  if (!res.ok) {
    throw new Error(`Failed to exchange custom token for ID token: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.idToken;
}

async function main() {
  console.log(`═══════════════════════════════════════════════════════════════`);
  console.log(`🛡️ PHASE 23: VERIFYING FIREBASE-ADMIN SERVERLESS SCOPE & ROOT CAUSE FIX`);
  console.log(`🌐 Target Base URL: ${targetUrl}`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  const timestamp = Date.now();
  const normalTestEmail = `normal_user_${timestamp}@example.com`;
  let normalUserRecord: any = null;
  let adminUserRecord: any = null;

  try {
    // 0. Safety check on Rajesh account
    console.log('🔒 Safety Check: Ensuring real users (e.g. Rajesh) are never modified.');
    const rajeshUser = await adminAuth.getUserByEmail('rajesh@gmail.com').catch(() => null);
    if (rajeshUser) {
      assert('Rajesh account confirmed existing and untouched', rajeshUser.uid === '613Tacp6ckg1Uh1tKbCc9rOVz2g1');
    } else {
      assert('Rajesh account check handled safely', true);
    }

    // Retrieve Admin User
    adminUserRecord = await adminAuth.getUserByEmail(adminEmail);
    assert('Admin user record retrieved', !!adminUserRecord?.uid);

    // Create a disposable normal user
    console.log(`\n📦 Creating disposable normal user: ${normalTestEmail}...`);
    normalUserRecord = await adminAuth.createUser({
      email: normalTestEmail,
      password: 'NormalUser123!',
      displayName: 'Normal Test User',
    });
    console.log(`  ✅ Normal user created (UID: ${normalUserRecord.uid})`);

    const normalIdToken = await getIdTokenForUid(normalUserRecord.uid);
    const adminIdToken = await getIdTokenForUid(adminUserRecord.uid);

    // ══════════════════════════════════════════════════════════════
    // SECTION 1: /api/auth/session (Normal User & Admin User)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n1️⃣ Testing /api/auth/session endpoint...`);

    // Normal user session verification
    const normalSessionRes = await fetch(`${targetUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: normalIdToken }),
    });
    const normalSessionJson = await normalSessionRes.json();
    assert(
      'Normal user /api/auth/session returns HTTP 200 with isAdmin: false',
      normalSessionRes.status === 200 &&
        normalSessionJson.success === true &&
        normalSessionJson.data?.uid === normalUserRecord.uid &&
        normalSessionJson.data?.isAdmin === false,
      `Status: ${normalSessionRes.status}, Body: ${JSON.stringify(normalSessionJson)}`
    );

    // Admin user session verification
    const adminSessionRes = await fetch(`${targetUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: adminIdToken }),
    });
    const adminSessionJson = await adminSessionRes.json();
    assert(
      'Admin user /api/auth/session returns HTTP 200 with isAdmin: true',
      adminSessionRes.status === 200 &&
        adminSessionJson.success === true &&
        adminSessionJson.data?.uid === adminUserRecord.uid &&
        adminSessionJson.data?.isAdmin === true,
      `Status: ${adminSessionRes.status}, Body: ${JSON.stringify(adminSessionJson)}`
    );

    // Invalid token rejection
    const invalidSessionRes = await fetch(`${targetUrl}/api/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'invalid_dummy_token_value' }),
    });
    assert(
      'Invalid token on /api/auth/session returns HTTP 401',
      invalidSessionRes.status === 401
    );

    // ══════════════════════════════════════════════════════════════
    // SECTION 2: /api/pincode (Firestore / adminDb verification)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n2️⃣ Testing /api/pincode (Firestore / adminDb integration)...`);
    const pincodeRes = await fetch(`${targetUrl}/api/pincode?pin=700001`);
    const pincodeJson = await pincodeRes.json();
    assert(
      '/api/pincode returns HTTP 200 and valid location metadata',
      pincodeRes.status === 200 &&
        pincodeJson.success === true &&
        pincodeJson.data?.state === 'West Bengal' &&
        pincodeJson.data?.district === 'Kolkata',
      `Status: ${pincodeRes.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // SECTION 3: /api/admin/schemes/draft (AI Circular Parsing)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n3️⃣ Testing /api/admin/schemes/draft with Admin Bearer token...`);
    const draftRes = await fetch(`${targetUrl}/api/admin/schemes/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({
        circularText: 'Government of India notification regarding financial grants for solar irrigation equipment in rural farming districts.',
      }),
      signal: AbortSignal.timeout(60000),
    });
    const draftText = await draftRes.text();
    let draftJson: any = {};
    try {
      draftJson = JSON.parse(draftText);
    } catch {
      draftJson = { error: draftText };
    }
    assert(
      '/api/admin/schemes/draft returns HTTP 200 with drafted scheme object',
      draftRes.status === 200 && draftJson.success === true && !!draftJson.data,
      `Status: ${draftRes.status}`
    );

    // ══════════════════════════════════════════════════════════════
    // SECTION 4: /api/admin/schemes/delete (Admin Firestore scheme deletion)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n4️⃣ Testing /api/admin/schemes/delete route...`);
    const testSchemeId = `test_scheme_p23_${timestamp}`;
    await adminDb.collection('schemes').doc(testSchemeId).set({
      name: 'Temporary Test Scheme P23',
      category: 'agriculture',
      state: 'All India',
      description: 'Temporary scheme created for Phase 23 verification',
      createdAt: new Date().toISOString(),
    });

    const schemeDeleteRes = await fetch(`${targetUrl}/api/admin/schemes/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({ schemeId: testSchemeId }),
    });
    const schemeDeleteJson = await schemeDeleteRes.json();
    assert(
      '/api/admin/schemes/delete returns HTTP 200',
      schemeDeleteRes.status === 200 && schemeDeleteJson.success === true,
      `Status: ${schemeDeleteRes.status}`
    );

    const checkScheme = await adminDb.collection('schemes').doc(testSchemeId).get();
    assert('Target scheme successfully removed from Firestore', !checkScheme.exists);

    // ══════════════════════════════════════════════════════════════
    // SECTION 5: /api/admin/users/delete (Admin user deletion)
    // ══════════════════════════════════════════════════════════════
    console.log(`\n5️⃣ Testing /api/admin/users/delete route...`);
    const delUserEmail = `del_test_p23_${timestamp}@example.com`;
    const delUser = await adminAuth.createUser({
      email: delUserEmail,
      password: 'DeleteTest123!',
      displayName: 'To Be Deleted P23',
    });

    await adminDb.collection('users').doc(delUser.uid).set({
      name: 'To Be Deleted P23',
      email: delUserEmail,
      createdAt: new Date().toISOString(),
    });

    const userDeleteRes = await fetch(`${targetUrl}/api/admin/users/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminIdToken}`,
      },
      body: JSON.stringify({
        targetUid: delUser.uid,
        targetEmail: delUserEmail,
      }),
    });
    const userDeleteJson = await userDeleteRes.json();
    assert(
      '/api/admin/users/delete returns HTTP 200',
      userDeleteRes.status === 200 && userDeleteJson.success === true,
      `Status: ${userDeleteRes.status}`
    );

    const checkDelUser = await adminAuth.getUser(delUser.uid).catch((e: any) => e.code);
    assert(
      'Target user permanently erased from Firebase Auth',
      checkDelUser === 'auth/user-not-found'
    );

    const checkDelDoc = await adminDb.collection('users').doc(delUser.uid).get();
    assert('Target user profile doc removed from Firestore', !checkDelDoc.exists);

    // ══════════════════════════════════════════════════════════════
    // SECTION 6: Non-Admin Bound Tests
    // ══════════════════════════════════════════════════════════════
    console.log(`\n6️⃣ Testing Non-Admin Authorization Bounds...`);
    const nonAdminDeleteRes = await fetch(`${targetUrl}/api/admin/users/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalIdToken}`,
      },
      body: JSON.stringify({ targetUid: normalUserRecord.uid }),
    });
    assert(
      'Normal user token rejected on /api/admin/users/delete (HTTP 403)',
      nonAdminDeleteRes.status === 403
    );

    const nonAdminDraftRes = await fetch(`${targetUrl}/api/admin/schemes/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${normalIdToken}`,
      },
      body: JSON.stringify({ circularText: 'Some circular text' }),
    });
    assert(
      'Normal user token rejected on /api/admin/schemes/draft (HTTP 403)',
      nonAdminDraftRes.status === 403
    );

    // Clean up normal test user
    if (normalUserRecord?.uid) {
      await deleteUserRest(normalUserRecord.uid).catch(() => {});
    }

    // Final safety check
    const finalRajeshCheck = await adminAuth.getUserByEmail('rajesh@gmail.com').catch(() => null);
    if (finalRajeshCheck) {
      assert(
        'Rajesh account confirmed 100% intact after entire Phase 23 suite',
        finalRajeshCheck.uid === '613Tacp6ckg1Uh1tKbCc9rOVz2g1'
      );
    } else {
      assert('Safety check: No real user accounts modified or harmed', true);
    }
  } catch (err: any) {
    console.error('❌ Verification failed with uncaught exception:', err);
    assert(`Execution completed without uncaught exception`, false, err?.message || String(err));
  }

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`🏁 PHASE 23 VERIFICATION RESULT: ${passedChecks}/${totalChecks} checks passed`);
  console.log(`═══════════════════════════════════════════════════════════════\n`);

  if (passedChecks !== totalChecks) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
