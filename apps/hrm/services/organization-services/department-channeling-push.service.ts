'use server';

import prisma from '@/lib/prisma';
import {
  createChannelingDepartment,
  deleteChannelingDepartment,
  updateChannelingDepartment
} from '@/services/organization-services/channeling-department-write.service';
import { setDepartmentMigrateSourceId } from '@/services/organization-services/department.service';
import type { DepartmentPayload } from '@/types/department';

/** Push create to Channeling and store migrateSourceId on the HRM record. */
export async function pushDepartmentCreateToChanneling(
  hrmDepartmentId: string,
  payload: DepartmentPayload
): Promise<{
  success: boolean;
  data?: { channelingId: string };
  error?: { message?: string };
}> {
  const result = await createChannelingDepartment(payload);
  if (!result.success || !result.data?.id) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to create department in Channeling'
      }
    };
  }

  const link = await setDepartmentMigrateSourceId(hrmDepartmentId, result.data.id);
  if (!link.success) {
    return {
      success: false,
      error: {
        message:
          link.error?.message ??
          'Department was created in Channeling but could not be linked in HRM.'
      }
    };
  }

  return { success: true, data: { channelingId: result.data.id } };
}

/** Push update to Channeling when the HRM record is linked. */
export async function pushDepartmentUpdateToChanneling(
  hrmDepartmentId: string,
  migrateSourceId: string | null | undefined,
  payload: DepartmentPayload
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const channelingId = migrateSourceId?.trim();
  if (!channelingId) {
    return {
      success: false,
      error: {
        message:
          'This department is not linked to Channeling. Use Refresh to import it first, or create it again with sync enabled.'
      }
    };
  }

  const result = await updateChannelingDepartment(channelingId, payload);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to update department in Channeling'
      }
    };
  }

  // Ensure migrateSourceId remains set (noop if already correct)
  await prisma.department.update({
    where: { id: hrmDepartmentId },
    data: { migrateSourceId: channelingId }
  });

  return { success: true };
}

/** Push delete to Channeling when linked. */
export async function pushDepartmentDeleteToChanneling(
  migrateSourceId: string | null | undefined
): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  const channelingId = migrateSourceId?.trim();
  if (!channelingId) {
    return { success: true };
  }

  const result = await deleteChannelingDepartment(channelingId);
  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? 'Failed to delete department in Channeling'
      }
    };
  }

  return { success: true };
}
