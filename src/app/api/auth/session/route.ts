import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase-admin';

// Verify ID token and return user claims (including admin status)
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'ID token required' },
        { status: 400 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);

    return NextResponse.json({
      success: true,
      data: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        isAdmin: !!decodedToken.admin,
      },
    });
  } catch (error: unknown) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}
