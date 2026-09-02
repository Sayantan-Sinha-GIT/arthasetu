import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminDb } from '../src/lib/firebase-admin';

async function runSeed() {
  console.log('🌱 Seeding MASSIVE verified government schemes into Firestore via Admin SDK...\n');

  const inputPath = resolve(process.cwd(), 'scripts', 'massive-seed.json');
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ File not found: ${inputPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(inputPath, 'utf8');
  let schemes = [];
  try {
    schemes = JSON.parse(rawData);
  } catch(e) {
    console.error("❌ Invalid JSON in massive-seed.json", e);
    process.exit(1);
  }

  console.log(`Found ${schemes.length} schemes to seed...`);

  const BATCH_SIZE = 100;
  for (let i = 0; i < schemes.length; i += BATCH_SIZE) {
    const chunk = schemes.slice(i, i + BATCH_SIZE);
    const batch = adminDb.batch();

    for (const scheme of chunk) {
      const docRef = adminDb.collection('schemes').doc(scheme.id);
      batch.set(
        docRef,
        {
          ...scheme,
          updatedAt: new Date(),
          createdAt: new Date()
        },
        { merge: true }
      );
    }

    console.log(`Writing batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
    await batch.commit();
  }

  console.log(`\n🎉 Successfully seeded all ${schemes.length} schemes to Firestore!`);
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
