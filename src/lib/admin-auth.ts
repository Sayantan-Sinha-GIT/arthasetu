import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

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
