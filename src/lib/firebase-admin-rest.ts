import * as crypto from 'crypto';
import { getErrorMessage } from '@/lib/utils/errors';

export interface DecodedRestToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  admin?: boolean;
  role?: string;
  claims: Record<string, any>;
  [key: string]: any;
}

export interface RestUserRecord {
  uid: string;
  email?: string;
  emailVerified?: boolean;
  displayName?: string;
  disabled?: boolean;
  customClaims?: Record<string, any>;
  createdAt?: string;
  lastLoginAt?: string;
}

interface OAuthTokenCache {
  token: string;
  expiresAt: number; // Unix timestamp in ms
}

let cachedOAuthToken: OAuthTokenCache | null = null;

function getServiceAccountCredentials(): { projectId: string; clientEmail: string; privateKey: string } {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables');
  }
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }
  try {
    const sa = JSON.parse(raw);
    const privateKey = (sa.privateKey || sa.private_key || '').replace(/\\n/g, '\n');
    const projectId = sa.projectId || sa.project_id;
    const clientEmail = sa.clientEmail || sa.client_email;
    if (!privateKey || !projectId || !clientEmail) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY missing required fields (project_id, client_email, private_key)');
    }
    return { projectId, clientEmail, privateKey };
  } catch (err) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY: ${getErrorMessage(err, 'Invalid format')}`);
  }
}

/**
 * Generates and securely caches a Google OAuth2 Access Token using Service Account RSA assertion.
 * Token is cached in-memory and automatically refreshed 60 seconds before expiration.
 * Private keys and raw tokens are never logged.
 */
export async function getGoogleOAuthAccessToken(): Promise<string> {
  const nowMs = Date.now();
  if (cachedOAuthToken && cachedOAuthToken.expiresAt > nowMs + 60000) {
    return cachedOAuthToken.token;
  }

  const { clientEmail, privateKey } = getServiceAccountCredentials();
  const nowSec = Math.floor(nowMs / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimSet = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
      aud: 'https://oauth2.googleapis.com/token',
      exp: nowSec + 3600,
      iat: nowSec,
    })
  ).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${header}.${claimSet}`);
  const signature = signer.sign(privateKey, 'base64url');
  const assertion = `${header}.${claimSet}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to exchange service account JWT for OAuth token (status: ${res.status})`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('OAuth token response missing access_token');
  }

  const expiresInSec = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  cachedOAuthToken = {
    token: data.access_token,
    expiresAt: nowMs + expiresInSec * 1000,
  };

  return data.access_token;
}

/**
 * Verifies a Firebase ID Token using Google Identity Toolkit REST API.
 * Returns the decoded token payload including custom attributes / claims.
 * Throws an error if the token is invalid or expired.
 */
export async function verifyIdTokenRest(idToken: string): Promise<DecodedRestToken> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ID token must be a non-empty string');
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is missing');
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Token verification failed with HTTP status ${res.status}`);
  }

  const data = await res.json();
  const user = data.users?.[0];
  if (!user || !user.localId) {
    throw new Error('Invalid ID token: No user profile found');
  }

  let claims: Record<string, any> = {};
  if (user.customAttributes) {
    try {
      claims = JSON.parse(user.customAttributes);
    } catch {
      claims = {};
    }
  }

  return {
    uid: user.localId,
    email: user.email ? user.email.trim().toLowerCase() : undefined,
    email_verified: Boolean(user.emailVerified),
    admin: Boolean(claims.admin === true || claims.role === 'admin'),
    role: claims.role || (claims.admin ? 'admin' : undefined),
    claims,
    ...claims,
  };
}

/**
 * Permanently deletes a user from Firebase Authentication by UID using Google Identity Toolkit REST API.
 * Uses service-account OAuth2 access token with force: true.
 */
export async function deleteUserRest(uid: string): Promise<boolean> {
  if (!uid || typeof uid !== 'string') {
    throw new Error('Target UID must be a non-empty string');
  }

  const { projectId } = getServiceAccountCredentials();
  const accessToken = await getGoogleOAuthAccessToken();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      localIds: [uid],
      force: true,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    console.error(`Google Identity batchDelete failed with status ${res.status}`);
    return false;
  }

  const data = await res.json();
  if (data.errors && data.errors.length > 0) {
    console.warn('Identity batchDelete returned notices:', data.errors[0]?.message);
  }

  return true;
}

/**
 * Retrieves a user record by UID using Google Identity Toolkit REST API.
 */
export async function getUserRest(uid: string): Promise<RestUserRecord | null> {
  const { projectId } = getServiceAccountCredentials();
  const accessToken = await getGoogleOAuthAccessToken();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      localId: [uid],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const user = data.users?.[0];
  if (!user) return null;

  let customClaims: Record<string, any> = {};
  if (user.customAttributes) {
    try {
      customClaims = JSON.parse(user.customAttributes);
    } catch {}
  }

  return {
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    disabled: user.disabled,
    customClaims,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Retrieves a user record by Email using Google Identity Toolkit REST API.
 */
export async function getUserByEmailRest(email: string): Promise<RestUserRecord | null> {
  const { projectId } = getServiceAccountCredentials();
  const accessToken = await getGoogleOAuthAccessToken();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      email: [email],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const user = data.users?.[0];
  if (!user) return null;

  let customClaims: Record<string, any> = {};
  if (user.customAttributes) {
    try {
      customClaims = JSON.parse(user.customAttributes);
    } catch {}
  }

  return {
    uid: user.localId,
    email: user.email,
    emailVerified: user.emailVerified,
    displayName: user.displayName,
    disabled: user.disabled,
    customClaims,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Sets custom claims on a user using Google Identity Toolkit REST API.
 */
export async function setCustomUserClaimsRest(uid: string, claims: Record<string, any>): Promise<void> {
  const { projectId } = getServiceAccountCredentials();
  const accessToken = await getGoogleOAuthAccessToken();

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      localId: uid,
      customAttributes: JSON.stringify(claims),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Failed to update custom claims via Identity Toolkit (status: ${res.status})`);
  }
}
