import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
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
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin#2026!Artha';

  console.log(`Signing in as admin: ${adminEmail}...`);
  await signInWithEmailAndPassword(auth, adminEmail!, adminPassword);
  console.log('Signed in successfully.');

  console.log('=== QUERYING scheme_updates COLLECTION ===');
  const snap = await getDocs(collection(db, 'scheme_updates'));
  console.log(`Total Documents Found: ${snap.size}\n`);
  
  snap.docs.forEach((doc, idx) => {
    console.log(`======================================================`);
    console.log(`ENTRY #${idx + 1} | ID: ${doc.id}`);
    console.log(`======================================================`);
    const data = doc.data();
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');
  });
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
