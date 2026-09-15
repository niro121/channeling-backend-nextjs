'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  CHANNELING_LOCATION_PAGE_SIZE,
  CHANNELING_LOCATION_PAGE_START,
  fetchChannelingLocationList
} from '@/services/organization-services/channeling-location.service';
import type {
  ChannelingPublicLocationDto,
  LocationSyncStats
} from '@/types/channeling-location';

function mapDtoToLocationData(
  dto: ChannelingPublicLocationDto,
  auditUserId?: string
) {
  return {
    name: dto.name,
    code: dto.code,
    addressLine1: dto.addressLine1 ?? '',
    addressLine2: dto.addressLine2 ?? '',
    city: dto.city ?? '',
    branchType: dto.branchType,
    status: dto.status,
    order: dto.order ?? 0,
    color: dto.color ?? null,
    migrateSourceId: dto.id,
    ...(auditUserId && { updatedBy: auditUserId })
  };
}

async function findExistingLocation(dto: ChannelingPublicLocationDto) {
  if (dto.id) {
    const bySource = await prisma.location.findFirst({
      where: { migrateSourceId: dto.id },
      select: { id: true }
    });
    if (bySource) return bySource;
  }

  if (dto.code?.trim()) {
    return prisma.location.findFirst({
      where: { code: { equals: dto.code.trim(), mode: 'insensitive' } },
      select: { id: true }
    });
  }

  return null;
}

/** Upsert a location from a Channeling public location DTO. */
export async function upsertLocationFromChanneling(
  dto: ChannelingPublicLocationDto,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  data?: { id: string };
  error?: { message?: string };
}> {
  if (!dto.id || !dto.name || !dto.code) {
    return {
      success: false,
      action: 'skipped',
      error: { message: 'Location id, name, and code are required' }
    };
  }

  const auditUser = toAuditUser(user);
  const auditUserId = auditUser?.id;
  const data = mapDtoToLocationData(dto, auditUserId);

  try {
    const existing = await findExistingLocation(dto);

    if (existing) {
      const location = await prisma.location.update({
        where: { id: existing.id },
        data
      });
      return { success: true, action: 'updated', data: { id: location.id } };
    }

    const location = await prisma.location.create({
      data: {
        ...data,
        ...(auditUserId && { createdBy: auditUserId })
      }
    });
    return { success: true, action: 'created', data: { id: location.id } };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to save location';
    console.error('upsertLocationFromChanneling error:', error);
    return { success: false, error: { message } };
  }
}

/** Sync all locations from Channeling public API into HRM. */
export async function syncAllLocationsFromChanneling(
  user?: AuditUser,
  keyword = ''
): Promise<{
  success: boolean;
  data?: LocationSyncStats;
  message?: string;
  error?: { message?: string };
}> {
  const stats: LocationSyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    errors: []
  };

  let page = CHANNELING_LOCATION_PAGE_START;
  let totalRecords = 0;
  let processed = 0;

  while (true) {
    const fetchResult = await fetchChannelingLocationList({
      page,
      limit: CHANNELING_LOCATION_PAGE_SIZE,
      keyword
    });

    if (!fetchResult.success || !fetchResult.data) {
      return {
        success: false,
        error: {
          message:
            fetchResult.error?.message ??
            'Failed to fetch locations from Channeling'
        }
      };
    }

    const { locations, totalRecords: total } = fetchResult.data;
    totalRecords = total;
    stats.total = totalRecords;

    for (const dto of locations) {
      const result = await upsertLocationFromChanneling(dto, user);

      if (!result.success) {
        stats.failed += 1;
        stats.errors.push({
          id: dto.id,
          name: dto.name,
          message: result.error?.message ?? 'Unknown error'
        });
        continue;
      }

      if (result.action === 'created') stats.created += 1;
      else if (result.action === 'updated') stats.updated += 1;
      else stats.skipped += 1;
    }

    processed += locations.length;

    if (processed >= totalRecords || locations.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    success: true,
    data: stats,
    message: `Synced ${stats.total} location(s): ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed`
  };
}
