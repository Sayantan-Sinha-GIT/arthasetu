import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { adminAuth } from '../src/lib/firebase-admin';

async function setAdmin() {
  const email = process.argv[2] || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_TEST_PASSWORD;

  if (!email) {
    console.error('❌ Usage: npx tsx scripts/set-admin.ts <email> [password]');
    process.exit(1);
  }

  try {
    const user = await adminAuth.getUserByEmail(email.trim().toLowerCase());
    await adminAuth.setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ Successfully set admin claim for: ${email} (uid: ${user.uid})`);
    
    if (password) {
      await adminAuth.updateUser(user.uid, { password });
      console.log(`✅ Successfully synchronized admin password for: ${email}`);
    }

    console.log('   Custom claim { admin: true } is active.');
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('no user record')) {
      console.error(`❌ No user found with email: ${email}`);
      console.error('   Make sure the user has signed up first.');
    } else {
      console.error('❌ Error updating admin user:', error);
    }
    process.exit(1);
  }
}

setAdmin();

