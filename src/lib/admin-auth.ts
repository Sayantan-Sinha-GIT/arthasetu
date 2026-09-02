import { NextRequest, NextResponse } from 'next/server';
import { verifyIdTokenRest, deleteUserRest } from '@/lib/firebase-admin-rest';
import { getErrorMessage } from '@/lib/utils/errors';

export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').trim().toLowerCase();

export interface AdminVerificationResult {
  isAdmin: boolean;
  uid?: string;
  email?: string;
  error?: string;
  errorResponse?: NextResponse;
}

export async function verifyAdminRequest(req: NextRequest): Promise<AdminVerificationResult> {
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
    const decoded = await verifyIdTokenRest(token);
    const email = (decoded.email || '').trim().toLowerCase();
    const hasAdminClaim = Boolean(decoded.admin || decoded.role === 'admin');
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
      uid: decoded.uid,
      email,
    };
  } catch (error) {
    console.error('Admin token verification error:', getErrorMessage(error, 'Token verification failed'));
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
 */
export async function deleteAuthUserSafely(uid: string): Promise<boolean> {
  try {
    return await deleteUserRest(uid);
  } catch (error) {
    console.error('Auth user deletion error:', getErrorMessage(error));
    return false;
  }
}
