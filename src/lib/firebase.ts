// ─── Firebase Client SDK (browser-safe) ───
// This file initializes Firebase for client-side usage (auth + Firestore reads/writes).
// NEVER import firebase-admin here.

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only once (prevents duplicate app errors in dev with HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

/**
 * Keeps a copy of every document the user has read on the device itself, so the
 * dashboard, profile and saved plans still show the user's real data with no
 * signal. Without it an offline read simply throws, and the app renders the
 * signed-in user as if they were brand new: empty figures, "complete your
 * profile", no plans.
 *
 * Prerendering runs on the server, which has no IndexedDB, so it gets a memory
 * cache. Hot reload in development re-runs this module against an app whose
 * Firestore is already initialised, which throws; that case reuses it.
 */
function createDb(): Firestore {
  const localCache =
    typeof window === 'undefined'
      ? memoryLocalCache()
      : persistentLocalCache({ tabManager: persistentMultipleTabManager() });
  try {
    return initializeFirestore(app, { localCache });
  } catch {
    return getFirestore(app);
  }
}

export const auth = getAuth(app);
export const db = createDb();
export default app;
