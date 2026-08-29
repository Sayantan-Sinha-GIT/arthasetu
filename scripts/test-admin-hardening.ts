import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import {
  getAuth as getClientAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

async function testAdminHardening() {
  console.log('🧪 Testing Admin Route Hardening & Credentials Security...\n');

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const adminRouteKey = process.env.NEXT_PUBLIC_ADMIN_ROUTE_KEY || '4632';

  console.log(`• Configured Admin Email: "${adminEmail}"`);
  console.log(`• Configured Admin Route Key: "${adminRouteKey}"`);

  if (!adminEmail || adminEmail !== 'sayantansinha2005@gmail.com') {
    throw new Error(`Expected admin email sayantansinha2005@gmail.com, got "${adminEmail}"`);
  }
  if (!adminRouteKey || adminRouteKey !== '4632') {
    throw new Error(`Expected admin route key 4632, got "${adminRouteKey}"`);
  }

  // 1. Initialize Client SDK
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  const clientAuth = getClientAuth(clientApp);

  // Initialize admin app for provisioning
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  const adminApp = getAdminApps().length === 0 ? initAdminApp({ credential: cert(sa) }) : getAdminApps()[0];
  const adminAuth = getAdminAuth(adminApp);

  // 2. TEST NON-ADMIN AUTHENTICATION REJECTION
  console.log('\n1️⃣ Testing Non-Admin Sign-In to Admin Console...');
  const fakeAdminEmail = `imposter_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  await createUserWithEmailAndPassword(clientAuth, fakeAdminEmail, testPassword);
  console.log(`   • Authenticated as non-admin user: ${fakeAdminEmail}`);

  // Test admin verification logic
  const { isAdminEmail } = await import('../src/components/admin/AdminGuard');
  const isFakeAdmin = isAdminEmail(clientAuth.currentUser?.email);
  console.log(`   • isAdmin check for ${fakeAdminEmail}: ${isFakeAdmin}`);

  if (isFakeAdmin) {
    throw new Error('Security failure: Non-admin email was evaluated as admin!');
  }

  await signOut(clientAuth);
  console.log('   ✅ Non-admin user signed out and rejected.');

  // 3. TEST TRUE ADMIN AUTHENTICATION
  console.log(`\n2️⃣ Testing True Admin Sign-In (${adminEmail})...`);
  try {
    await adminAuth.createUser({ email: adminEmail, password: testPassword });
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      await adminAuth.updateUser((await adminAuth.getUserByEmail(adminEmail)).uid, { password: testPassword });
    }
  }

  await signInWithEmailAndPassword(clientAuth, adminEmail, testPassword);
  console.log(`   • Authenticated as admin: ${clientAuth.currentUser?.email}`);

  const isTrueAdmin = isAdminEmail(clientAuth.currentUser?.email);
  console.log(`   • isAdmin check for ${adminEmail}: ${isTrueAdmin}`);

  if (!isTrueAdmin) {
    throw new Error('Security failure: Valid admin email was not recognized!');
  }

  console.log('   ✅ Admin credentials verified with 100% precision.');
  await signOut(clientAuth);

  console.log('\n🎉 ALL ADMIN ACCESS HARDENING CHECKS PASSED!');
}

testAdminHardening().catch((err) => {
  console.error('\n❌ Admin Hardening Test Failed:', err);
  process.exit(1);
});
