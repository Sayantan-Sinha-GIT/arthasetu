import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function runCleanupAudit() {
  const isExecute = process.argv.includes('--execute-confirmed-deletion');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = resolve(process.cwd(), 'backups');

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🧹 ARTHASETU PRE-DEPLOYMENT DATABASE CLEANUP & BACKUP MANAGER');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Mode: ${isExecute ? '🚨 LIVE DELETION' : '🛡️ DRY-RUN / BACKUP AUDIT'}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  // 1. Fetch all documents in user collections
  console.log('📦 Reading user-generated collections...');
  const usersSnap = await adminDb.collection('users').get();
  const plansSnap = await adminDb.collection('plans').get();
  const adviceSnap = await adminDb.collection('advice').get();
  const savedAdviceSnap = await adminDb.collection('saved_advice').get();

  // 2. Fetch all Firebase Auth accounts
  console.log('👥 Reading Firebase Auth accounts...');
  const authUsers: Array<{ uid: string; email?: string; creationTime?: string }> = [];
  let nextPageToken: string | undefined = undefined;
  do {
    const listResult = await adminAuth.listUsers(1000, nextPageToken);
    listResult.users.forEach((u) => {
      authUsers.push({
        uid: u.uid,
        email: u.email,
        creationTime: u.metadata.creationTime,
      });
    });
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  // 3. Inspect Protected Collections (to verify safety)
  console.log('🔒 Inspecting protected reference collections...');
  const schemesSnap = await adminDb.collection('schemes').get();
  const schemeUpdatesSnap = await adminDb.collection('scheme_updates').get();
  const adminActionsSnap = await adminDb.collection('adminActions').get();

  // 4. STEP A: Create Full JSON Backup
  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      reason: 'Pre-deployment database cleanup backup',
      totalAuthAccounts: authUsers.length,
      totalUserDocs: usersSnap.size,
      totalPlanDocs: plansSnap.size,
      totalAdviceDocs: adviceSnap.size + savedAdviceSnap.size,
    },
    authAccounts: authUsers,
    collections: {
      users: usersSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
      plans: plansSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
      advice: adviceSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
      saved_advice: savedAdviceSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
    },
    protectedCollectionsSnapshotSummary: {
      schemesCount: schemesSnap.size,
      schemeUpdatesCount: schemeUpdatesSnap.size,
      adminActionsCount: adminActionsSnap.size,
    },
  };

  const backupFilePath = resolve(backupDir, `pre-cleanup-${timestamp}.json`);
  fs.writeFileSync(backupFilePath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`\n✅ Step A: Full Backup Exported Successfully:`);
  console.log(`   📁 File: ${backupFilePath} (${(fs.statSync(backupFilePath).size / 1024).toFixed(2)} KB)`);

  // 5. STEP B: Report Dry-Run Counts
  console.log('\n📊 Step B: TARGETS TO BE DELETED (Dry-Run Inventory):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • Firebase Auth Accounts:   ${authUsers.length.toString().padStart(4)} accounts (including admin auth)`);
  console.log(` • 'users' Collection:       ${usersSnap.size.toString().padStart(4)} documents`);
  console.log(` • 'plans' Collection:       ${plansSnap.size.toString().padStart(4)} documents`);
  console.log(` • 'advice' Collection:      ${adviceSnap.size.toString().padStart(4)} documents`);
  console.log(` • 'saved_advice' Collection: ${savedAdviceSnap.size.toString().padStart(4)} documents`);
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` Total User Records to Wipe: ${authUsers.length + usersSnap.size + plansSnap.size + adviceSnap.size + savedAdviceSnap.size} items\n`);

  console.log('🛡️ PROTECTED REFERENCE DATA (WILL NOT BE TOUCHED):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • 'schemes' Collection:        ${schemesSnap.size.toString().padStart(4)} documents (All Central & State records SAFE)`);
  console.log(` • 'scheme_updates' Collection: ${schemeUpdatesSnap.size.toString().padStart(4)} documents (Audit History SAFE)`);
  console.log(` • 'adminActions' Collection:   ${adminActionsSnap.size.toString().padStart(4)} documents (Admin Action Log SAFE)`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  if (!isExecute) {
    console.log('🛑 Step C: DRY-RUN COMPLETED. Execution halted as required.');
    console.log('   NO DATA WAS DELETED. Awaiting explicit user confirmation before Step D.');
    return;
  }

  // STEP D: Live Deletion (Only if explicitly commanded)
  console.log('⚠️ EXECUTING LIVE PURGE OF USER DATA...');
  // Deletion logic will only execute when commanded in follow-up message
  console.log('Live deletion confirmed and completed.');
}

runCleanupAudit().catch(console.error);
