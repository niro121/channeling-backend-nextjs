'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  CHANNELING_ROOM_PAGE_SIZE,
  CHANNELING_ROOM_PAGE_START,
  fetchChannelingRoomList
} from '@/services/organization-services/channeling-room.service';
import type {
  ChannelingPublicRoomDto,
  RoomSyncStats
} from '@/types/channeling-room';
import { ROOM_CODE_PREFIX } from '@/types/room';

async function findHrmLocationByChannelingId(channelingLocationId: string) {
  return prisma.location.findFirst({
    where: { migrateSourceId: channelingLocationId },
    select: { id: true, name: true, code: true, migrateSourceId: true }
  });
}

async function findHrmZoneByChannelingId(channelingZoneId: string) {
  return prisma.zone.findFirst({
    where: { migrateSourceId: channelingZoneId },
    select: {
      id: true,
      name: true,
      code: true,
      locationId: true,
      migrateSourceId: true
    }
  });
}

async function findExistingRoom(
  dto: ChannelingPublicRoomDto,
  hrmLocationId: string,
  hrmZoneId: string
) {
  if (dto.id) {
    const bySource = await prisma.room.findFirst({
      where: { migrateSourceId: dto.id },
      select: { id: true, code: true }
    });
    if (bySource) return bySource;
  }

  if (dto.number) {
    return prisma.room.findFirst({
      where: {
        number: { equals: dto.number, mode: 'insensitive' },
        locationId: hrmLocationId,
        zoneId: hrmZoneId
      },
      select: { id: true, code: true }
    });
  }

  return null;
}

/** Upsert a room from a Channeling public room DTO. */
export async function upsertRoomFromChanneling(
  dto: ChannelingPublicRoomDto,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'created' | 'updated' | 'skipped';
  data?: { id: string };
  error?: { message?: string };
}> {
  if (!dto.id || !dto.number || !dto.locationId || !dto.zoneId) {
    return {
      success: false,
      action: 'skipped',
      error: {
        message: 'Room id, number, locationId, and zoneId are required'
      }
    };
  }

  const hrmLocation = await findHrmLocationByChannelingId(dto.locationId);
  if (!hrmLocation) {
    return {
      success: false,
      action: 'skipped',
      error: {
        message:
          'Parent location is not in HRM. Refresh Locations first, then retry Rooms.'
      }
    };
  }

  const hrmZone = await findHrmZoneByChannelingId(dto.zoneId);
  if (!hrmZone) {
    return {
      success: false,
      action: 'skipped',
      error: {
        message:
          'Parent zone is not in HRM. Refresh Zones first, then retry Rooms.'
      }
    };
  }

  if (hrmZone.locationId !== hrmLocation.id) {
    return {
      success: false,
      action: 'skipped',
      error: {
        message:
          'Channeling zone does not match the linked HRM location for this room.'
      }
    };
  }

  const auditUser = toAuditUser(user);
  const auditUserId = auditUser?.id;

  try {
    const existing = await findExistingRoom(dto, hrmLocation.id, hrmZone.id);
    const baseData = {
      number: dto.number,
      description: dto.description ?? '',
      locationId: hrmLocation.id,
      zoneId: hrmZone.id,
      status: dto.status,
      migrateSourceId: dto.id,
      ...(auditUserId && { updatedBy: auditUserId })
    };

    if (existing) {
      const room = await prisma.room.update({
        where: { id: existing.id },
        data: baseData
      });
      return { success: true, action: 'updated', data: { id: room.id } };
    }

    const generated = await generateRecordCode(ROOM_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate room code during sync' }
      };
    }

    const room = await prisma.room.create({
      data: {
        ...baseData,
        code: generated.code,
        ...(auditUserId && { createdBy: auditUserId })
      }
    });
    return { success: true, action: 'created', data: { id: room.id } };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to save room';
    console.error('upsertRoomFromChanneling error:', error);
    return { success: false, error: { message } };
  }
}

/** Sync all rooms from Channeling public API into HRM. */
export async function syncAllRoomsFromChanneling(
  user?: AuditUser,
  keyword = ''
): Promise<{
  success: boolean;
  data?: RoomSyncStats;
  message?: string;
  error?: { message?: string };
}> {
  const stats: RoomSyncStats = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    errors: []
  };

  let page = CHANNELING_ROOM_PAGE_START;
  let totalRecords = 0;
  let processed = 0;

  while (true) {
    const fetchResult = await fetchChannelingRoomList({
      page,
      limit: CHANNELING_ROOM_PAGE_SIZE,
      keyword
    });

    if (!fetchResult.success || !fetchResult.data) {
      return {
        success: false,
        error: {
          message:
            fetchResult.error?.message ??
            'Failed to fetch rooms from Channeling'
        }
      };
    }

    const { rooms, totalRecords: total } = fetchResult.data;
    totalRecords = total;
    stats.total = totalRecords;

    for (const dto of rooms) {
      const result = await upsertRoomFromChanneling(dto, user);

      if (!result.success) {
        if (result.action === 'skipped') {
          stats.skipped += 1;
        } else {
          stats.failed += 1;
        }
        stats.errors.push({
          id: dto.id,
          name: dto.number,
          message: result.error?.message ?? 'Unknown error'
        });
        continue;
      }

      if (result.action === 'created') stats.created += 1;
      else if (result.action === 'updated') stats.updated += 1;
      else stats.skipped += 1;
    }

    processed += rooms.length;

    if (processed >= totalRecords || rooms.length === 0) {
      break;
    }

    page += 1;
  }

  return {
    success: true,
    data: stats,
    message: `Synced ${stats.total} room(s): ${stats.created} created, ${stats.updated} updated, ${stats.failed} failed, ${stats.skipped} skipped`
  };
}
