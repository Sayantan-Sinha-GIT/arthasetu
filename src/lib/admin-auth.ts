import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'sayantansinha2005@gmail.com').toLowerCase().trim();

export interface AdminVerificationResult {
  isAdmin: boolean;
  uid?: string;
  email?: string;
  decoded?: DecodedIdToken;
  error?: string;
}

/**
 * Single source of truth for server-side admin authorization across all admin API routes.
 * 
 * Verifies the Firebase ID token from the Authorization header and verifies that:
 * 1. The ID token is cryptographically valid and unexpired.
 * 2. The user has the Firebase custom claim { admin: true } OR matches the verified canonical admin email.
 */
export async function verifyAdminRequest(req: NextRequest): Promise<AdminVerificationResult> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAdmin: false,
        error: 'Forbidden: Missing or invalid Authorization header. Valid admin credentials required.',
      };
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return {
        isAdmin: false,
        error: 'Forbidden: Empty Bearer token provided.',
      };
    }

    const decoded = await adminAuth.verifyIdToken(token);
    const email = decoded.email?.toLowerCase().trim();
    const hasAdminClaim = decoded.admin === true;
    const isMatchingAdminEmail = !!email && email === ADMIN_EMAIL;

    if (hasAdminClaim || isMatchingAdminEmail) {
      return {
        isAdmin: true,
        uid: decoded.uid,
        email: email || ADMIN_EMAIL,
        decoded,
      };
    }

    return {
      isAdmin: false,
      uid: decoded.uid,
      email,
      error: 'Forbidden: User is not authorized for administrative operations.',
    };
  } catch (err: any) {
    console.error('Admin token verification error:', err?.message || err);
    return {
      isAdmin: false,
      error: 'Forbidden: Valid admin credentials required.',
    };
  }
}
