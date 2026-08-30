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
    const sa: any = JSON.parse(raw);
    const privateKey = (sa.privateKey || sa.private_key || '').replace(/\\n/g, '\n');
    const projectId = sa.projectId || sa.project_id;
    const clientEmail = sa.clientEmail || sa.client_email;
    if (!privateKey || !projectId || !clientEmail) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields (project_id, client_email, private_key).'
      );
    }
    return { projectId, clientEmail, privateKey } as ServiceAccount;
  } catch (err) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON or missing fields: ' + (err instanceof Error ? err.message : String(err))
    );
  }
}

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  if (getApps().length === 0) {
    try {
      const sa = getServiceAccount();
      initializeApp({
        credential: cert(sa),
      });
      initialized = true;
    } catch (err) {
      console.warn('Firebase Admin initialization skipped or deferred:', err);
    }
  } else {
    initialized = true;
  }
}

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    ensureInitialized();
    const authInstance = getAuth();
    const val = (authInstance as any)[prop];
    return typeof val === 'function' ? val.bind(authInstance) : val;
  },
});

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    ensureInitialized();
    const dbInstance = getFirestore();
    const val = (dbInstance as any)[prop];
    return typeof val === 'function' ? val.bind(dbInstance) : val;
  },
});
