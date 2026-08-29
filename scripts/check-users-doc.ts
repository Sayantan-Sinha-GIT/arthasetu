import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
import { adminDb } from '../src/lib/firebase-admin';

async function checkUserDoc() {
  const usersSnap = await adminDb.collection('users').get();
  console.log('Users count:', usersSnap.size);
  usersSnap.docs.forEach((d) => {
    console.log('Doc ID:', d.id, 'Data:', d.data());
  });
}

checkUserDoc().catch(console.error);
