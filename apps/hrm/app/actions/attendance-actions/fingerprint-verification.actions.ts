'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  getFingerprintVerificationExport,
  getFingerprintVerificationWorkspace,
  saveFingerprintVerificationRows
} from '@/services/attendance-services/fingerprint-verification.service';
import type {
  FingerprintVerificationSaveRow,
  GetFingerprintVerificationParams
} from '@/types/attendance';

function listParams(
  params: GetFingerprintVerificationParams
): GetFingerprintVerificationParams {
  return {
    mode: params.mode,
    fromDate: params.fromDate,
    toDate: params.toDate,
    shiftRosterId: params.shiftRosterId,
    staffId: params.staffId
  };
}

export async function getFingerprintVerificationAction(
  params: GetFingerprintVerificationParams = {},
  fillMode: 'none' | 'all' | 'additional' = 'none'
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getFingerprintVerificationWorkspace(
      listParams(params),
      { fillMode }
    );
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to load fingerprint verification'
        }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getFingerprintVerificationAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to load fingerprint verification'
      }
    };
  }
}

export async function saveFingerprintVerificationAction(
  rows: FingerprintVerificationSaveRow[]
) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await saveFingerprintVerificationRows(rows, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not save verification');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'fingerprint-verification.saved',
        entityType: 'AttendanceDay',
        importance: 'medium',
        metadata: { count: result.data?.count }
      });
    }

    revalidatePath('/fingerprint-verification');
    revalidatePath('/attendance-daily');
    revalidatePath('/rfid-attendance');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('saveFingerprintVerificationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not save verification' }
    };
  }
}

export async function getFingerprintVerificationExportAction(
  params: GetFingerprintVerificationParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getFingerprintVerificationExport(listParams(params));
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? 'No rows to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getFingerprintVerificationExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export verification rows'
    };
  }
}

export async function logFingerprintVerificationVisitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'fingerprint-verification.visited',
        entityType: 'AttendanceDay',
        importance: 'low'
      });
    }
  } catch {
    // non-blocking
  }
}
