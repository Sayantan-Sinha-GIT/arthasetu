import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
const app = getApps().length === 0 ? initializeApp({ credential: cert(sa) }) : getApps()[0];
const auth = getAuth(app);

async function listUsers() {
  const result = await auth.listUsers(20);
  console.log('Registered Users in Firebase Auth:');
  result.users.forEach((u) => {
    console.log(`• ${u.email} (UID: ${u.uid}) - Claims: ${JSON.stringify(u.customClaims || {})}`);
  });
}

listUsers().catch(console.error);
