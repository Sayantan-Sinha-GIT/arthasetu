import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

async function checkEnumeration() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
  const auth = getAuth(app);

  const nonExistentEmail = 'completely_non_existent_' + Date.now() + '@arthasetu.test';

  console.log('Testing sign-in with non-existent email:', nonExistentEmail);
  try {
    await signInWithEmailAndPassword(auth, nonExistentEmail, 'DummyPassword123!');
  } catch (err: any) {
    console.log('Error Code:', err.code);
    console.log('Error Message:', err.message);
    if (err.code === 'auth/user-not-found') {
      console.log('STATUS: Email enumeration protection is DISABLED (auth/user-not-found is distinct).');
    } else if (err.code === 'auth/invalid-credential') {
      console.log('STATUS: Email enumeration protection is ENABLED (auth/invalid-credential combines user-not-found and wrong-password).');
    } else {
      console.log('STATUS: Other error code received:', err.code);
    }
  }
}

checkEnumeration().catch(console.error);
