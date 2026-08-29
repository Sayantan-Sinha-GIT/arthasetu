/**
 * Admin Bootstrap Script
 *
 * Sets the Firebase custom claim { admin: true } on a user identified by email.
 * Run once after creating your first account to promote it to admin.
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts user@example.com
 *
 * Requirements:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY must be set in .env.local
 *   - The user must have already signed up (email must exist in Firebase Auth)
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local from project root
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function setAdmin() {
  const email = process.argv[2];

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/set-admin.ts <email>');
    process.exit(1);
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(raw) as ServiceAccount;
  initializeApp({ credential: cert(serviceAccount) });

  const auth = getAuth();

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Successfully set admin claim for: ${email} (uid: ${user.uid})`);
    console.log('');
    console.log('⚠️  The user must log out and log back in for the claim to take effect.');
    console.log('   (Or force a token refresh in the browser.)');
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('no user record')) {
      console.error(`❌ No user found with email: ${email}`);
      console.error('   Make sure the user has signed up first.');
    } else {
      console.error('❌ Error:', error);
    }
    process.exit(1);
  }
}

setAdmin();
