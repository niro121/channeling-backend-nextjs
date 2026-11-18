'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  confirmAttendanceDayToRoster,
  confirmAttendanceDaysToRoster
} from '@/services/attendance-services/attendance-confirm-roster.service';

export async function confirmAttendanceDayToRosterAction(
  attendanceDayId: string
) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await confirmAttendanceDayToRoster({
      attendanceDayId,
      user: auditUser
    });
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to confirm attendance to roster'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance.confirm-roster',
        entityType: 'AttendanceDay',
        entityId: attendanceDayId,
        importance: 'high',
        metadata: {
          date: result.data.date,
          confirmed: result.data.confirmed,
          skipped: result.data.skipped,
          failed: result.data.failed
        }
      });
    }

    revalidatePath('/attendance-daily');
    revalidatePath('/duty-roster');
    revalidatePath('/rfid-attendance');

    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('confirmAttendanceDayToRosterAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to confirm attendance to roster'
      }
    };
  }
}

export async function confirmAttendanceDateToRosterAction(dateIso: string) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await confirmAttendanceDaysToRoster({
      dateIso,
      user: auditUser
    });
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          message:
            result.error?.message ?? 'Failed to confirm attendance to roster'
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance.confirm-roster.bulk',
        entityType: 'AttendanceDay',
        importance: 'high',
        metadata: {
          date: result.data.date,
          confirmed: result.data.confirmed,
          skipped: result.data.skipped,
          failed: result.data.failed
        }
      });
    }

    revalidatePath('/attendance-daily');
    revalidatePath('/duty-roster');
    revalidatePath('/rfid-attendance');

    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('confirmAttendanceDateToRosterAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Failed to confirm attendance to roster'
      }
    };
  }
}
