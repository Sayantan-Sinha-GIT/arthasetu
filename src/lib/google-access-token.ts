// ─── Google OAuth2 access tokens from the Firebase service account ───
// Server-side only. Some Google Cloud APIs (Text-to-Speech among them) reject
// API keys outright and require an OAuth2 principal, so the service account
// already configured for Firebase Admin is used to mint one.

import crypto from 'crypto';

interface ServiceAccount {
  clientEmail: string;
  privateKey: string;
  projectId: string;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function getServiceAccount(): ServiceAccount {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.slice(1, -1);
  }
  const sa: {
    privateKey?: string; private_key?: string;
    projectId?: string; project_id?: string;
    clientEmail?: string; client_email?: string;
  } = JSON.parse(raw);

  // The JSON stores newlines as the two characters \ and n; without turning
  // them back into real newlines the PEM fails to decode.
  const privateKey = (sa.privateKey || sa.private_key || '').replace(/\\n/g, '\n');
  const clientEmail = sa.clientEmail || sa.client_email || '';
  const projectId = sa.projectId || sa.project_id || '';
  if (!privateKey || !clientEmail || !projectId) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is missing required fields');
  }
  return { privateKey, clientEmail, projectId };
}

let cached: { token: string; expiresAt: number } | null = null;

/**
 * A cloud-platform scoped access token, cached until shortly before it expires
 * so repeated calls in one warm instance do not re-sign a JWT every time.
 */
export async function getGoogleAccessToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const sa = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = base64url(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  );
  const signature = base64url(
    crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(sa.privateKey)
  );

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${signature}`,
    }),
  });

  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Token exchange failed: ${json.error_description || json.error || res.status}`);
  }

  cached = {
    token: json.access_token,
    expiresAt: Date.now() + Math.max(60, (json.expires_in || 3600) - 60) * 1000,
  };
  return cached.token;
}

export function getServiceAccountProjectId(): string {
  return getServiceAccount().projectId;
}
