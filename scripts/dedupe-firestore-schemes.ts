/**
 * Collapses duplicate scheme records in the live Firestore catalogue.
 *
 * The seed file was deduplicated separately, but the app reads Firestore, so
 * until this runs the matcher still offers the same programme several times at
 * different match percentages — "Prime Minister Vishwakarma Yojana" at 85% and
 * "PM Vishwakarma Scheme" at 75%.
 *
 *   npx tsx scripts/dedupe-firestore-schemes.ts
 *       Dry run. Reads only, writes a full backup, prints the plan.
 *
 *   npx tsx scripts/dedupe-firestore-schemes.ts --execute-confirmed-deletion
 *       Applies it: deletes the redundant records after backing everything up.
 *
 * Uses the same identity rules as the seed dedupe (scripts/scheme-identity.cjs)
 * so the two catalogues cannot drift apart.
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminDb } from '../src/lib/firebase-admin';
 
const { normaliseSchemeName, normaliseUrl, completenessScore } = require('./scheme-identity.cjs');

interface SchemeDoc {
  id: string;
  name?: string;
  officialUrl?: string;
  [key: string]: unknown;
}

const EXECUTE = process.argv.includes('--execute-confirmed-deletion');

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  FIRESTORE SCHEME DEDUPLICATION');
  console.log(`  Mode: ${EXECUTE ? 'LIVE DELETION' : 'DRY RUN (no writes)'}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const snap = await adminDb.collection('schemes').get();
  const schemes: SchemeDoc[] = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }));
  console.log(`Read ${schemes.length} scheme documents.\n`);

  // Always back up before deciding anything, so a bad run is recoverable.
  const backupDir = resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = resolve(backupDir, `schemes-before-dedupe-${stamp}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(schemes, null, 2), 'utf8');
  console.log(`Backup written: ${backupPath}\n`);

  // Pass 1 — identical normalised names.
  const groups = new Map<string, SchemeDoc[]>();
  for (const s of schemes) {
    const key = normaliseSchemeName(s.name) || `__unnamed_${s.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }

  const survivors: SchemeDoc[] = [];
  const doomed: { doc: SchemeDoc; supersededBy: string }[] = [];

  for (const [, group] of groups) {
    if (group.length === 1) {
      survivors.push(group[0]);
      continue;
    }
    const ranked = [...group].sort((a, b) => completenessScore(b) - completenessScore(a));
    survivors.push(ranked[0]);
    for (const loser of ranked.slice(1)) doomed.push({ doc: loser, supersededBy: ranked[0].id });
  }

  // Pass 2 — same official portal and one name contained in the other, which
  // catches a scheme listed under both its short and its full title.
  const byUrl = new Map<string, SchemeDoc[]>();
  for (const s of survivors) {
    const url = normaliseUrl(s.officialUrl);
    if (!url) continue;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url)!.push(s);
  }
  const droppedInPass2 = new Set<SchemeDoc>();
  for (const [, group] of byUrl) {
    if (group.length < 2) continue;
    const ranked = [...group].sort((a, b) => completenessScore(b) - completenessScore(a));
    for (let i = 0; i < ranked.length; i++) {
      const a = ranked[i];
      if (droppedInPass2.has(a)) continue;
      const nameA = normaliseSchemeName(a.name);
      for (let j = i + 1; j < ranked.length; j++) {
        const b = ranked[j];
        if (droppedInPass2.has(b)) continue;
        const nameB = normaliseSchemeName(b.name);
        if (nameA === nameB || nameA.startsWith(nameB + ' ') || nameB.startsWith(nameA + ' ')) {
          droppedInPass2.add(b);
          doomed.push({ doc: b, supersededBy: a.id });
        }
      }
    }
  }
  const finalSurvivors = survivors.filter((s) => !droppedInPass2.has(s));

  // Pass 2 can delete a record that pass 1 had chosen as a survivor, which
  // leaves pass-1 losers superseded by a document that is itself about to go.
  // Follow each chain to a record that actually survives, or the repointing
  // below would aim saved plans at a deleted scheme.
  const survivorIds = new Set(finalSurvivors.map((s) => s.id));
  const directSuccessor = new Map(doomed.map((d) => [d.doc.id, d.supersededBy]));
  for (const entry of doomed) {
    const seen = new Set<string>([entry.doc.id]);
    let target = entry.supersededBy;
    while (!survivorIds.has(target) && directSuccessor.has(target) && !seen.has(target)) {
      seen.add(target);
      target = directSuccessor.get(target)!;
    }
    if (!survivorIds.has(target)) {
      throw new Error(`Cannot resolve a surviving record for ${entry.doc.id}; aborting rather than orphaning it.`);
    }
    entry.supersededBy = target;
  }

  console.log(`survivors : ${finalSurvivors.length}`);
  console.log(`to delete : ${doomed.length}\n`);

  const bySuperseder = new Map<string, number>();
  for (const d of doomed) bySuperseder.set(d.supersededBy, (bySuperseder.get(d.supersededBy) || 0) + 1);
  const worst = [...bySuperseder.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  console.log('largest collapses:');
  for (const [id, count] of worst) {
    const keeper = finalSurvivors.find((s) => s.id === id);
    console.log(`  -${String(count).padStart(3)}  keeping "${keeper?.name}" [${id}]`);
  }

  // Saved plans and advice may reference a scheme that is about to disappear.
  // Report it rather than silently orphaning them.
  const doomedIds = new Set(doomed.map((d) => d.doc.id));
  const remap = new Map<string, string>();
  for (const d of doomed) remap.set(d.doc.id, d.supersededBy);

  const plansSnap = await adminDb.collection('plans').get();
  let affectedPlans = 0;
  const planUpdates: { id: string; from: string[]; to: string[] }[] = [];
  for (const doc of plansSnap.docs) {
    const data = doc.data() as { matchedSchemeIds?: string[]; schemeIds?: string[] };
    const field = Array.isArray(data.matchedSchemeIds)
      ? 'matchedSchemeIds'
      : Array.isArray(data.schemeIds)
        ? 'schemeIds'
        : null;
    if (!field) continue;
    const ids: string[] = (data as Record<string, string[]>)[field];
    if (!ids.some((id) => doomedIds.has(id))) continue;
    const rewritten = [...new Set(ids.map((id) => remap.get(id) || id))];
    planUpdates.push({ id: doc.id, from: ids, to: rewritten });
    affectedPlans++;
  }
  console.log(`\nsaved plans referencing a removed scheme: ${affectedPlans}`);
  if (affectedPlans) {
    console.log('  (their references will be repointed at the surviving record, not dropped)');
  }

  if (!EXECUTE) {
    console.log('\nDRY RUN — nothing was written.');
    console.log('Re-run with --execute-confirmed-deletion to apply.');
    return;
  }

  console.log('\nApplying…');

  // Repoint references first: if the run dies midway, plans still point at
  // documents that exist.
  for (const upd of planUpdates) {
    const field = 'matchedSchemeIds';
    await adminDb.collection('plans').doc(upd.id).update({ [field]: upd.to });
  }
  console.log(`  repointed ${planUpdates.length} plan reference set(s)`);

  let deleted = 0;
  const CHUNK = 400; // Firestore batches cap at 500 writes.
  for (let i = 0; i < doomed.length; i += CHUNK) {
    const batch = adminDb.batch();
    for (const d of doomed.slice(i, i + CHUNK)) {
      batch.delete(adminDb.collection('schemes').doc(d.doc.id));
    }
    await batch.commit();
    deleted += Math.min(CHUNK, doomed.length - i);
    console.log(`  deleted ${deleted}/${doomed.length}`);
  }

  const after = await adminDb.collection('schemes').get();
  console.log(`\nDone. Catalogue now holds ${after.size} scheme documents.`);
}

run().catch((err) => {
  console.error('Deduplication failed:', err);
  process.exit(1);
});
