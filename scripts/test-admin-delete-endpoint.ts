import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';

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

async function testEndpointSecurity() {
  console.log('🛡️ Testing /api/admin/users/delete Endpoint Authorization Guard...\n');

  // 1. Test unauthenticated request
  console.log('1️⃣ Hitting endpoint without Authorization header...');
  const unauthRes = await fetch('http://localhost:3000/api/admin/users/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUid: 'some-uid' }),
  });
  console.log(`   Status: ${unauthRes.status} (Expected 403)`);
  if (unauthRes.status !== 403) {
    throw new Error(`Expected 403, got ${unauthRes.status}`);
  }

  // 2. Test authenticated NON-admin user request
  console.log('2️⃣ Creating temporary non-admin user...');
  const nonAdminEmail = `temp_non_admin_${Date.now()}@arthasetu.test`;
  const cred = await createUserWithEmailAndPassword(auth, nonAdminEmail, 'TempPass123!');
  const token = await cred.user.getIdToken();

  console.log('3️⃣ Hitting endpoint with non-admin bearer token...');
  const nonAdminRes = await fetch('http://localhost:3000/api/admin/users/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ targetUid: 'some-uid' }),
  });
  console.log(`   Status: ${nonAdminRes.status} (Expected 403)`);
  if (nonAdminRes.status !== 403) {
    throw new Error(`Expected 403, got ${nonAdminRes.status}`);
  }

  // Clean up
  await deleteUser(cred.user);
  console.log('\n✅ Non-admin rejection test PASSED 100% (Strict 403 Forbidden enforced)!');
}

testEndpointSecurity().catch(console.error);
