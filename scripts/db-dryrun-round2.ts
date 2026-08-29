import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function runDryRunRound2() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 ARTHASETU DATABASE CLEANUP — ROUND 2 DRY-RUN AUDIT');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Mode: 🛡️ DRY-RUN ONLY (Step B — Zero Deletions Performed)`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  // 1. Count live user collections
  const usersSnap = await adminDb.collection('users').get();
  const plansSnap = await adminDb.collection('plans').get();
  const adviceSnap = await adminDb.collection('advice').get();
  const savedAdviceSnap = await adminDb.collection('saved_advice').get();

  // 2. Count live Firebase Auth accounts
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

  // 3. Count protected collections
  const schemesSnap = await adminDb.collection('schemes').get();
  const schemeUpdatesSnap = await adminDb.collection('scheme_updates').get();
  const adminActionsSnap = await adminDb.collection('adminActions').get();

  // 4. List existing backup files in /backups
  const backupDir = resolve(process.cwd(), 'backups');
  let backupFiles: Array<{ filename: string; sizeBytes: number; path: string }> = [];
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    backupFiles = files.map((f) => {
      const fullPath = resolve(backupDir, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        sizeBytes: stat.size,
        path: fullPath,
      };
    });
  }

  // 5. Output Report
  console.log('📊 TARGETS TO BE DELETED (Live Data Dry-Run Inventory):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • Firebase Auth Accounts:   ${authUsers.length.toString().padStart(4)} accounts`);
  authUsers.forEach((u, i) => {
    console.log(`     ${i + 1}. ${(u.email || '(no email)').padEnd(42)} [UID: ${u.uid}]`);
  });
  console.log(` • 'users' Collection:       ${usersSnap.size.toString().padStart(4)} documents`);
  console.log(` • 'plans' Collection:       ${plansSnap.size.toString().padStart(4)} documents`);
  console.log(` • 'advice' Collection:      ${adviceSnap.size.toString().padStart(4)} documents`);
  console.log(` • 'saved_advice' Collection: ${savedAdviceSnap.size.toString().padStart(4)} documents`);
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` Total User Records: ${authUsers.length + usersSnap.size + plansSnap.size + adviceSnap.size + savedAdviceSnap.size} items\n`);

  console.log('🗑️ BACKUP FILES TO BE REMOVED (from /backups):');
  console.log('───────────────────────────────────────────────────────────────────────');
  if (backupFiles.length === 0) {
    console.log(' • (No backup files currently exist in /backups)');
  } else {
    backupFiles.forEach((b, i) => {
      console.log(` • ${i + 1}. ${b.filename} (${(b.sizeBytes / 1024).toFixed(2)} KB)`);
    });
  }
  console.log('───────────────────────────────────────────────────────────────────────\n');

  console.log('🛡️ PROTECTED REFERENCE DATA (WILL NOT BE TOUCHED):');
  console.log('───────────────────────────────────────────────────────────────────────');
  console.log(` • 'schemes' Collection:        ${schemesSnap.size.toString().padStart(4)} documents (All Central & State records SAFE)`);
  console.log(` • 'scheme_updates' Collection: ${schemeUpdatesSnap.size.toString().padStart(4)} documents (Audit History SAFE)`);
  console.log(` • 'adminActions' Collection:   ${adminActionsSnap.size.toString().padStart(4)} documents (Admin Action Log SAFE)`);
  console.log('───────────────────────────────────────────────────────────────────────\n');

  console.log('🛑 Step C: DRY-RUN AUDIT COMPLETED.');
  console.log('   NO DATA AND NO BACKUP FILES WERE DELETED.');
  console.log('   Awaiting explicit user confirmation before Step D execution.\n');
}

runDryRunRound2().catch(console.error);
