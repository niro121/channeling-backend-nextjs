'use server';

import prisma from '@/lib/prisma';
import type { Staff } from '@archmage/shared';
import {
  bulkDeleteChannelingStaff,
  createChannelingStaff,
  deleteChannelingStaff,
  updateChannelingStaff
} from '@/services/staff-services/channeling-staff-write.service';

export async function linkStaffToChannelingSource(
  hrmStaffId: string,
  channelingStaffId: string
): Promise<void> {
  await prisma.staff.update({
    where: { id: hrmStaffId },
    data: { migrateSourceId: channelingStaffId }
  });
}

export async function getChannelingStaffIdsByHrmIds(
  hrmStaffIds: string[]
): Promise<{ hrmId: string; channelingId: string | null }[]> {
  if (!hrmStaffIds.length) return [];

  const records = await prisma.staff.findMany({
    where: { id: { in: hrmStaffIds } },
    select: { id: true, migrateSourceId: true }
  });

  return records.map((record: { id: string; migrateSourceId: string | null }) => ({
    hrmId: record.id,
    channelingId: record.migrateSourceId ?? null
  }));
}

export async function countLinkedChannelingStaff(hrmStaffIds: string[]): Promise<number> {
  if (!hrmStaffIds.length) return 0;

  return prisma.staff.count({
    where: {
      id: { in: hrmStaffIds },
      migrateSourceId: { not: null }
    }
  });
}

/** Push a newly created HRM staff record to Channeling and link migrateSourceId. */
export async function pushStaffCreateToChanneling(
  hrmStaffId: string,
  staff: Partial<Staff>
): Promise<{ success: boolean; error?: { message?: string } }> {
  const result = await createChannelingStaff(staff);
  if (!result.success || !result.data?.id) {
    return {
      success: false,
      error: { message: result.error?.message ?? 'Failed to create staff in Channeling' }
    };
  }

  await linkStaffToChannelingSource(hrmStaffId, result.data.id);
  return { success: true };
}

/** Push staff updates to Channeling. Creates in Channeling when not yet linked. */
export async function pushStaffUpdateToChanneling(
  hrmStaffId: string,
  migrateSourceId: string | null | undefined,
  staff: Partial<Staff>
): Promise<{ success: boolean; error?: { message?: string } }> {
  if (migrateSourceId) {
    const result = await updateChannelingStaff(migrateSourceId, staff);
    if (!result.success) {
      return {
        success: false,
        error: { message: result.error?.message ?? 'Failed to update staff in Channeling' }
      };
    }
    return { success: true };
  }

  return pushStaffCreateToChanneling(hrmStaffId, staff);
}

/** Delete linked staff from Channeling. No-op when not linked. */
export async function pushStaffDeleteToChanneling(
  migrateSourceId: string | null | undefined
): Promise<{ success: boolean; error?: { message?: string } }> {
  if (!migrateSourceId) {
    return { success: true };
  }

  const result = await deleteChannelingStaff(migrateSourceId);
  if (!result.success) {
    return {
      success: false,
      error: { message: result.error?.message ?? 'Failed to delete staff in Channeling' }
    };
  }

  return { success: true };
}

/** Bulk delete linked staff from Channeling. */
export async function pushStaffBulkDeleteToChanneling(
  migrateSourceIds: (string | null | undefined)[]
): Promise<{ success: boolean; error?: { message?: string } }> {
  const ids = migrateSourceIds.filter((id): id is string => Boolean(id?.trim()));
  if (!ids.length) {
    return { success: true };
  }

  const result = await bulkDeleteChannelingStaff(ids);
  if (!result.success) {
    return {
      success: false,
      error: { message: result.error?.message ?? 'Failed to delete staff in Channeling' }
    };
  }

  return { success: true };
}
