import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function inspectProductionUsers() {
  console.log('============================================================');
  console.log('🔍 STEP -1: PRODUCTION USERS READ-ONLY AUDIT');
  console.log('============================================================\n');

  try {
    // 1. Fetch all Firebase Auth users
    const authUsersResult = await adminAuth.listUsers(1000);
    const authUsers = authUsersResult.users;
    console.log(`📊 Total Firebase Auth Users: ${authUsers.length}`);

    // 2. Fetch all Firestore users
    const firestoreUsersSnap = await adminDb.collection('users').get();
    console.log(`📊 Total Firestore User Documents: ${firestoreUsersSnap.size}\n`);

    console.log('------------------------------------------------------------');
    console.log('👤 Detailed User Audit:');
    console.log('------------------------------------------------------------');

    let unverifiedCount = 0;
    let verifiedCount = 0;
    let adminCount = 0;

    for (const u of authUsers) {
      const customClaims = u.customClaims || {};
      const isAdmin = !!customClaims.admin;
      const emailVerified = u.emailVerified;
      const creationTime = u.metadata.creationTime;
      const lastSignInTime = u.metadata.lastSignInTime;

      if (isAdmin) adminCount++;
      if (emailVerified) verifiedCount++;
      else unverifiedCount++;

      // Check Firestore doc
      const userDoc = firestoreUsersSnap.docs.find(d => d.id === u.uid);
      const profileData = userDoc ? userDoc.data() : null;

      console.log(`UID: ${u.uid}`);
      console.log(`  • Email: ${u.email}`);
      console.log(`  • Name: ${profileData?.name || u.displayName || '(none)'}`);
      console.log(`  • Email Verified: ${emailVerified}`);
      console.log(`  • Is Admin: ${isAdmin}`);
      console.log(`  • Created At: ${creationTime}`);
      console.log(`  • Last Sign In: ${lastSignInTime}`);
      console.log(`  • Firestore Doc Exists: ${!!userDoc}`);
      console.log(`  • Onboarding Complete in DB: ${profileData?.onboardingComplete ?? '(no doc)'}`);
      console.log(`  • State / District in DB: ${profileData?.state || '(none)'} / ${profileData?.district || '(none)'}`);
      console.log('');
    }

    console.log('------------------------------------------------------------');
    console.log('📊 Summary:');
    console.log(`  • Total Accounts: ${authUsers.length}`);
    console.log(`  • Admins: ${adminCount}`);
    console.log(`  • Email Verified: ${verifiedCount}`);
    console.log(`  • Email Unverified: ${unverifiedCount}`);
    console.log('------------------------------------------------------------\n');

  } catch (err: any) {
    console.error('❌ Error inspecting users:', err);
  }
}

inspectProductionUsers();
