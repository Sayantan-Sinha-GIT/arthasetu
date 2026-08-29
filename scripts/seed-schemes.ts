import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getFirestore as getClientFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { SEED_SCHEMES } from '../src/lib/schemes/seed-data';

async function runSeed() {
  console.log('🌱 Seeding verified government schemes into Firestore...\n');

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  const db = getClientFirestore(clientApp);

  let successCount = 0;
  for (const scheme of SEED_SCHEMES) {
    const docRef = doc(db, 'schemes', scheme.id);
    await setDoc(
      docRef,
      {
        ...scheme,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`   ✅ Seeded: ${scheme.shortName} (${scheme.governmentLevel === 'central' ? 'Central' : scheme.state})`);
    successCount++;
  }

  console.log(`\n🎉 Successfully seeded ${successCount} verified schemes to Firestore!`);
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
