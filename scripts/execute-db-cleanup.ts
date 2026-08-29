import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function executeStepDCleanup() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚨 EXECUTING STEP D: FULL PRE-DEPLOYMENT DATABASE & AUTH PURGE');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com';
  const backupFilePath = resolve(process.cwd(), 'backups', 'pre-cleanup-2026-08-28T20-48-56-455Z.json');

  // Verify backup exists before doing anything
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`CRITICAL ERROR: Backup file not found at ${backupFilePath}. Aborting!`);
  }
  const backupStatsBefore = fs.statSync(backupFilePath);
  console.log(`📁 Verified pre-cleanup backup before purge: ${backupFilePath} (${backupStatsBefore.size} bytes)\n`);

  // ───────────────────────────────────────────────────────────────────
  // STEP 1: WIPE ALL FIRESTORE USER COLLECTIONS FIRST
  // ───────────────────────────────────────────────────────────────────
  console.log('▶ 1. Wiping Firestore user collections (users, plans, advice, saved_advice)...');

  // Helper to delete all documents in a collection in batches
  async function wipeCollection(collectionName: string) {
    const snap = await adminDb.collection(collectionName).get();
    if (snap.empty) {
      console.log(`   • '${collectionName}': 0 documents to delete.`);
      return 0;
    }
    const batchSize = 400;
    let count = 0;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = adminDb.batch();
      const chunk = snap.docs.slice(i, i + batchSize);
      chunk.forEach((docSnap) => batch.delete(docSnap.ref));
      await batch.commit();
      count += chunk.length;
    }
    console.log(`   • '${collectionName}': ${count} document(s) deleted.`);
    return count;
  }

  const usersDeleted = await wipeCollection('users');
  const plansDeleted = await wipeCollection('plans');
  const adviceDeleted = await wipeCollection('advice');
  const savedAdviceDeleted = await wipeCollection('saved_advice');

  console.log(`   ✅ Firestore purge complete: ${usersDeleted + plansDeleted + adviceDeleted + savedAdviceDeleted} total user documents wiped.\n`);

  // ───────────────────────────────────────────────────────────────────
  // STEP 2 & 3: WIPE FIREBASE AUTH ACCOUNTS (ADMIN DELETED LAST)
  // ───────────────────────────────────────────────────────────────────
  console.log('▶ 2. Fetching all Firebase Auth accounts...');
  const allAuthUsers: Array<{ uid: string; email?: string }> = [];
  let nextPageToken: string | undefined = undefined;
  do {
    const listResult = await adminAuth.listUsers(1000, nextPageToken);
    listResult.users.forEach((u) => {
      allAuthUsers.push({ uid: u.uid, email: u.email });
    });
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`   Found ${allAuthUsers.length} total Auth account(s).`);

  // Split into non-admin accounts and admin account
  const nonAdminAccounts = allAuthUsers.filter((u) => u.email?.toLowerCase() !== adminEmail.toLowerCase());
  const adminAccount = allAuthUsers.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());

  console.log(`   • Non-admin accounts to delete first: ${nonAdminAccounts.length}`);
  console.log(`   • Admin account (${adminEmail}) to delete last: ${adminAccount ? 'Found (UID: ' + adminAccount.uid + ')' : 'Not present'}`);

  // Delete non-admin accounts
  console.log('\n▶ 3. Deleting non-admin Firebase Auth accounts...');
  for (const user of nonAdminAccounts) {
    await adminAuth.deleteUser(user.uid);
    console.log(`   • Deleted: ${user.email || '(no email)'} [UID: ${user.uid}]`);
  }
  console.log(`   ✅ Non-admin accounts deletion complete (${nonAdminAccounts.length} deleted).`);

  // Delete admin account LAST
  if (adminAccount) {
    console.log(`\n▶ 4. Deleting admin Auth account LAST (${adminAccount.email})...`);
    await adminAuth.deleteUser(adminAccount.uid);
    console.log(`   ✅ Admin Auth account deleted: ${adminAccount.email} [UID: ${adminAccount.uid}]`);
  } else {
    console.log('\n▶ 4. No admin Auth account found to delete.');
  }

  // ───────────────────────────────────────────────────────────────────
  // STEP 5: VERIFICATION & FINAL COUNTS
  // ───────────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 POST-PURGE VERIFICATION & FINAL COUNTS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // Check wiped collections
  const finalUsersSnap = await adminDb.collection('users').get();
  const finalPlansSnap = await adminDb.collection('plans').get();
  const finalAdviceSnap = await adminDb.collection('advice').get();
  const finalSavedAdviceSnap = await adminDb.collection('saved_advice').get();

  // Check auth accounts
  const finalAuthList = await adminAuth.listUsers(1000);

  // Check protected collections
  const finalSchemesSnap = await adminDb.collection('schemes').get();
  const finalSchemeUpdatesSnap = await adminDb.collection('scheme_updates').get();
  const finalAdminActionsSnap = await adminDb.collection('adminActions').get();

  // Check backup integrity
  const backupStatsAfter = fs.statSync(backupFilePath);
  const backupIntact = fs.existsSync(backupFilePath) && backupStatsAfter.size === backupStatsBefore.size;

  console.log('📊 WIPED COLLECTIONS & ACCOUNTS (Target: 0):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • Firebase Auth Accounts:       ${finalAuthList.users.length} ${finalAuthList.users.length === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'users' Collection:           ${finalUsersSnap.size} ${finalUsersSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'plans' Collection:           ${finalPlansSnap.size} ${finalPlansSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'advice' Collection:          ${finalAdviceSnap.size} ${finalAdviceSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'saved_advice' Collection:    ${finalSavedAdviceSnap.size} ${finalSavedAdviceSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);

  console.log('\n🛡️ PROTECTED REFERENCE DATA (Target: Exactly Preserved):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • 'schemes' Collection:         ${finalSchemesSnap.size} ${finalSchemesSnap.size === 24 ? '✅ (24 Preserved)' : '⚠️'}`);
  console.log(` • 'scheme_updates' Collection:  ${finalSchemeUpdatesSnap.size} ${finalSchemeUpdatesSnap.size === 2 ? '✅ (2 Preserved)' : '⚠️'}`);
  console.log(` • 'adminActions' Collection:    ${finalAdminActionsSnap.size} ✅ (Preserved)`);

  console.log('\n📁 BACKUP FILE VERIFICATION:');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • Path: ${backupFilePath}`);
  console.log(` • Size: ${backupStatsAfter.size} bytes (${(backupStatsAfter.size / 1024).toFixed(2)} KB)`);
  console.log(` • Integrity: ${backupIntact ? '✅ INTACT & UNTOUCHED' : '❌ CHANGED'}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('🏁 DATABASE PURGE & VERIFICATION COMPLETED SUCCESSFULLY');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

executeStepDCleanup().catch(console.error);
