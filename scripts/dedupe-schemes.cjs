/**
 * Collapses duplicate scheme records in massive-seed.json.
 *
 * Records sharing a normalised name are one programme. The most complete
 * record survives (see completenessScore); the rest are dropped. Where the
 * survivor is missing a field a discarded sibling had, that field is carried
 * across, so removing records never loses information.
 *
 *   node scripts/dedupe-schemes.cjs           # dry run, prints the plan
 *   node scripts/dedupe-schemes.cjs --write   # rewrite the seed file
 */
const fs = require('fs');
const path = require('path');
const {
  normaliseSchemeName,
  normaliseUrl,
  completenessScore,
} = require('./scheme-identity.cjs');

const write = process.argv.includes('--write');
const seedPath = path.resolve(__dirname, 'massive-seed.json');
const parsed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const isBareArray = Array.isArray(parsed);
const schemes = isBareArray ? parsed : parsed.schemes || Object.values(parsed).find(Array.isArray) || [];

const groups = new Map();
for (const scheme of schemes) {
  const key = normaliseSchemeName(scheme.name) || `__unnamed_${scheme.id}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(scheme);
}

const kept = [];
const removed = [];
const merges = [];

for (const [key, group] of groups) {
  if (group.length === 1) {
    kept.push(group[0]);
    continue;
  }
  const ranked = [...group].sort((a, b) => completenessScore(b) - completenessScore(a));
  const survivor = { ...ranked[0] };
  const discarded = ranked.slice(1);

  // Backfill anything the survivor lacks from its better-populated siblings.
  const filled = [];
  for (const other of discarded) {
    for (const [field, value] of Object.entries(other)) {
      const missing =
        survivor[field] === undefined ||
        survivor[field] === null ||
        survivor[field] === '' ||
        (Array.isArray(survivor[field]) && survivor[field].length === 0);
      const usable = value !== undefined && value !== null && value !== '' &&
        !(Array.isArray(value) && value.length === 0);
      if (missing && usable) {
        survivor[field] = value;
        filled.push(field);
      }
    }
  }

  kept.push(survivor);
  removed.push(...discarded);
  merges.push({
    key,
    keptId: survivor.id,
    keptName: survivor.name,
    dropped: discarded.length,
    backfilled: [...new Set(filled)],
  });
}

// Second pass: same official portal AND one name contained in the other.
//
// "PM Vishwakarma Scheme" and "Prime Minister's Vishwakarma Kaushal Samman"
// are the same programme under its short and full titles, but normalise to
// different strings, so pass one keeps both. Containment plus a shared portal
// catches that. Sharing a URL alone is deliberately not enough — several
// distinct handicraft schemes share handicrafts.nic.in as a landing page, and
// collapsing those would destroy real records.
const byUrl = new Map();
for (const scheme of kept) {
  const url = normaliseUrl(scheme.officialUrl);
  if (!url) continue;
  if (!byUrl.has(url)) byUrl.set(url, []);
  byUrl.get(url).push(scheme);
}

const secondPassDropped = new Set();
for (const [, group] of byUrl) {
  if (group.length < 2) continue;
  const ranked = [...group].sort((a, b) => completenessScore(b) - completenessScore(a));
  for (let i = 0; i < ranked.length; i++) {
    const a = ranked[i];
    if (secondPassDropped.has(a)) continue;
    const nameA = normaliseSchemeName(a.name);
    for (let j = i + 1; j < ranked.length; j++) {
      const b = ranked[j];
      if (secondPassDropped.has(b)) continue;
      const nameB = normaliseSchemeName(b.name);
      const contained =
        nameA.startsWith(nameB + ' ') || nameB.startsWith(nameA + ' ') ||
        nameA === nameB;
      if (!contained) continue;
      secondPassDropped.add(b);
      removed.push(b);
      merges.push({ key: nameA + ' (via shared portal)', keptId: a.id, keptName: a.name, dropped: 1, backfilled: [] });
    }
  }
}

if (secondPassDropped.size) {
  for (let i = kept.length - 1; i >= 0; i--) {
    if (secondPassDropped.has(kept[i])) kept.splice(i, 1);
  }
}

merges.sort((a, b) => b.dropped - a.dropped);

console.log(`records before : ${schemes.length}`);
console.log(`records after  : ${kept.length}`);
console.log(`removed        : ${removed.length}`);
console.log(`\nlargest collapses:`);
for (const m of merges.slice(0, 12)) {
  const back = m.backfilled.length ? `  (backfilled: ${m.backfilled.join(', ')})` : '';
  console.log(`  -${String(m.dropped).padStart(3)}  kept "${m.keptName}" [${m.keptId}]${back}`);
}

if (!write) {
  console.log('\nDry run. Re-run with --write to apply.');
  process.exit(0);
}

const output = isBareArray ? kept : { ...parsed, schemes: kept };
fs.writeFileSync(seedPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
console.log(`\nWrote ${kept.length} records to ${path.basename(seedPath)}`);
