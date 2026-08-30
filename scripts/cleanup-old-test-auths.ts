import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth } from '../src/lib/firebase-admin';

async function cleanupOldTestAuths() {
  const testUids = [
    'Kb7cJ3Wuh6ZT8zPuAQIYyBtbqCG3',
    'SupeIqbyCXUZKdyFFkRWderOMIF3',
    'dMBfo5QAfrgt1cbCdPCNLr14tRo2'
  ];

  for (const uid of testUids) {
    try {
      await adminAuth.deleteUser(uid);
      console.log(`🧹 Cleaned up old test auth: ${uid}`);
    } catch (e: any) {
      console.log(`Could not delete ${uid}: ${e.message}`);
    }
  }
}

cleanupOldTestAuths();
