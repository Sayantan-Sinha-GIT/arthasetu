import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import * as crypto from 'crypto';

export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();

export interface AdminVerificationResult {
  isAdmin: boolean;
  uid?: string;
  email?: string;
  error?: string;
  errorResponse?: NextResponse;
}

export async function verifyAdminRequest(req: NextRequest): Promise<AdminVerificationResult> {
  const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();

  // Extract Bearer token from Authorization header
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  if (!token) {
    return {
      isAdmin: false,
      error: 'Forbidden: Valid admin credentials required',
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Valid admin credentials required',
          code: 'AUTH_REQUIRED',
        },
        { status: 403 }
      ),
    };
  }

  try {
    let uid = '';
    let email = '';
    let hasAdminClaim = false;

    // 1. Primary verification via Firebase Admin SDK
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
      email = (decoded.email || '').trim().toLowerCase();
      hasAdminClaim = decoded.admin === true || decoded.role === 'admin';
    } catch (adminErr: any) {
      // 2. Secondary fallback via Google Identity Toolkit REST API
      // Handles environments where bundlers face CJS/ESM conflicts with jwks-rsa/jose
      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      if (!apiKey) {
        throw adminErr;
      }

      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );

      if (!lookupRes.ok) {
        throw new Error(`Google token lookup failed with status ${lookupRes.status}`);
      }

      const lookupData = await lookupRes.json();
      const user = lookupData.users?.[0];
      if (!user) {
        throw new Error('No user returned from Google token lookup');
      }

      uid = user.localId;
      email = (user.email || '').trim().toLowerCase();

      let customClaims: Record<string, any> = {};
      if (user.customAttributes) {
        try {
          customClaims = JSON.parse(user.customAttributes);
        } catch {
          // ignore parse error
        }
      }
      hasAdminClaim = customClaims.admin === true || customClaims.role === 'admin';
    }

    const emailMatches = email === ADMIN_EMAIL;
    const isAuthorized = hasAdminClaim || emailMatches;

    if (!isAuthorized) {
      return {
        isAdmin: false,
        error: 'Forbidden: Valid admin credentials required',
        errorResponse: NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Valid admin credentials required',
            code: 'FORBIDDEN',
          },
          { status: 403 }
        ),
      };
    }

    return {
      isAdmin: true,
      uid,
      email,
    };
  } catch (error: any) {
    console.error('Admin token verification error:', error?.message || error);
    return {
      isAdmin: false,
      error: 'Forbidden: Valid admin credentials required',
      errorResponse: NextResponse.json(
        {
          success: false,
          error: 'Forbidden: Valid admin credentials required',
          code: 'INVALID_TOKEN',
        },
        { status: 403 }
      ),
    };
  }
}

/**
 * Resiliently deletes a user from Firebase Authentication.
 * First tries Admin SDK, then falls back to Google Identity Toolkit REST API with OAuth2 assertion
 * to guarantee success across any serverless runtime.
 */
export async function deleteAuthUserSafely(uid: string): Promise<boolean> {
  // 1. Primary deletion via Firebase Admin SDK
  try {
    await adminAuth.deleteUser(uid);
    return true;
  } catch (err: any) {
    // If user is already not found, treat as succeeded
    if (err?.code === 'auth/user-not-found') return true;

    // 2. Secondary fallback via Google Identity Toolkit REST API with Service Account OAuth2 token
    try {
      let rawSa = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (!rawSa) return false;
      rawSa = rawSa.trim();
      if ((rawSa.startsWith("'") && rawSa.endsWith("'")) || (rawSa.startsWith('"') && rawSa.endsWith('"'))) {
        rawSa = rawSa.slice(1, -1);
      }
      const sa = JSON.parse(rawSa);
      const privateKey = (sa.privateKey || sa.private_key || '').replace(/\\n/g, '\n');
      const clientEmail = sa.clientEmail || sa.client_email;
      const projectId = sa.projectId || sa.project_id;

      if (!privateKey || !clientEmail || !projectId) return false;

      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const claimSet = Buffer.from(
        JSON.stringify({
          iss: clientEmail,
          scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase',
          aud: 'https://oauth2.googleapis.com/token',
          exp: now + 3600,
          iat: now,
        })
      ).toString('base64url');

      const signer = crypto.createSign('RSA-SHA256');
      signer.update(`${header}.${claimSet}`);
      const signature = signer.sign(privateKey, 'base64url');
      const assertion = `${header}.${claimSet}.${signature}`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion,
        }),
      });

      if (!tokenRes.ok) {
        console.error('Failed to obtain Google OAuth access token for user deletion:', await tokenRes.text());
        return false;
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      const deleteRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            localIds: [uid],
            force: true,
          }),
        }
      );

      return deleteRes.ok;
    } catch (fallbackErr) {
      console.error('Fallback auth user deletion failed:', fallbackErr);
      return false;
    }
  }
}
