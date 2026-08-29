import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

async function inspectAuditLogs() {
  console.log('=== QUERYING scheme_updates COLLECTION (Client SDK) ===');
  const snap = await getDocs(collection(db, 'scheme_updates'));
  console.log(`Total Documents Found: ${snap.size}`);
  snap.docs.forEach((doc, idx) => {
    console.log(`\n======================================================`);
    console.log(`ENTRY #${idx + 1} | DOCUMENT ID: ${doc.id}`);
    console.log(`======================================================`);
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2));
  });
}

inspectAuditLogs().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
