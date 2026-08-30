import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth, adminDb } from '../src/lib/firebase-admin';

async function cleanup() {
  const uids = [
    '21hVIArsBOZ7M83QfWu3dA9Z94s2',
    'E9imKFs80zVidFpo51kOFTC7aks1',
    'qqOn7r9vHmVfy4Ax3iEYEE9cPUo2',
  ];

  for (const uid of uids) {
    try {
      await adminAuth.deleteUser(uid);
      await adminDb.collection('users').doc(uid).delete();
      console.log('Cleaned up:', uid);
    } catch (e: any) {
      console.log(`Could not delete ${uid}:`, e.message);
    }
  }
}

cleanup();
