'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createHolidayCalendar,
  deleteHolidayCalendar,
  getHolidayCalendarById,
  getHolidayCalendarFormOptions,
  getHolidayCalendarList,
  updateHolidayCalendar
} from '@/services/hr-admin-services/holiday-calendar.service';
import { mapHolidayToUiRecord } from '@/lib/mappers/holiday-calendar-form.mapper';
import type {
  GetHolidayCalendarParams,
  HolidayCalendarPayload,
  HolidayCalendarUiRecord
} from '@/types/holiday-calendar';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).code;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).createdByUser;
  delete (payload as any).updatedByUser;
  delete (payload as any).allocationCount;
  return payload;
}

export async function getHolidayCalendarListAction(
  params: GetHolidayCalendarParams = {}
): Promise<{
  isError: boolean;
  data: HolidayCalendarUiRecord[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('holiday-calendar', 'view');
    const result = await getHolidayCalendarList(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load holidays');
    }
    return {
      isError: false,
      data: (result.data ?? []).map(mapHolidayToUiRecord),
      errors: {}
    };
  } catch (error: any) {
    console.error('getHolidayCalendarListAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getHolidayCalendarByIdAction(id: string) {
  try {
    await requirePermission('holiday-calendar', 'view');
    const result = await getHolidayCalendarById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Holiday not found');
    }
    return {
      isError: false,
      data: mapHolidayToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('getHolidayCalendarByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch holiday.' }
    };
  }
}

export async function getHolidayCalendarFormOptionsAction() {
  try {
    await requirePermission('holiday-calendar', 'view');
    const result = await getHolidayCalendarFormOptions();
    return {
      isError: false,
      data: result.data ?? { holidayTypes: [] },
      errors: {}
    };
  } catch (error: any) {
    console.error('getHolidayCalendarFormOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to load form options.' }
    };
  }
}

export async function createHolidayCalendarAction(data: HolidayCalendarPayload) {
  await requirePermission('holiday-calendar', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as HolidayCalendarPayload;
    const auditUser = await getAuditUser();
    const result = await createHolidayCalendar(payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'holiday-calendar.created',
        entityType: 'HolidayCalendar',
        entityId: result.data.id,
        importance: 'high'
      });
    }

    revalidatePath('/holiday-calendar');
    revalidatePath('/public-holiday-shifts');
    return {
      isError: false,
      data: mapHolidayToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('createHolidayCalendarAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateHolidayCalendarAction(
  id: string,
  data: HolidayCalendarPayload
) {
  await requirePermission('holiday-calendar', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as HolidayCalendarPayload;
    const auditUser = await getAuditUser();
    const result = await updateHolidayCalendar(id, payload, auditUser);

    if (!result.success || !result.data) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'holiday-calendar.updated',
        entityType: 'HolidayCalendar',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath('/holiday-calendar');
    revalidatePath('/public-holiday-shifts');
    return {
      isError: false,
      data: mapHolidayToUiRecord(result.data),
      errors: {}
    };
  } catch (error: any) {
    console.error('updateHolidayCalendarAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteHolidayCalendarAction(id: string) {
  await requirePermission('holiday-calendar', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteHolidayCalendar(id);

    if (!result.success) {
      return {
        isError: true,
        errors: {
          message:
            result.error?.message ??
            'Something went wrong. Please try again later'
        },
        data: null
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'holiday-calendar.deleted',
        entityType: 'HolidayCalendar',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/holiday-calendar');
    revalidatePath('/public-holiday-shifts');
    return {
      isError: false,
      data: { deleted: true },
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteHolidayCalendarAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
