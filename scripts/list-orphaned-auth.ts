import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function listOrphanedAuthAccounts() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('🔍 ORPHANED FIREBASE AUTH ACCOUNTS (Read-Only Audit)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // 1. List ALL Firebase Auth accounts
  const allAuthUsers: { uid: string; email: string; creationTime: string }[] = [];
  let nextPageToken: string | undefined;
  do {
    const listResult = await adminAuth.listUsers(1000, nextPageToken);
    for (const user of listResult.users) {
      allAuthUsers.push({
        uid: user.uid,
        email: user.email || '(no email)',
        creationTime: user.metadata.creationTime || '(unknown)',
      });
    }
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  console.log(`Total Firebase Auth accounts: ${allAuthUsers.length}\n`);

  // 2. Check which ones have a matching Firestore 'users' doc
  const orphaned: typeof allAuthUsers = [];
  const matched: typeof allAuthUsers = [];

  for (const authUser of allAuthUsers) {
    const userDoc = await adminDb.collection('users').doc(authUser.uid).get();
    if (userDoc.exists) {
      matched.push(authUser);
    } else {
      orphaned.push(authUser);
    }
  }

  // 3. Print matched accounts
  console.log(`───────────────────────────────────────────────────────────────────────`);
  console.log(`✅ MATCHED (Auth + Firestore profile): ${matched.length} account(s)`);
  console.log(`───────────────────────────────────────────────────────────────────────`);
  for (const u of matched) {
    console.log(`  • ${u.email.padEnd(45)} UID: ${u.uid}   Created: ${u.creationTime}`);
  }

  // 4. Print orphaned accounts
  console.log(`\n───────────────────────────────────────────────────────────────────────`);
  console.log(`⚠️  ORPHANED (Auth only, NO Firestore profile): ${orphaned.length} account(s)`);
  console.log(`───────────────────────────────────────────────────────────────────────`);
  if (orphaned.length === 0) {
    console.log('  (none)');
  } else {
    for (const u of orphaned) {
      console.log(`  • ${u.email.padEnd(45)} UID: ${u.uid}   Created: ${u.creationTime}`);
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`SUMMARY: ${allAuthUsers.length} Auth total  |  ${matched.length} matched  |  ${orphaned.length} orphaned`);
  console.log(`═══════════════════════════════════════════════════════════════════════\n`);
  console.log('ℹ️  This was a READ-ONLY audit. No accounts or documents were modified.');
}

listOrphanedAuthAccounts().catch(console.error);
