import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAdminRequest, deleteAuthUserSafely, ADMIN_EMAIL } from '@/lib/admin-auth';
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

    // 1. Delete all target user's plans in Firestore
    const plansSnap = await adminDb.collection('plans').where('userId', '==', targetUid).get();
    const planDeletions = plansSnap.docs.map((d) => d.ref.delete());
    await Promise.all(planDeletions);

    // 2. Delete all target user's advice in Firestore
    const adviceSnap = await adminDb.collection('advice').where('userId', '==', targetUid).get();
    const adviceDeletions = adviceSnap.docs.map((d) => d.ref.delete());
    await Promise.all(adviceDeletions);

    // 3. Delete target user's profile document
    await adminDb.collection('users').doc(targetUid).delete();

    // 4. Delete user from Firebase Auth via resilient helper
    await deleteAuthUserSafely(targetUid);

    // 5. Write audit log entry to adminActions collection
    await adminDb.collection('adminActions').add({
      adminEmail: adminEmail || ADMIN_EMAIL,
      targetUid,
      targetEmail: targetEmail || 'unknown',
      action: 'delete_user',
      plansDeleted: plansSnap.size,
      adviceDeleted: adviceSnap.size,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetEmail || targetUid} and all associated records deleted successfully.`,
      recordsDeleted: {
        plans: plansSnap.size,
        advice: adviceSnap.size,
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
