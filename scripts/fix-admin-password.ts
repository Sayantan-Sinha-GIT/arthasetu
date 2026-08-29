import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
const app = getApps().length === 0 ? initializeApp({ credential: cert(sa) }) : getApps()[0];
const auth = getAuth(app);

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com';
const NEW_PASSWORD = process.argv[2] || process.env.ADMIN_TEST_PASSWORD;

if (!NEW_PASSWORD) {
  console.error('❌ Error: Missing admin password. Provide as CLI argument or set ADMIN_TEST_PASSWORD in .env.local');
  process.exit(1);
}

async function run() {
  console.log('=== Step 1: Listing all Firebase Auth accounts ===');
  const userRecords = await auth.listUsers(100);
  console.log(`Total users found: ${userRecords.users.length}`);

  let matchedAccount: any = null;
  const potentialNearMatches: any[] = [];

  for (const u of userRecords.users) {
    const email = u.email || '';
    const creationTime = u.metadata.creationTime;
    const lastSignInTime = u.metadata.lastSignInTime;
    console.log(`- UID: ${u.uid} | Email: "${email}" | Created: ${creationTime} | LastSignIn: ${lastSignInTime} | Claims: ${JSON.stringify(u.customClaims || {})}`);

    if (email === ADMIN_EMAIL) {
      matchedAccount = u;
    } else if (email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() || email.includes('sayantansinha')) {
      potentialNearMatches.push(u);
    }
  }

  console.log('\n=== Matching verification ===');
  if (matchedAccount) {
    console.log(`EXACT MATCH CONFIRMED: UID=${matchedAccount.uid}, Email="${matchedAccount.email}"`);
  } else {
    console.log(`NO EXACT MATCH for "${ADMIN_EMAIL}"!`);
  }

  if (potentialNearMatches.length > 0) {
    console.log(`FLAGGED NEAR MATCHES:`, potentialNearMatches.map(m => `"${m.email}" (${m.uid})`));
  } else {
    console.log('No near-duplicate emails found.');
  }

  if (!matchedAccount) {
    console.error('Cannot proceed with password reset: exact admin account not found.');
    return;
  }

  console.log('\n=== Step 3: Surgical Password Reset via Admin SDK ===');
  console.log(`Setting password on UID: ${matchedAccount.uid} (${matchedAccount.email})...`);
  await auth.updateUser(matchedAccount.uid, {
    password: NEW_PASSWORD,
  });

  // Ensure admin custom claim is also present
  await auth.setCustomUserClaims(matchedAccount.uid, { admin: true });

  console.log(`SUCCESS: Password updated successfully for ${matchedAccount.email}!`);
  console.log(`New Password: ${NEW_PASSWORD}`);
}

run().catch(console.error);
