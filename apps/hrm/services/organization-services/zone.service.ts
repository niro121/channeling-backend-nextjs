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
  ZONE_CODE_PREFIX,
  type GetZoneParams,
  type ZoneLocationSummary,
  type ZonePayload,
  type ZoneServiceRecord
} from '@/types/zone';

const zonePayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Zone name is required')
    .max(150, 'Must be less than 150 characters')
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

function mapServiceRecord(
  record: {
    id: string;
    name: string;
    code: string;
    description: string;
    locationId: string;
    status: number;
    migrateSourceId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  location: LocationLookup | null | undefined,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): ZoneServiceRecord {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    description: record.description,
    locationId: record.locationId,
    locationName: location?.name ?? '—',
    locationCode: location?.code ?? '—',
    locationMigrateSourceId: location?.migrateSourceId ?? null,
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

function buildWhere(params: GetZoneParams): Prisma.ZoneWhereInput {
  const where: Prisma.ZoneWhereInput = {};
  const and: Prisma.ZoneWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
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

  if (and.length) where.AND = and;
  return where;
}

const zoneSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  locationId: true,
  status: true,
  migrateSourceId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

/** Locations linked to Channeling (usable for zone sync). */
export async function getLinkedLocationOptions(): Promise<{
  success: boolean;
  data?: ZoneLocationSummary[];
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
    console.error('getLinkedLocationOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch locations' }
    };
  }
}

export async function getZoneList(params: GetZoneParams = {}): Promise<{
  success: boolean;
  data?: ZoneServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.zone.findMany({
      where: buildWhere(params),
      select: zoneSelect,
      orderBy: [{ name: 'asc' }]
    });

    const locationMap = await loadLocationsByIds(
      records.map((record) => record.locationId)
    );
    const withUsers = await resolveAuthUsers(records);

    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(record, locationMap.get(record.locationId), {
          createdUser: record.createdUser,
          updatedUser: record.updatedUser
        })
      )
    };
  } catch (error: any) {
    console.error('getZoneList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch zones' }
    };
  }
}

export async function getZoneById(id: string): Promise<{
  success: boolean;
  data?: ZoneServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid zone ID' } };
    }

    const record = await prisma.zone.findUnique({
      where: { id },
      select: zoneSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Zone not found' } };
    }

    const locationMap = await loadLocationsByIds([record.locationId]);
    const [withUsers] = await resolveAuthUsers([record]);

    return {
      success: true,
      data: mapServiceRecord(withUsers, locationMap.get(record.locationId), {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('getZoneById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get zone' }
    };
  }
}

async function findDuplicateNamePerLocation(
  name: string,
  locationId: string,
  excludeId?: string
): Promise<{ id: string; name: string } | null> {
  const existing = await prisma.zone.findFirst({
    where: {
      name: { equals: name, mode: Prisma.QueryMode.insensitive },
      locationId,
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true, name: true }
  });
  return existing;
}

async function resolveLocationForWrite(locationId: string): Promise<
  | { success: true; location: LocationLookup }
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

  return { success: true, location };
}

export async function createZone(
  payload: ZonePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ZoneServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = zonePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const locationResult = await resolveLocationForWrite(parsed.data.locationId);
    if (!locationResult.success) {
      return { success: false, error: locationResult.error };
    }

    const duplicate = await findDuplicateNamePerLocation(
      parsed.data.name,
      parsed.data.locationId
    );
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Zone name already exists for this location',
          issues: {
            name: ['Zone name already exists for this location']
          }
        }
      };
    }

    const generated = await generateRecordCode(ZONE_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate zone code. Please try again.' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.zone.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        description: parsed.data.description,
        locationId: parsed.data.locationId,
        status: parsed.data.status,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: zoneSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, locationResult.location, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('createZone error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Zone name already exists for this location',
          issues: {
            name: ['Zone name already exists for this location']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create zone' }
    };
  }
}

export async function updateZone(
  id: string,
  payload: ZonePayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: ZoneServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid zone ID' } };
    }

    const existing = await prisma.zone.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Zone not found' } };
    }

    const parsed = zonePayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const locationResult = await resolveLocationForWrite(parsed.data.locationId);
    if (!locationResult.success) {
      return { success: false, error: locationResult.error };
    }

    const duplicate = await findDuplicateNamePerLocation(
      parsed.data.name,
      parsed.data.locationId,
      id
    );
    if (duplicate) {
      return {
        success: false,
        error: {
          message: 'Zone name already exists for this location',
          issues: {
            name: ['Zone name already exists for this location']
          }
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.zone.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        locationId: parsed.data.locationId,
        status: parsed.data.status,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: zoneSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, locationResult.location, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('updateZone error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Zone name already exists for this location',
          issues: {
            name: ['Zone name already exists for this location']
          }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to update zone' }
    };
  }
}

export async function deleteZone(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid zone ID' } };
    }

    const existing = await prisma.zone.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Zone not found' } };
    }

    await prisma.zone.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteZone error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete zone' }
    };
  }
}

export async function setZoneMigrateSourceId(
  id: string,
  migrateSourceId: string
): Promise<{ success: boolean; error?: { message?: string } }> {
  try {
    await prisma.zone.update({
      where: { id },
      data: { migrateSourceId }
    });
    return { success: true };
  } catch (error: any) {
    console.error('setZoneMigrateSourceId error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to link Channeling zone' }
    };
  }
}
