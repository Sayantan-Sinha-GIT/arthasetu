/**
 * Fails if the scheme catalogue contains duplicate records.
 *
 * Guards against the defect found before the SIH submission: the generated
 * seed held one scheme up to 23 times under variant names, so the matcher
 * offered users the same programme repeatedly at different match percentages.
 *
 *   node scripts/check-scheme-duplicates.cjs            # seed file
 *   node scripts/check-scheme-duplicates.cjs --verbose  # list every collision
 *
 * Exit code 1 on any duplicate, so it can gate a commit or a seeding run.
 */
const fs = require('fs');
const path = require('path');
const {
  normaliseSchemeName,
  normaliseUrl,
  findCollisions,
} = require('./scheme-identity.cjs');

const verbose = process.argv.includes('--verbose');
const seedPath = path.resolve(__dirname, 'massive-seed.json');

if (!fs.existsSync(seedPath)) {
  console.error(`Seed file not found: ${seedPath}`);
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const schemes = Array.isArray(parsed)
  ? parsed
  : parsed.schemes || Object.values(parsed).find(Array.isArray) || [];

console.log(`Checking ${schemes.length} scheme records in massive-seed.json\n`);

const nameCollisions = findCollisions(schemes, (s) => normaliseSchemeName(s.name));
const urlCollisions = findCollisions(schemes, (s) => normaliseUrl(s.officialUrl));
const idCollisions = findCollisions(schemes, (s) => String(s.id || '').trim());

function report(label, collisions) {
  if (!collisions.length) {
    console.log(`OK   ${label}: no duplicates`);
    return 0;
  }
  const extra = collisions.reduce((sum, [, g]) => sum + g.length - 1, 0);
  console.log(`FAIL ${label}: ${collisions.length} group(s), ${extra} redundant record(s)`);
  const shown = verbose ? collisions : collisions.slice(0, 5);
  for (const [key, group] of shown) {
    console.log(`       ${String(group.length).padStart(3)}x  ${key}`);
    if (verbose) {
      for (const s of group) console.log(`            - ${s.id}  ${s.name}`);
    }
  }
  if (!verbose && collisions.length > shown.length) {
    console.log(`       ... and ${collisions.length - shown.length} more (--verbose to list)`);
  }
  return extra;
}

let failures = 0;
failures += report('duplicate id', idCollisions);
failures += report('normalised name', nameCollisions);

// A shared official URL is a strong signal but not proof: several state
// programmes legitimately share a departmental landing page. Reported as a
// warning so it gets a human look without blocking the build.
if (urlCollisions.length) {
  const extra = urlCollisions.reduce((sum, [, g]) => sum + g.length - 1, 0);
  console.log(`WARN official URL shared by ${urlCollisions.length} group(s), ${extra} record(s) beyond the first`);
  for (const [key, group] of urlCollisions.slice(0, verbose ? urlCollisions.length : 5)) {
    console.log(`       ${String(group.length).padStart(3)}x  ${key}`);
  }
}

console.log('');
if (failures > 0) {
  console.error(`Scheme catalogue has ${failures} duplicate record(s). Run scripts/dedupe-schemes.cjs.`);
  process.exit(1);
}
console.log('Scheme catalogue is free of duplicate ids and names.');
