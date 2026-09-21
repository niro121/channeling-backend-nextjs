'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { toColomboDateIso } from '@/lib/helpers/attendance-timezone.helper';
import { recomputeAttendanceDaysForDate } from '@/services/attendance-services/attendance-day.service';

/**
 * On-demand / nightly-style recompute for one Colombo civil date.
 * Creates Absent (and other statuses) for rostered staff posting to that day.
 */
export async function recomputeAttendanceDaysForDateAction(dateIso?: string) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const target =
      dateIso?.trim().slice(0, 10) || toColomboDateIso(new Date());

    const result = await recomputeAttendanceDaysForDate({ dateIso: target });
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Failed to recompute attendance days'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance.day.recomputed',
        entityType: 'AttendanceDay',
        importance: 'medium',
        metadata: result.data ?? null
      });
    }

    revalidatePath('/rfid-attendance');
    revalidatePath('/attendance-daily');

    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: any) {
    console.error('recomputeAttendanceDaysForDateAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to recompute attendance days'
      }
    };
  }
}
