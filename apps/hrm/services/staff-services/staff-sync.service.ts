'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  fetchAllChannelingStaff,
  fetchChannelingStaffById
} from '@/services/staff-services/channeling-staff.service';
import type {
  ChannelingPublicStaffDto,
  StaffSyncStats
} from '@/types/channeling-staff';

/** Parse a date string to a Date object, returning null if the string is not a valid date. */
function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Map a Channeling public staff DTO to a staff data object. */
function mapDtoToStaffData(dto: ChannelingPublicStaffDto, auditUserId?: string) {
  return {
    code: dto.code,
    title: dto.title ?? '',
    name: dto.name,
    nic: dto.nic,
    dateOfBirth: parseDateOnly(dto.dateOfBirth),
    gender: dto.gender ?? '',
    contactMobile: dto.contactMobile,
    address: dto.address ?? '',
    dateJoined: parseDateOnly(dto.dateJoined),
    status: dto.status,
    migrateSourceId: dto.id,
    ...(auditUserId && { updatedBy: auditUserId })
  };
}

/** Find an existing staff record by ID or code. */
async function findExistingStaff(dto: ChannelingPublicStaffDto) {
  if (dto.id) {
    const bySource = await prisma.staff.findFirst({
      where: { migrateSourceId: dto.id },
      select: { id: true }
    });
    if (bySource) return bySource;
  }

  if (dto.code) {
    return prisma.staff.findUnique({
      where: { code: dto.code },
      select: { id: true }
    });
  }

  return null;
}

/** Upsert a staff record from a Channeling public staff DTO. */
export async function upsertStaffFromChanneling(
  dto: ChannelingPublicStaffDto,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  data?: { id: string };
  error?: { message?: string };
}> {
  if (!dto.id || !dto.code) {
    return {
      success: false,
      action: 'skipped',
      error: { message: 'Staff id and code are required' }
    };
  }

  const auditUser = toAuditUser(user);
  const auditUserId = auditUser?.id;
  const data = mapDtoToStaffData(dto, auditUserId);

  try {
    const existing = await findExistingStaff(dto);

    if (existing) {
      const staff = await prisma.staff.update({
        where: { id: existing.id },
        data
      });
      return { success: true, action: 'updated', data: { id: staff.id } };
    }

    const staff = await prisma.staff.create({
      data: {
        ...data,
        ...(auditUserId && { createdBy: auditUserId })
      }
    });
    return { success: true, action: 'created', data: { id: staff.id } };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save staff';
    console.error('upsertStaffFromChanneling error:', error);
    return { success: false, error: { message } };
  }
}

/** Sync a staff record by ID from the Channeling public API. */
export async function syncStaffByIdFromChanneling(
  channelingStaffId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  data?: { id: string };
  message?: string;
  error?: { message?: string };
}> {
  const fetchResult = await fetchChannelingStaffById(channelingStaffId);
  if (!fetchResult.success || !fetchResult.data) {
    return {
      success: false,
      error: { message: fetchResult.error?.message ?? 'Failed to fetch staff from Channeling' }
    };
  }

  const upsertResult = await upsertStaffFromChanneling(fetchResult.data, user);
  if (!upsertResult.success) {
    return {
      success: false,
      error: { message: upsertResult.error?.message ?? 'Failed to save staff' }
    };
  }

  return {
    success: true,
    action: upsertResult.action,
    data: upsertResult.data,
    message:
      upsertResult.action === 'created'
        ? 'Staff imported from Channeling'
        : 'Staff updated from Channeling'
  };
}

/** Sync all staff from the Channeling public API. */
export async function syncAllStaffFromChanneling(
  user?: AuditUser,
  keyword = ''
): Promise<{
  success: boolean;
  data?: StaffSyncStats;
  message?: string;
  error?: { message?: string };
}> {
  const fetchResult = await fetchAllChannelingStaff(keyword);
  if (!fetchResult.success || !fetchResult.data) {
    return {
      success: false,
      error: { message: fetchResult.error?.message ?? 'Failed to fetch staff from Channeling' }
    };
  }

  const stats: StaffSyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: fetchResult.data.length,
    errors: []
  };

  for (const dto of fetchResult.data) {
    const result = await upsertStaffFromChanneling(dto, user);

    if (!result.success) {
      stats.failed += 1;
      stats.errors.push({
        id: dto.id,
        code: dto.code,
        message: result.error?.message ?? 'Unknown error'
      });
      continue;
    }

    if (result.action === 'created') stats.created += 1;
    else if (result.action === 'updated') stats.updated += 1;
    else stats.skipped += 1;
  }

  return {
    success: true,
    data: stats,
    message: `Synced ${stats.total} staff record(s): ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`
  };
}
