'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  CHANNELING_ZONE_PAGE_SIZE,
  CHANNELING_ZONE_PAGE_START,
  fetchChannelingZoneList
} from '@/services/organization-services/channeling-zone.service';
import type {
  ChannelingPublicZoneDto,
  ZoneSyncStats
} from '@/types/channeling-zone';
import { ZONE_CODE_PREFIX } from '@/types/zone';

async function findHrmLocationByChannelingId(channelingLocationId: string) {
  return prisma.location.findFirst({
    where: { migrateSourceId: channelingLocationId },
    select: { id: true, name: true, code: true, migrateSourceId: true }
  });
}

async function findExistingZone(
  dto: ChannelingPublicZoneDto,
  hrmLocationId: string
) {
  if (dto.id) {
    const bySource = await prisma.zone.findFirst({
      where: { migrateSourceId: dto.id },
      select: { id: true, code: true }
    });
    if (bySource) return bySource;
  }

  if (dto.name) {
    return prisma.zone.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        locationId: hrmLocationId
      },
      select: { id: true, code: true }
    });
  }

  return null;
}

/** Upsert a zone from a Channeling public zone DTO. */
export async function upsertZoneFromChanneling(
  dto: ChannelingPublicZoneDto,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  data?: { id: string };
  error?: { message?: string };
}> {
  if (!dto.id || !dto.name || !dto.locationId) {
    return {
      success: false,
      action: 'skipped',
      error: { message: 'Zone id, name, and locationId are required' }
    };
  }

  const hrmLocation = await findHrmLocationByChannelingId(dto.locationId);
  if (!hrmLocation) {
    return {
      success: false,
      action: 'skipped',
      error: {
        message:
          'Parent location is not in HRM. Refresh Locations first, then retry Zones.'
      }
    };
  }

  const auditUser = toAuditUser(user);
  const auditUserId = auditUser?.id;

  try {
    const existing = await findExistingZone(dto, hrmLocation.id);
    const baseData = {
      name: dto.name,
      description: dto.description ?? '',
      locationId: hrmLocation.id,
      status: dto.status,
      migrateSourceId: dto.id,
      ...(auditUserId && { updatedBy: auditUserId })
    };

    if (existing) {
      const zone = await prisma.zone.update({
        where: { id: existing.id },
        data: baseData
      });
      return { success: true, action: 'updated', data: { id: zone.id } };
    }

    const generated = await generateRecordCode(ZONE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate zone code during sync' }
      };
    }

    const zone = await prisma.zone.create({
      data: {
        ...baseData,
        code: generated.code,
        ...(auditUserId && { createdBy: auditUserId })
      }
    });
    return { success: true, action: 'created', data: { id: zone.id } };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to save zone';
    console.error('upsertZoneFromChanneling error:', error);
    return { success: false, error: { message } };
  }
}

/** Sync all zones from Channeling public API into HRM. */
export async function syncAllZonesFromChanneling(
  user?: AuditUser,
  keyword = ''
): Promise<{
  success: boolean;
  data?: ZoneSyncStats;
  message?: string;
  error?: { message?: string };
}> {
  const stats: ZoneSyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    errors: []
  };

  let page = CHANNELING_ZONE_PAGE_START;
  let totalRecords = 0;
  let processed = 0;

  while (true) {
    const fetchResult = await fetchChannelingZoneList({
      page,
      limit: CHANNELING_ZONE_PAGE_SIZE,
      keyword
    });

    if (!fetchResult.success || !fetchResult.data) {
      return {
        success: false,
        error: {
          message:
            fetchResult.error?.message ??
            'Failed to fetch zones from Channeling'
        }
      };
    }

    const { zones, totalRecords: total } = fetchResult.data;
    totalRecords = total;
    stats.total = totalRecords;

    for (const dto of zones) {
      const result = await upsertZoneFromChanneling(dto, user);

      if (!result.success) {
        if (result.action === 'skipped') {
          stats.skipped += 1;
        } else {
          stats.failed += 1;
        }
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

    processed += zones.length;

    if (processed >= totalRecords || zones.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    success: true,
    data: stats,
    message: `Synced ${stats.total} zone(s): ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed, ${stats.skipped} skipped`
  };
}
