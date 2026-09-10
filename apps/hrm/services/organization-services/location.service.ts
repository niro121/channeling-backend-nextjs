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
  LOCATION_CODE_PREFIX,
  type GetLocationParams,
  type LocationPayload,
  type LocationServiceRecord
} from '@/types/location';

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/;

const locationPayloadSchema = z.object({
  name: z
    .string()
    .min(1, 'Location name is required')
    .max(150, 'Must be less than 150 characters')
    .transform((value) => value.trim()),
  addressLine1: z
    .string()
    .max(200, 'Must be less than 200 characters')
    .optional()
    .default('')
    .transform((value) => value.trim()),
  addressLine2: z
    .string()
    .max(200, 'Must be less than 200 characters')
    .optional()
    .default('')
    .transform((value) => value.trim()),
  city: z
    .string()
    .max(100, 'Must be less than 100 characters')
    .optional()
    .default('')
    .transform((value) => value.trim()),
  branchType: z
    .number()
    .int()
    .refine((val) => val === 1 || val === 2 || val === 3, {
      message:
        'Branch type must be Main Location (1), Branch (2), or Collection Center (3)'
    }),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Unpublish (0) or Publish (1)'
    }),
  order: z
    .number()
    .int()
    .min(0, 'Order must be 0 or greater'),
  color: z
    .string()
    .nullable()
    .optional()
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    })
    .refine(
      (value) => value === null || HEX_COLOR_REGEX.test(value),
      { message: 'Color must be a hex value (e.g. #22c55e)' }
    )
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapServiceRecord(
  record: {
    id: string;
    name: string;
    code: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    branchType: number;
    status: number;
    order: number;
    color: string | null;
    migrateSourceId: string | null;
    createdAt: Date;
    updatedAt: Date;
    createdBy: string | null;
    updatedBy: string | null;
  },
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): LocationServiceRecord {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    branchType: record.branchType,
    status: record.status,
    order: record.order,
    color: record.color,
    migrateSourceId: record.migrateSourceId,
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(params: GetLocationParams): Prisma.LocationWhereInput {
  const where: Prisma.LocationWhereInput = {};
  const and: Prisma.LocationWhereInput[] = [];

  const search = params.search?.trim();
  if (search) {
    and.push({
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { addressLine1: { contains: search, mode: Prisma.QueryMode.insensitive } }
      ]
    });
  }

  if (params.status === '0' || params.status === '1') {
    and.push({ status: Number.parseInt(params.status, 10) });
  }

  if (params.branchType === '1' || params.branchType === '2' || params.branchType === '3') {
    and.push({ branchType: Number.parseInt(params.branchType, 10) });
  }

  if (and.length) where.AND = and;
  return where;
}

const locationSelect = {
  id: true,
  name: true,
  code: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  branchType: true,
  status: true,
  order: true,
  color: true,
  migrateSourceId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true
} as const;

export async function getLocationList(
  params: GetLocationParams = {}
): Promise<{
  success: boolean;
  data?: LocationServiceRecord[];
  error?: { message?: string };
}> {
  try {
    const records = await prisma.location.findMany({
      where: buildWhere(params),
      select: locationSelect,
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: withUsers.map((record) =>
        mapServiceRecord(record, {
          createdUser: record.createdUser,
          updatedUser: record.updatedUser
        })
      )
    };
  } catch (error: any) {
    console.error('getLocationList error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch locations' }
    };
  }
}

export async function getLocationById(id: string): Promise<{
  success: boolean;
  data?: LocationServiceRecord;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid location ID' } };
    }

    const record = await prisma.location.findUnique({
      where: { id },
      select: locationSelect
    });
    if (!record) {
      return { success: false, error: { message: 'Location not found' } };
    }

    const [withUsers] = await resolveAuthUsers([record]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('getLocationById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to get location' }
    };
  }
}

export async function createLocation(
  payload: LocationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: LocationServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = locationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const generated = await generateRecordCode(LOCATION_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate location code. Please try again.' }
      };
    }

    const auditUser = toAuditUser(user);
    const created = await prisma.location.create({
      data: {
        code: generated.code,
        name: parsed.data.name,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        branchType: parsed.data.branchType,
        status: parsed.data.status,
        order: parsed.data.order,
        color: parsed.data.color,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      },
      select: locationSelect
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('createLocation error:', error);
    if (error.code === 'P2002') {
      return {
        success: false,
        error: {
          message: 'Location code already exists',
          issues: { code: ['Location code already exists'] }
        }
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to create location' }
    };
  }
}

export async function updateLocation(
  id: string,
  payload: LocationPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: LocationServiceRecord;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid location ID' } };
    }

    const existing = await prisma.location.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Location not found' } };
    }

    const parsed = locationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const auditUser = toAuditUser(user);
    const updated = await prisma.location.update({
      where: { id },
      data: {
        name: parsed.data.name,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        city: parsed.data.city,
        branchType: parsed.data.branchType,
        status: parsed.data.status,
        order: parsed.data.order,
        color: parsed.data.color,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      },
      select: locationSelect
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true,
      data: mapServiceRecord(withUsers, {
        createdUser: withUsers.createdUser,
        updatedUser: withUsers.updatedUser
      })
    };
  } catch (error: any) {
    console.error('updateLocation error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update location' }
    };
  }
}

export async function deleteLocation(id: string): Promise<{
  success: boolean;
  error?: { message?: string };
}> {
  try {
    if (!id) {
      return { success: false, error: { message: 'Invalid location ID' } };
    }

    const existing = await prisma.location.findUnique({
      where: { id },
      select: { id: true }
    });
    if (!existing) {
      return { success: false, error: { message: 'Location not found' } };
    }

    await prisma.location.delete({ where: { id } });
    return { success: true };
  } catch (error: any) {
    console.error('deleteLocation error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete location' }
    };
  }
}

export async function setLocationMigrateSourceId(
  id: string,
  migrateSourceId: string
): Promise<{ success: boolean; error?: { message?: string } }> {
  try {
    await prisma.location.update({
      where: { id },
      data: { migrateSourceId }
    });
    return { success: true };
  } catch (error: any) {
    console.error('setLocationMigrateSourceId error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to link Channeling location' }
    };
  }
}
