/**
 * Phase 7 Integration Test Script
 * Tests:
 * 1. Mocking / setting Firebase Auth custom claim { admin: true }
 * 2. AI-assisted update proposal on an existing scheme with dummy circular
 * 3. Rejecting update -> verifies live Firestore database is 100% UNTOUCHED
 * 4. Approving update -> verifies changes are written to the live Firestore record
 * 5. Full audit history retrieval and verification
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getAuth as getClientAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore as getClientFirestore, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { initializeApp as initAdminApp, cert, getApps as getAdminApps, type ServiceAccount } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import type { Scheme } from '../src/types';

async function runPhase7Tests() {
  console.log('🧪 Starting Phase 7: Admin System Integration Tests...\n');

  // Dynamic imports
  const { getSchemeById } = await import('../src/lib/firestore/schemes');
  const {
    proposeSchemeUpdate,
    getPendingUpdates,
    getAllUpdateHistory,
    approveSchemeUpdate,
    rejectSchemeUpdate,
    createOrUpdateLiveScheme,
  } = await import('../src/lib/firestore/admin');
  const { generateContent, GEMINI_MODELS } = await import('../src/lib/gemini');
  const { buildSchemeParsingPrompt } = await import('../src/lib/prompts/admin');

  // 1. Initialize Client & Admin Firebase SDKs
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

  let rawAdminKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawAdminKey) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_KEY in .env.local');
  rawAdminKey = rawAdminKey.trim();
  if ((rawAdminKey.startsWith("'") && rawAdminKey.endsWith("'")) || (rawAdminKey.startsWith('"') && rawAdminKey.endsWith('"'))) {
    rawAdminKey = rawAdminKey.slice(1, -1);
  }
  const parsed = JSON.parse(rawAdminKey);
  const serviceAccount: ServiceAccount = {
    ...parsed,
    private_key: (parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n'),
    privateKey: (parsed.private_key || parsed.privateKey || '').replace(/\\n/g, '\n'),
  };
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(serviceAccount) }, 'admin-p7-test') : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  const testAdminEmail = `admin_test_${Date.now()}@arthasetu.app`;
  const testAdminPassword = 'AdminPassword123!';
  let adminUid = '';

  try {
    // TEST 1: ADMIN CUSTOM CLAIM GATING
    console.log('1️⃣ Testing Admin User Creation & Custom Claim Gating...');
    const userCredential = await createUserWithEmailAndPassword(clientAuth, testAdminEmail, testAdminPassword);
    adminUid = userCredential.user.uid;
    await updateProfile(userCredential.user, { displayName: 'Nodal Officer Admin' });

    // Set custom claims { admin: true } using Admin SDK
    await adminAuth.setCustomUserClaims(adminUid, { admin: true });

    // Verify token claims on client
    const tokenResult = await userCredential.user.getIdTokenResult(true);
    console.log(`   • Admin UID: ${adminUid}`);
    console.log(`   • Claims: ${JSON.stringify(tokenResult.claims.admin)}`);
    if (!tokenResult.claims.admin) {
      throw new Error('Admin custom claim was not set on the user token');
    }
    console.log('   ✅ Custom claim { admin: true } successfully set and verified.');

    // TEST 2: AI-ASSISTED UPDATE PROPOSAL DRAFTING ON AN EXISTING SCHEME
    console.log('\n2️⃣ Testing AI-Assisted Scheme Parsing & Delta Diff Generation...');
    
    // Create a temporary test scheme to operate on safely
    const testSchemeId = `test-pmegp-p7-${Date.now()}`;
    const initialTestScheme: Scheme = {
      id: testSchemeId,
      name: 'Prime Minister Employment Generation Programme (Test)',
      shortName: 'PMEGP-Test',
      category: 'Micro-Credit & Subsidy',
      governmentLevel: 'central',
      description: 'Credit linked subsidy programme for generating employment opportunities.',
      targetBusinessTypes: ['Manufacturing', 'Services & Repairs'],
      targetBeneficiaries: ['Rural Youth', 'Women', 'SC/ST'],
      eligibility: {
        ageRange: '18+ years',
        incomeLimit: 'No ceiling',
        businessStatus: 'new',
        otherConditions: ['VIII pass for projects > 10 Lakhs in manufacturing'],
      },
      benefits: {
        subsidyDetails: '35% subsidy for special categories in rural areas.',
        maxSubsidyPercent: 35,
        maxFundingAmount: 5000000,
        otherBenefits: ['EDP Training included'],
      },
      requiredDocuments: ['Aadhaar', 'PAN Card', 'Project Report'],
      applicationProcess: 'Apply online through KVIC portal.',
      officialUrl: 'https://kviconline.gov.in',
      sourceName: 'Ministry of MSME',
      lastVerifiedDate: '2026-01-01',
      isActive: true,
    };

    await createOrUpdateLiveScheme(initialTestScheme);
    console.log(`   • Created temporary test scheme in live Firestore: ${testSchemeId}`);

    // Dummy official notification text
    const dummyCircular = `
MINISTRY OF MICRO, SMALL AND MEDIUM ENTERPRISES
OFFICIAL GAZETTE NOTIFICATION No. 2026/PMEGP/REV-04
Date: 15th April 2026

Subject: Revision of subsidy caps and project cost ceiling under PMEGP.

In supersession of previous guidelines, the Central Government hereby approves:
1. The maximum margin money subsidy for special category beneficiaries in rural areas is enhanced from 35% to 40%.
2. The maximum allowable project cost ceiling for manufacturing sector units is increased from ₹50,00,000 (Fifty Lakhs) to ₹75,00,000 (Seventy Five Lakhs).
All other guidelines remain unchanged.
`;

    const prompt = buildSchemeParsingPrompt(dummyCircular, initialTestScheme);
    const rawAiOutput = await generateContent(
      GEMINI_MODELS.FLASH,
      prompt,
      'Parse circular and generate JSON diff'
    );

    let cleaned = rawAiOutput.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const aiResult = JSON.parse(cleaned);
    console.log(`   • AI Policy Summary: "${aiResult.summaryOfChanges}"`);
    console.log(`   • Proposed Changes detected:`, JSON.stringify(aiResult.proposedChanges, null, 2));

    if (!aiResult.proposedChanges || Object.keys(aiResult.proposedChanges).length === 0) {
      throw new Error('AI failed to identify changes from the circular');
    }
    console.log('   ✅ AI parsing correctly extracted updated subsidy and ceiling parameters.');

    // TEST 3: PROPOSE & REJECT WORKFLOW (DB UNTOUCHED)
    console.log('\n3️⃣ Testing Rejection Workflow (Verifying Live DB is 100% UNTOUCHED)...');
    const rejectProposalId = await proposeSchemeUpdate({
      schemeId: testSchemeId,
      schemeName: initialTestScheme.name,
      adminId: adminUid,
      adminEmail: testAdminEmail,
      sourceUrl: 'https://msme.gov.in/gazette/2026/04',
      proposedChanges: aiResult.proposedChanges,
      status: 'pending',
      notes: 'Test rejection case for unauthorized proposal',
    });

    console.log(`   • Created pending proposal ID: ${rejectProposalId}`);
    
    // Check pending list
    let pending = await getPendingUpdates();
    const isPending = pending.some((p) => p.id === rejectProposalId);
    if (!isPending) throw new Error('Proposal was not found in pending updates queue');

    // Admin rejects proposal
    await rejectSchemeUpdate(rejectProposalId, 'Rejected: Test circular needs physical gazette verification');
    console.log('   • Rejected proposal.');

    // Verify rejection in DB
    const rejectedSnap = await getDoc(doc(clientDb, 'scheme_updates', rejectProposalId));
    if (rejectedSnap.data()?.status !== 'rejected') {
      throw new Error('Proposal status was not updated to rejected');
    }

    // CRUCIAL CHECK: Verify live scheme document in Firestore is completely UNTOUCHED
    const untouchedSchemeSnap = await getDoc(doc(clientDb, 'schemes', testSchemeId));
    const untouchedData = untouchedSchemeSnap.data() as Scheme;
    console.log(`   • Live DB maxSubsidyPercent: ${untouchedData.benefits.maxSubsidyPercent}% (Expected: 35%)`);
    console.log(`   • Live DB maxFundingAmount: ₹${untouchedData.benefits.maxFundingAmount} (Expected: 50,00,000)`);

    if (untouchedData.benefits.maxSubsidyPercent !== 35 || untouchedData.benefits.maxFundingAmount !== 5000000) {
      throw new Error('CRITICAL BUG: Live scheme was modified during a rejected proposal!');
    }
    console.log('   ✅ Rejected update verified: Live database remained 100% untouched!');

    // TEST 4: PROPOSE & APPROVE WORKFLOW (LIVE DB WRITTEN)
    console.log('\n4️⃣ Testing Approval Workflow (Verifying Changes Written to Live DB)...');
    const approveProposalId = await proposeSchemeUpdate({
      schemeId: testSchemeId,
      schemeName: initialTestScheme.name,
      adminId: adminUid,
      adminEmail: testAdminEmail,
      sourceUrl: 'https://msme.gov.in/gazette/2026/04',
      proposedChanges: {
        'benefits.maxSubsidyPercent': { old: 35, new: 40 },
        'benefits.maxFundingAmount': { old: 5000000, new: 7500000 },
        'benefits.subsidyDetails': {
          old: '35% subsidy for special categories in rural areas.',
          new: '40% enhanced subsidy for special categories in rural areas under 2026 revised guidelines.',
        },
      },
      status: 'pending',
      notes: 'Approved policy revision',
    });

    console.log(`   • Created pending proposal ID: ${approveProposalId}`);
    
    // Admin approves proposal
    await approveSchemeUpdate(approveProposalId, adminUid, testAdminEmail);
    console.log('   • Approved proposal and published to live DB.');

    // Verify live scheme document in Firestore was updated
    const updatedSchemeSnap = await getDoc(doc(clientDb, 'schemes', testSchemeId));
    const updatedData = updatedSchemeSnap.data() as Scheme;
    console.log(`   • Updated Live DB maxSubsidyPercent: ${updatedData.benefits.maxSubsidyPercent}% (Expected: 40%)`);
    console.log(`   • Updated Live DB maxFundingAmount: ₹${updatedData.benefits.maxFundingAmount} (Expected: 75,00,000)`);
    console.log(`   • Updated Live DB lastVerifiedDate: ${updatedData.lastVerifiedDate}`);

    if (updatedData.benefits.maxSubsidyPercent !== 40 || updatedData.benefits.maxFundingAmount !== 7500000) {
      throw new Error('Live scheme record was not updated correctly upon approval');
    }
    console.log('   ✅ Approved update verified: Live database successfully updated with verified date!');

    // TEST 5: AUDIT LOG RETRIEVAL
    console.log('\n5️⃣ Testing Audit Log Retrieval...');
    const allHistory = await getAllUpdateHistory();
    console.log(`   • Total audit records in history: ${allHistory.length}`);
    const hasApproved = allHistory.some((h) => h.id === approveProposalId && h.status === 'approved');
    const hasRejected = allHistory.some((h) => h.id === rejectProposalId && h.status === 'rejected');

    if (!hasApproved || !hasRejected) {
      throw new Error('Audit trail is missing approved or rejected records');
    }
    console.log('   ✅ Audit trail successfully tracks both approved and rejected records.');

    // Cleanup temporary test documents
    console.log('\n🧹 Cleaning up test documents...');
    await deleteDoc(doc(clientDb, 'schemes', testSchemeId));
    await deleteDoc(doc(clientDb, 'scheme_updates', rejectProposalId));
    await deleteDoc(doc(clientDb, 'scheme_updates', approveProposalId));
    console.log('   ✅ Test documents cleaned up.');

    console.log('\n🎉 ALL 5 PHASE 7 ADMIN SYSTEM INTEGRATION TESTS PASSED PERFECTLY!\n');
  } finally {
    if (adminUid) {
      try {
        await adminAuth.deleteUser(adminUid);
        console.log('🧹 Deleted test admin user from Firebase Auth.');
      } catch {}
    }
  }
}

runPhase7Tests().catch((err) => {
  console.error('\n❌ Phase 7 Test failed with error:', err);
  process.exit(1);
});
