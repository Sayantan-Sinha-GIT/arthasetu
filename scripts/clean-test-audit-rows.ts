/**
 * Removes audit-log rows left behind by test runs.
 *
 * Two problems in the same rows: they are synthetic entries from
 * scripts/test-phase7.ts sitting in a log the admin console presents as the
 * real governance history, and they carry an @arthasetu.gov.in reviewer
 * address, a restricted government namespace ArthaSetu has no claim on. The
 * code that generated them is fixed, but a code change cannot rewrite rows
 * that are already written.
 *
 *   npx tsx scripts/clean-test-audit-rows.ts
 *       Dry run: lists what would go, writes a backup.
 *
 *   npx tsx scripts/clean-test-audit-rows.ts --execute-confirmed-deletion
 *       Deletes them.
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminDb } from '../src/lib/firebase-admin';

const EXECUTE = process.argv.includes('--execute-confirmed-deletion');

// The admin history view reads scheme_updates; adminActions holds a separate,
// genuine audit trail that must not be touched.
const COLLECTION = 'scheme_updates';

/** A row is test residue if its reviewer is a generated test account. */
function isTestRow(data: Record<string, unknown>): boolean {
  const haystack = JSON.stringify(data);
  return (
    /admin_test_\d+@/.test(haystack) ||
    /@arthasetu\.gov\.in/.test(haystack) ||
    /\(Test\)/.test(haystack)
  );
}

async function run() {
  console.log(`Mode: ${EXECUTE ? 'LIVE DELETION' : 'DRY RUN (no writes)'}\n`);

  const snap = await adminDb.collection(COLLECTION).get();
  console.log(`Read ${snap.size} audit entries.`);

  const doomed = snap.docs.filter((d) => isTestRow(d.data() as Record<string, unknown>));
  console.log(`Test residue: ${doomed.length}\n`);

  if (!doomed.length) {
    console.log('Nothing to clean.');
    return;
  }

  for (const d of doomed) {
    const data = d.data() as { adminEmail?: string; schemeName?: string; action?: string };
    console.log(`  ${d.id}  ${data.action ?? '?'}  ${data.schemeName ?? '?'}  <${data.adminEmail ?? '?'}>`);
  }

  const backupDir = resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(backupDir, `audit-test-rows-${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(doomed.map((d) => ({ id: d.id, ...(d.data() as object) })), null, 2),
    'utf8'
  );
  console.log(`\nBackup written: ${backupPath}`);

  if (!EXECUTE) {
    console.log('\nDRY RUN — nothing was deleted.');
    console.log('Re-run with --execute-confirmed-deletion to apply.');
    return;
  }

  const batch = adminDb.batch();
  for (const d of doomed) batch.delete(d.ref);
  await batch.commit();

  const after = await adminDb.collection(COLLECTION).get();
  console.log(`\nDeleted ${doomed.length}. Audit log now holds ${after.size} entries.`);
}

run().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
