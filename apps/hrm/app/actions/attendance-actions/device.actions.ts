'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  activateAttendanceDevices,
  createAttendanceDevice,
  deleteAttendanceDevice,
  deleteAttendanceDevices,
  getAttendanceDeviceById,
  getAttendanceDeviceSummary,
  getAttendanceDevices,
  getAttendanceDevicesForExport,
  updateAttendanceDevice
} from '@/services/attendance-services/device.service';
import type {
  AttendanceDevicePayload,
  GetAttendanceDevicesParams
} from '@/types/attendance';

function listParams(
  params: GetAttendanceDevicesParams
): GetAttendanceDevicesParams {
  return {
    page: params.page ?? process.env.DEFAULT_PAGE ?? '1',
    limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
    code: params.code,
    name: params.name,
    location: params.location,
    status: params.status
  };
}

export async function getAttendanceDevicesAction(
  params: GetAttendanceDevicesParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceDevices(listParams(params));
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load devices');
    }
    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getAttendanceDevicesAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load devices' }
    };
  }
}

export async function getAttendanceDeviceSummaryAction() {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceDeviceSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Failed to load summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceDeviceSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load summary' }
    };
  }
}

export async function getAttendanceDeviceByIdAction(id: string) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceDeviceById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Device not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAttendanceDeviceByIdAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Device not found' }
    };
  }
}

export async function createAttendanceDeviceAction(
  payload: AttendanceDevicePayload
) {
  try {
    await requirePermission('attendance', 'add');
    const auditUser = await getAuditUser();
    const result = await createAttendanceDevice(payload, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not create device');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-device.created',
        entityType: 'AttendanceDevice',
        entityId: result.data?.id,
        importance: 'medium',
        metadata: { code: result.data?.code }
      });
    }

    revalidatePath('/attendance-devices');
    revalidatePath('/rfid-attendance');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('createAttendanceDeviceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not create device' }
    };
  }
}

export async function updateAttendanceDeviceAction(
  payload: AttendanceDevicePayload & { id: string }
) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await updateAttendanceDevice(payload, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not update device');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-device.updated',
        entityType: 'AttendanceDevice',
        entityId: result.data?.id,
        importance: 'medium',
        metadata: { code: result.data?.code }
      });
    }

    revalidatePath('/attendance-devices');
    revalidatePath('/rfid-attendance');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('updateAttendanceDeviceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not update device' }
    };
  }
}

export async function deleteAttendanceDeviceAction(id: string) {
  try {
    await requirePermission('attendance', 'delete');
    const auditUser = await getAuditUser();
    const result = await deleteAttendanceDevice(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not delete device');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-device.deleted',
        entityType: 'AttendanceDevice',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath('/attendance-devices');
    return { isError: false, data: { id }, errors: {} };
  } catch (error: any) {
    console.error('deleteAttendanceDeviceAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not delete device' }
    };
  }
}

export async function bulkDeleteAttendanceDevicesAction(ids: string[]) {
  try {
    await requirePermission('attendance', 'delete');
    const auditUser = await getAuditUser();
    const result = await deleteAttendanceDevices(ids);
    if (!result.success) {
      return false;
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-device.bulk-deleted',
        entityType: 'AttendanceDevice',
        importance: 'high',
        metadata: { count: result.data?.count }
      });
    }

    revalidatePath('/attendance-devices');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteAttendanceDevicesAction error:', error);
    return false;
  }
}

export async function bulkActivateAttendanceDevicesAction(ids: string[]) {
  try {
    await requirePermission('attendance', 'edit');
    const auditUser = await getAuditUser();
    const result = await activateAttendanceDevices(ids, auditUser);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Could not activate devices');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'attendance-device.bulk-activated',
        entityType: 'AttendanceDevice',
        importance: 'medium',
        metadata: { count: result.data?.count }
      });
    }

    revalidatePath('/attendance-devices');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('bulkActivateAttendanceDevicesAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Could not activate devices' }
    };
  }
}

export async function getAttendanceDevicesExportAction(
  params: GetAttendanceDevicesParams = {}
) {
  try {
    await requirePermission('attendance', 'view');
    const result = await getAttendanceDevicesForExport(listParams(params));
    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: result.error?.message ?? 'No devices to export'
      };
    }
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('getAttendanceDevicesExportAction error', error);
    return {
      success: false,
      message: error.message ?? 'Failed to export devices'
    };
  }
}

export async function logAttendanceDevicesVisitAction() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'attendance-devices.visited',
        entityType: 'AttendanceDevice',
        importance: 'low'
      });
    }
  } catch {
    // non-blocking
  }
}
