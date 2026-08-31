import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

import { adminAuth } from '../src/lib/firebase-admin';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function setAdmin() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🛡️ ARTHASETU ADMIN SYNCHRONIZATION & CREDENTIALS PROVISIONING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const email = (process.argv[2] || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();
  const password = (process.argv[3] || process.env.ADMIN_PASSWORD || process.env.ADMIN_TEST_PASSWORD || '').trim();

  if (!email) {
    console.error('❌ Error: Admin email is missing. Set NEXT_PUBLIC_ADMIN_EMAIL in .env.local or pass as arg.');
    process.exit(1);
  }

  if (!password) {
    console.error('❌ Error: Admin password is missing. Set ADMIN_PASSWORD in .env.local or pass as arg.');
    process.exit(1);
  }

  console.log(`• Admin Target Email: "${email}"`);
  console.log(`• Password Source: Single Source of Truth from Environment Variable / Argument`);

  let userRecord;
  try {
    userRecord = await adminAuth.getUserByEmail(email);
    console.log(`• Found existing Firebase user (UID: ${userRecord.uid})`);
  } catch (err: any) {
    if (err.code === 'auth/user-not-found' || err.message?.includes('no user record')) {
      console.log('• User record does not exist. Creating fresh admin user record...');
      userRecord = await adminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: 'System Administrator',
      });
      console.log(`✅ Created admin user with UID: ${userRecord.uid}`);
    } else {
      console.error('❌ Error fetching admin user:', err);
      process.exit(1);
    }
  }

  // Set password and verify email
  await adminAuth.updateUser(userRecord.uid, {
    password,
    emailVerified: true,
  });
  console.log('✅ Synchronized admin password & emailVerified status.');

  // Set custom user claim { admin: true }
  await adminAuth.setCustomUserClaims(userRecord.uid, { admin: true });
  console.log('✅ Set custom claim { admin: true } on Firebase Auth user.');

  // Programmatic verification via Client SDK
  console.log('\n▶ Programmatically verifying client sign-in with the configured credentials...');
  const clientApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const clientAuth = getAuth(clientApp);

  try {
    const cred = await signInWithEmailAndPassword(clientAuth, email, password);
    const tokenResult = await cred.user.getIdTokenResult();
    const hasAdminClaim = !!tokenResult.claims.admin;
    console.log(`✅ Verification Sign-In Succeeded for: ${cred.user.email}`);
    console.log(`✅ Admin Claim Verified on Token: ${hasAdminClaim}`);
    await signOut(clientAuth);
    console.log('✅ Verification Sign-Out Succeeded.\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🎉 ADMIN CREDENTIALS ARE 100% SYNCHRONIZED AND VERIFIED!');
    console.log('═══════════════════════════════════════════════════════════════');
  } catch (verifyErr: any) {
    console.error('❌ Verification sign-in failed:', verifyErr.message);
    process.exit(1);
  }
}

setAdmin().catch((err) => {
  console.error('Fatal error in setAdmin:', err);
  process.exit(1);
});
