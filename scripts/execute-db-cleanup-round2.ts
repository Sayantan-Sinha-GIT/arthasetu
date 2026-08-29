import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function executeStepDRound2() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🚨 EXECUTING STEP D: FULL DATABASE PURGE & BACKUP DELETION (ROUND 2)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com';

  // 1. WIPE ALL FIRESTORE USER COLLECTIONS FIRST
  console.log('▶ 1. Wiping Firestore user collections (users, plans, advice, saved_advice)...');

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

  // 2. WIPE FIREBASE AUTH ACCOUNTS (ADMIN DELETED LAST)
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

  const nonAdminAccounts = allAuthUsers.filter((u) => u.email?.toLowerCase() !== adminEmail.toLowerCase());
  const adminAccount = allAuthUsers.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());

  console.log(`   • Non-admin accounts to delete first: ${nonAdminAccounts.length}`);
  console.log(`   • Admin account (${adminEmail}) to delete last: ${adminAccount ? 'Found (UID: ' + adminAccount.uid + ')' : 'Not present'}`);

  console.log('\n▶ 3. Deleting non-admin Firebase Auth accounts...');
  for (const user of nonAdminAccounts) {
    await adminAuth.deleteUser(user.uid);
    console.log(`   • Deleted: ${user.email || '(no email)'} [UID: ${user.uid}]`);
  }

  if (adminAccount) {
    console.log(`\n▶ 4. Deleting admin Auth account LAST (${adminAccount.email})...`);
    await adminAuth.deleteUser(adminAccount.uid);
    console.log(`   ✅ Admin Auth account deleted: ${adminAccount.email} [UID: ${adminAccount.uid}]`);
  }

  // 3. DELETE OLD BACKUP FILES
  console.log('\n▶ 5. Deleting backup files in /backups...');
  const backupDir = resolve(process.cwd(), 'backups');
  let deletedBackupCount = 0;
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    for (const f of files) {
      const fullPath = resolve(backupDir, f);
      fs.unlinkSync(fullPath);
      console.log(`   • Deleted backup file: ${f}`);
      deletedBackupCount++;
    }
  }
  console.log(`   ✅ Deleted ${deletedBackupCount} backup file(s).\n`);

  // 4. POST-PURGE VERIFICATION & FINAL COUNTS
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 POST-PURGE VERIFICATION & FINAL COUNTS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const finalUsersSnap = await adminDb.collection('users').get();
  const finalPlansSnap = await adminDb.collection('plans').get();
  const finalAdviceSnap = await adminDb.collection('advice').get();
  const finalSavedAdviceSnap = await adminDb.collection('saved_advice').get();

  const finalAuthList = await adminAuth.listUsers(1000);

  const finalSchemesSnap = await adminDb.collection('schemes').get();
  const finalSchemeUpdatesSnap = await adminDb.collection('scheme_updates').get();
  const finalAdminActionsSnap = await adminDb.collection('adminActions').get();

  const remainingBackupFiles = fs.existsSync(backupDir) ? fs.readdirSync(backupDir) : [];

  console.log('📊 WIPED LIVE DATA (Target: Clean 0):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • Firebase Auth Accounts:       ${finalAuthList.users.length} ${finalAuthList.users.length === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'users' Collection:           ${finalUsersSnap.size} ${finalUsersSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'plans' Collection:           ${finalPlansSnap.size} ${finalPlansSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'advice' Collection:          ${finalAdviceSnap.size} ${finalAdviceSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);
  console.log(` • 'saved_advice' Collection:    ${finalSavedAdviceSnap.size} ${finalSavedAdviceSnap.size === 0 ? '✅ (Clean 0)' : '❌'}`);

  console.log('\n🛡️ PROTECTED REFERENCE DATA (Target: Preserved):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • 'schemes' Collection:         ${finalSchemesSnap.size} ${finalSchemesSnap.size === 24 ? '✅ (24 Preserved)' : '⚠️'}`);
  console.log(` • 'scheme_updates' Collection:  ${finalSchemeUpdatesSnap.size} ${finalSchemeUpdatesSnap.size === 2 ? '✅ (2 Preserved)' : '⚠️'}`);
  console.log(` • 'adminActions' Collection:    ${finalAdminActionsSnap.size} ✅ (Preserved)`);

  console.log('\n📁 BACKUPS DIRECTORY (Target: Empty):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • Files remaining in /backups:  ${remainingBackupFiles.length} ${remainingBackupFiles.length === 0 ? '✅ (Clean 0 / Empty)' : '❌'}`);

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('🏁 STEP D EXECUTION COMPLETED');
  console.log('═══════════════════════════════════════════════════════════════════════\n');
}

executeStepDRound2().catch(console.error);
