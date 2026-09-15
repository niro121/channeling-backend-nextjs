'use server';

import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  resolveAuthUsers,
  type AuthUserSummary
} from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  ROOM_CODE_PREFIX,
  type GetRoomParams,
  type RoomLocationSummary,
  type RoomPayload,
  type RoomServiceRecord,
  type RoomZoneSummary
} from '@/types/room';

const roomPayloadSchema = z.object({
  number: z
    .string()
    .min(1, 'Room number is required')
    .max(50, 'Must be less than 50 characters')
    .transform((value) => value.trim()),
  description: z
    .string()
    .max(500, 'Must be less than 500 characters')
    .optional()
    .default('')
    .transform((value) => value.trim()),
  locationId: z
    .string()
    .min(1, 'Location is required')
    .transform((value) => value.trim()),
  zoneId: z
    .string()
    .min(1, 'Zone is required')
    .transform((value) => value.trim()),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    })
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

type LocationLookup = {
  id: string;
  name: string;
  code: string;
  migrateSourceId: string | null;
};

type ZoneLookup = {
  id: string;
  name: string;
  code: string;
  locationId: string;
  migrateSourceId: string | null;
};

function mapServiceRecord(
  record: {
    id: string;
    number: string;
    code: string;
    description: string;
    locationId: string;
    zoneId: string;
    status: number;
    migrateSourceId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  location: LocationLookup | null | undefined,
  zone: ZoneLookup | null | undefined,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): RoomServiceRecord {
  return {
    id: record.id,
    number: record.number,
    code: record.code,
    description: record.description,
    locationId: record.locationId,
    locationName: location?.name ?? '—',
    locationCode: location?.code ?? '—',
    locationMigrateSourceId: location?.migrateSourceId ?? null,
    zoneId: record.zoneId,
    zoneName: zone?.name ?? '—',
    zoneCode: zone?.code ?? '—',
    zoneMigrateSourceId: zone?.migrateSourceId ?? null,
    status: record.status,
    migrateSourceId: record.migrateSourceId,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

async function loadLocationsByIds(
  ids: string[]
): Promise<Map<string, LocationLookup>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();

  const locations = await prisma.location.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      name: true,
      code: true,
      migrateSourceId: true
    }
  });

  return new Map(locations.map((loc) => [loc.id, loc]));
}

async function loadZonesByIds(ids: string[]): Promise<Map<string, ZoneLookup>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return new Map();

  const zones = await prisma.zone.findMany({
    where: { id: { in: unique } },
    select: {
      id: true,
      name: true,
      code: true,
      locationId: true,
      migrateSourceId: true
    }
  });

  return new Map(zones.map((zone) => [zone.id, zone]));
}

function buildWhere(params: GetRoomParams): Prisma.RoomWhereInput {
  const where: Prisma.RoomWhereInput = {};
  const and: Prisma.RoomWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { number: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (params.status === '0' || params.status === '1') {
    and.push({ status: Number.parseInt(params.status, 10) });
  }

  if (params.locationId?.trim()) {
    and.push({ locationId: params.locationId.trim() });
  }

  if (params.zoneId?.trim()) {
    and.push({ zoneId: params.zoneId.trim() });
  }

  if (and.length) where.AND = and;
  return where;
}

const roomSelect = {
  id: true,
  number: true,
  code: true,
  description: true,
  locationId: true,
  zoneId: true,
  status: true,
  migrateSourceId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

/** Locations linked to Channeling (usable for room sync). */
export async function getLinkedLocationOptionsForRooms(): Promise<{
  success: boolean;
  data?: RoomLocationSummary[];
  error?: { message?: string };
}> {
  try {
    const locations = await prisma.location.findMany({
      where: {
        AND: [
          { migrateSourceId: { not: null } },
          { migrateSourceId: { not: '' } }
        ]
      },
      select: {
        id: true,
        name: true,
        code: true,
        migrateSourceId: true
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });

    return {
      success: true,
      data: locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        code: loc.code,
        migrateSourceId: loc.migrateSourceId
      }))
    };
  } catch (error: any) {
    console.error('getLinkedLocationOptionsForRooms error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch locations' }
    };
  }
}

/** Zones linked to Channeling, optionally filtered by HRM location. */
export async function getLinkedZoneOptionsForRooms(locationId?: string): Promise<{
  success: boolean;
  data?: RoomZoneSummary[];
  error?: { message?: string };
}> {
  try {
    const where: Prisma.ZoneWhereInput = {
      AND: [
        { migrateSourceId: { not: null } },
        { migrateSourceId: { not: '' } },
        ...(locationId?.trim() ? [{ locationId: locationId.trim() }] : [])
      ]
    };

    const zones = await prisma.zone.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        locationId: true,
        migrateSourceId: true
      },
      orderBy: [{ name: 'asc' }]
    });

    return {
      success: true,
      data: zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        code: zone.code,
        locationId: zone.locationId,
        migrateSourceId: zone.migrateSourceId
      }))
    };
  } catch (error: any) {
    console.error('getLinkedZoneOptionsForRooms error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch zones' }
    };
  }
}

export async function getRoomList(params: GetRoomParams = {}): Promise<{
  success: boolean;
  data?: RoomServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.room.findMany({
      where: buildWhere(params),
      select: roomSelect,
      orderBy: [{ number: 'asc' }]
    });

    const locationMap = await loadLocationsByIds(
      records.map((record) => record.locationId)
    );
    const zoneMap = await loadZonesByIds(records.map((record) => record.zoneId));
    const withUsers = await resolveAuthUsers(records);

    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(
          record,
          locationMap.get(record.locationId),
          zoneMap.get(record.zoneId),
          {
            createdUser: record.createdUser,
            updatedUser: record.updatedUser
          }
        )
      )
    };
  } catch (error: any) {
    console.error('getRoomList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch rooms' }
    };
  }
}

export async function getRoomById(id: string): Promise<{
  success: boolean;
  data?: RoomServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid room ID' } };
    }

    const record = await prisma.room.findUnique({
      where: { id },
      select: roomSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Room not found' } };
    }

    const locationMap = await loadLocationsByIds([record.locationId]);
    const zoneMap = await loadZonesByIds([record.zoneId]);
    const [withUsers] = await resolveAuthUsers([record]);

    return {
      success: true,
      data: mapServiceRecord(
        withUsers,
        locationMap.get(record.locationId),
        zoneMap.get(record.zoneId),
        {
          createdUser: withUsers.createdUser,
          updatedUser: withUsers.updatedUser
        }
      )
    };
  } catch (error: any) {
    console.error('getRoomById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get room' }
    };
  }
}

async function findDuplicateNumber(
  number: string,
  locationId: string,
  zoneId: string,
  excludeId?: string
): Promise<{ id: string; number: string } | null> {
  const existing = await prisma.room.findFirst({
    where: {
      number: { equals: number, mode: Prisma.QueryMode.insensitive },
      locationId,
      zoneId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, number: true }
  });
  return existing;
}

async function resolveParentsForWrite(
  locationId: string,
  zoneId: string
): Promise<
  | { success: true; location: LocationLookup; zone: ZoneLookup }
  | {
      success: false;
      error: { message: string; issues?: Record<string, string[]> };
    }
> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: {
      id: true,
      name: true,
      code: true,
      migrateSourceId: true
    }
  });

  if (!location) {
    return {
      success: false,
      error: {
        message: 'Location not found',
        issues: { locationId: ['Location not found'] }
      }
    };
  }

  const zone = await prisma.zone.findUnique({
    where: { id: zoneId },
    select: {
      id: true,
      name: true,
      code: true,
      locationId: true,
      migrateSourceId: true
    }
  });

  if (!zone) {
    return {
      success: false,
      error: {
        message: 'Zone not found',
        issues: { zoneId: ['Zone not found'] }
      }
    };
  }

  if (zone.locationId !== locationId) {
    return {
      success: false,
      error: {
        message: 'Zone does not belong to the selected location',
        issues: { zoneId: ['Zone does not belong to the selected location'] }
      }
    };
  }

  return { success: true, location, zone };
}

export async function createRoom(
  payload: RoomPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: RoomServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = roomPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const parents = await resolveParentsForWrite(
      parsed.data.locationId,
      parsed.data.zoneId
    );
    if (!parents.success) {
      return { success: false, error: parents.error };
    }

    const duplicate = await findDuplicateNumber(
      parsed.data.number,
      parsed.data.locationId,
      parsed.data.zoneId
    );
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Room number already exists for this location and zone',
          issues: {
            number: ['Room number already exists for this location and zone']
          }
        }
      };
    }

    const generated = await generateRecordCode(ROOM_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate room code. Please try again.' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.room.create({
      data: {
        code: generated.code,
        number: parsed.data.number,
        description: parsed.data.description,
        locationId: parsed.data.locationId,
        zoneId: parsed.data.zoneId,
        status: parsed.data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: roomSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, parents.location, parents.zone, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('createRoom error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Room number already exists for this location and zone',
          issues: {
            number: ['Room number already exists for this location and zone']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create room' }
    };
  }
}

export async function updateRoom(
  id: string,
  payload: RoomPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: RoomServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid room ID' } };
    }

    const existing = await prisma.room.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Room not found' } };
    }

    const parsed = roomPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const parents = await resolveParentsForWrite(
      parsed.data.locationId,
      parsed.data.zoneId
    );
    if (!parents.success) {
      return { success: false, error: parents.error };
    }

    const duplicate = await findDuplicateNumber(
      parsed.data.number,
      parsed.data.locationId,
      parsed.data.zoneId,
      id
    );
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Room number already exists for this location and zone',
          issues: {
            number: ['Room number already exists for this location and zone']
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.room.update({
      where: { id },
      data: {
        number: parsed.data.number,
        description: parsed.data.description,
        locationId: parsed.data.locationId,
        zoneId: parsed.data.zoneId,
        status: parsed.data.status,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: roomSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, parents.location, parents.zone, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('updateRoom error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Room number already exists for this location and zone',
          issues: {
            number: ['Room number already exists for this location and zone']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update room' }
    };
  }
}

export async function deleteRoom(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid room ID' } };
    }

    const existing = await prisma.room.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Room not found' } };
    }

    await prisma.room.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteRoom error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete room' }
    };
  }
}

export async function setRoomMigrateSourceId(
  id: string,
  migrateSourceId: string
): Promise<{ success: boolean; error?: { message?: string } }> {
  try {
    await prisma.room.update({
      where: { id },
      data: { migrateSourceId }
    });
    return { success: true };
  } catch (error: any) {
    console.error('setRoomMigrateSourceId error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to link Channeling room' }
    };
  }
}
