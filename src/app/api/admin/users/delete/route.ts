import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth';
import { deleteUserData } from '@/lib/server/delete-user-data';
import { getErrorMessage } from '@/lib/utils/errors';

export const maxDuration = 60;

interface TargetAccount {
  email?: string;
  customClaims?: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, uid: adminUid, email: adminEmail, error: authError } = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: authError || 'Forbidden: Valid admin credentials required.' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const targetUid = typeof body?.targetUid === 'string' ? body.targetUid.trim() : '';

    if (!targetUid || targetUid.includes('/')) {
      return NextResponse.json(
        { success: false, error: 'Target UID is required' },
        { status: 400 }
      );
    }

    // Deleting the account you are signed in with would lock the console out.
    if (targetUid === adminUid) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete the admin account you are signed in with.' },
        { status: 400 }
      );
    }

    const [profileSnap, account] = await Promise.all([
      adminDb.collection('users').doc(targetUid).get(),
      (adminAuth.getUser(targetUid) as Promise<TargetAccount>).catch(() => null),
    ]);

    // An ID with neither a profile nor a login used to be reported as deleted, with
    // an audit entry for a deletion that never happened.
    if (!profileSnap.exists && !account) {
      return NextResponse.json(
        { success: false, error: `No user with the ID "${targetUid}" exists. They may already have been deleted.` },
        { status: 404 }
      );
    }

    const targetEmail = (account?.email || profileSnap.data()?.email || body?.targetEmail || '').toString();
    if (account?.customClaims?.admin === true || (targetEmail && targetEmail.trim().toLowerCase() === ADMIN_EMAIL)) {
      return NextResponse.json(
        { success: false, error: 'This account is an administrator and cannot be deleted from the console.' },
        { status: 403 }
      );
    }

    const { plans: plansCount, advice: adviceCount } = await deleteUserData(targetUid);

    await adminDb.collection('adminActions').add({
      adminEmail: adminEmail || ADMIN_EMAIL,
      targetUid,
      targetEmail: targetEmail || 'unknown',
      action: 'delete_user',
      plansDeleted: plansCount,
      adviceDeleted: adviceCount,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetEmail || targetUid} and all associated records deleted successfully.`,
      recordsDeleted: {
        plans: plansCount,
        advice: adviceCount,
      },
    });
  } catch (error) {
    console.error('Error executing admin user deletion:', error);
    return NextResponse.json(
      { success: false, error: getErrorMessage(error, 'Failed to delete user account') },
      { status: 500 }
    );
  }
}
