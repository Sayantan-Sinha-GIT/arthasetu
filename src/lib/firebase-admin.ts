// ─── Firebase Admin SDK (server-side only) ───
// Used in API routes and server actions for:
// - Verifying ID tokens
// - Setting custom claims (admin role)
// - Server-side Firestore operations when needed
//
// NEVER import this file from client components.

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  dotenv.config({ path: resolve(process.cwd(), '.env.local') });
}

function getServiceAccount(): ServiceAccount {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not set. ' +
      'Set it in .env.local with the JSON content of your service account key.'
    );
  }
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    if (sa.privateKey && typeof sa.privateKey === 'string') {
      sa.privateKey = sa.privateKey.replace(/\\n/g, '\n');
    }
    return sa;
  } catch (err) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON: ' + (err instanceof Error ? err.message : String(err))
    );
  }
}

// Singleton: initialize once
if (getApps().length === 0) {
  initializeApp({
    credential: cert(getServiceAccount()),
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
