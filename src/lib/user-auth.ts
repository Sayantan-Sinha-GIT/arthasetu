import { NextRequest, NextResponse } from 'next/server';
import { verifyIdTokenRest } from '@/lib/firebase-admin-rest';
import { getErrorMessage } from '@/lib/utils/errors';

export type UserVerification =
  | { ok: true; uid: string; email?: string }
  | { ok: false; response: NextResponse };

/** Reads "Authorization: Bearer <Firebase ID token>". Null when there is none. */
export function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Identifies the signed-in user behind a request.
 *
 * Profile saves used to be written to Firestore straight from the browser, and
 * the advisor route used to trust whatever uid the request body named. Both now
 * go through here: the uid comes from a verified Firebase ID token and from
 * nowhere else, so a request can only ever touch its own caller's records.
 */
export async function verifyUserRequest(req: NextRequest): Promise<UserVerification> {
  const token = bearerToken(req);
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Please sign in again to save your changes.', code: 'AUTH_REQUIRED' },
        { status: 401 }
      ),
    };
  }
  try {
    const decoded = await verifyIdTokenRest(token);
    return { ok: true, uid: decoded.uid, email: decoded.email };
  } catch (error) {
    console.error('User token verification failed:', getErrorMessage(error, 'invalid token'));
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Your sign-in has expired. Please sign in again.', code: 'INVALID_TOKEN' },
        { status: 401 }
      ),
    };
  }
}

/**
 * The verified uid when the request carries a valid sign-in, otherwise null.
 * For routes that also serve signed-out visitors but must not save anything
 * on their behalf.
 */
export async function optionalUserUid(req: NextRequest): Promise<string | null> {
  const token = bearerToken(req);
  if (!token) return null;
  try {
    return (await verifyIdTokenRest(token)).uid;
  } catch {
    return null;
  }
}
