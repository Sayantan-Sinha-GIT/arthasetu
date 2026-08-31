// ─── Firebase Admin SDK (server-side only) ───
// Used in API routes and server actions for:
// - Verifying ID tokens
// - Setting custom claims (admin role)
// - Server-side Firestore operations
//
// NEVER import this file from client components.

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import {
  verifyIdTokenRest,
  deleteUserRest,
  getUserRest,
  getUserByEmailRest,
  setCustomUserClaimsRest,
} from './firebase-admin-rest';

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
      console.warn('Firebase Admin initialization notice:', err);
    }
  } else {
    initialized = true;
  }
}

/**
 * Universal Admin Auth interface.
 * Attempts native Firebase Admin SDK, seamlessly falling back to REST implementation
 * to guarantee resilience across serverless/bundler environments.
 */
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop: string) {
    // 1. Intercept high-traffic serverless auth methods with reliable REST fallbacks
    if (prop === 'verifyIdToken') {
      return async (idToken: string) => {
        try {
          ensureInitialized();
          const { getAuth: resolveAuth } = require('firebase-admin/auth');
          return await resolveAuth().verifyIdToken(idToken);
        } catch {
          return await verifyIdTokenRest(idToken);
        }
      };
    }

    if (prop === 'deleteUser') {
      return async (uid: string) => {
        try {
          ensureInitialized();
          const { getAuth: resolveAuth } = require('firebase-admin/auth');
          return await resolveAuth().deleteUser(uid);
        } catch {
          const success = await deleteUserRest(uid);
          if (!success) throw new Error(`Failed to delete user ${uid} via REST fallback`);
        }
      };
    }

    if (prop === 'getUser') {
      return async (uid: string) => {
        try {
          ensureInitialized();
          const { getAuth: resolveAuth } = require('firebase-admin/auth');
          return await resolveAuth().getUser(uid);
        } catch {
          const user = await getUserRest(uid);
          if (!user) {
            const err: any = new Error(`No user record found for ${uid}`);
            err.code = 'auth/user-not-found';
            throw err;
          }
          return user;
        }
      };
    }

    if (prop === 'getUserByEmail') {
      return async (email: string) => {
        try {
          ensureInitialized();
          const { getAuth: resolveAuth } = require('firebase-admin/auth');
          return await resolveAuth().getUserByEmail(email);
        } catch {
          const user = await getUserByEmailRest(email);
          if (!user) {
            const err: any = new Error(`No user record found for email ${email}`);
            err.code = 'auth/user-not-found';
            throw err;
          }
          return user;
        }
      };
    }

    if (prop === 'setCustomUserClaims') {
      return async (uid: string, customClaims: Record<string, any>) => {
        try {
          ensureInitialized();
          const { getAuth: resolveAuth } = require('firebase-admin/auth');
          return await resolveAuth().setCustomUserClaims(uid, customClaims);
        } catch {
          return await setCustomUserClaimsRest(uid, customClaims);
        }
      };
    }

    // Default dynamic delegation to firebase-admin/auth
    ensureInitialized();
    const { getAuth: resolveAuth } = require('firebase-admin/auth');
    const authInstance = resolveAuth();
    const val = (authInstance as any)[prop];
    return typeof val === 'function' ? val.bind(authInstance) : val;
  },
});

export const adminDb = new Proxy({} as Firestore, {
  get(_, prop: string) {
    ensureInitialized();
    const { getFirestore: resolveDb } = require('firebase-admin/firestore');
    const dbInstance = resolveDb();
    const val = (dbInstance as any)[prop];
    return typeof val === 'function' ? val.bind(dbInstance) : val;
  },
});
