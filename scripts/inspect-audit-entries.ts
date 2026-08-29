import * as fs from 'fs';
import * as path from 'path';

// Manual env loader
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

import { adminDb } from '../src/lib/firebase-admin';

async function main() {
  console.log('=== AUDIT ENTRIES IN scheme_updates ===');
  const snap = await adminDb.collection('scheme_updates').get();
  console.log(`Count: ${snap.size}`);
  snap.docs.forEach((doc, idx) => {
    console.log(`\n--- Entry #${idx + 1} | ID: ${doc.id} ---`);
    const data = doc.data();
    console.log(`Action/Status: ${data.status}`);
    console.log(`Scheme ID: ${data.schemeId}`);
    console.log(`Scheme Name: ${data.schemeName}`);
    console.log(`Proposed By: ${data.proposedBy}`);
    console.log(`Reviewed By: ${data.reviewedBy}`);
    console.log(`Timestamp: ${data.timestamp?.toDate ? data.timestamp.toDate().toISOString() : data.timestamp}`);
    console.log(`Reviewed At: ${data.reviewedAt?.toDate ? data.reviewedAt.toDate().toISOString() : data.reviewedAt}`);
    console.log(`Change Summary: ${data.changeSummary}`);
    console.log(`Proposed Changes:`, JSON.stringify(data.proposedChanges, null, 2));
  });

  console.log('\n=== AUDIT ENTRIES IN adminActions ===');
  const adminSnap = await adminDb.collection('adminActions').get();
  console.log(`Count: ${adminSnap.size}`);
  adminSnap.docs.forEach((doc, idx) => {
    console.log(`\n--- Action #${idx + 1} | ID: ${doc.id} ---`);
    console.log(JSON.stringify(doc.data(), null, 2));
  });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
