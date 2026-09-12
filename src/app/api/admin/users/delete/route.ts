import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest, ADMIN_EMAIL } from '@/lib/admin-auth';
import { deleteUserData } from '@/lib/server/delete-user-data';
import { getErrorMessage } from '@/lib/utils/errors';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, email: adminEmail, error: authError } = await verifyAdminRequest(req);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: authError || 'Forbidden: Valid admin credentials required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { targetUid, targetEmail }: { targetUid: string; targetEmail?: string } = body;

    if (!targetUid || typeof targetUid !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target UID is required' },
        { status: 400 }
      );
    }

    // 1. Delete all user records cleanly and safely in batches
    const { plans: plansCount, advice: adviceCount } = await deleteUserData(targetUid);

    // 2. Write audit log entry to adminActions collection
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
