import { createHash } from 'crypto';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  ATTENDANCE_DEVICE_CODE_PREFIX,
  ATTENDANCE_DEVICE_STATUSES,
  DEFAULT_ATTENDANCE_DEVICE_CODE,
  type AttendanceDevicePayload,
  type AttendanceDeviceRecord,
  type AttendanceDeviceStatus,
  type AttendanceDeviceSummary,
  type GetAttendanceDevicesParams
} from '@/types/attendance';

const RECENT_SEEN_MS = 24 * 60 * 60 * 1000;

const deviceCreateSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1, 'Name is required').max(200),
  location: z.string().trim().max(200).optional().default(''),
  status: z.enum(ATTENDANCE_DEVICE_STATUSES).optional().default('active'),
  apiKey: z.string().trim().max(200).optional().nullable()
});

const deviceUpdateSchema = z.object({
  id: z.string().min(1, 'Device ID is required'),
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1, 'Name is required').max(200).optional(),
  location: z.string().trim().max(200).optional(),
  status: z.enum(ATTENDANCE_DEVICE_STATUSES).optional(),
  apiKey: z.string().trim().max(200).optional().nullable()
});

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function hashApiKey(plain: string): string {
  return createHash('sha256').update(plain).digest('hex');
}

function mapDeviceRecord(record: {
  id: string;
  code: string;
  name: string;
  location: string;
  status: string;
  lastSeenAt: Date | null;
  apiKeyHash: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser?: AttendanceDeviceRecord['createdUser'];
  updatedUser?: AttendanceDeviceRecord['updatedUser'];
}): AttendanceDeviceRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    location: record.location ?? '',
    status: (record.status as AttendanceDeviceStatus) ?? 'active',
    lastSeenAt: record.lastSeenAt ? toIsoString(record.lastSeenAt) : null,
    hasApiKey: Boolean(record.apiKeyHash),
    createdAt: toIsoString(record.createdAt),
    updatedAt: toIsoString(record.updatedAt),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    createdUser: record.createdUser ?? null,
    updatedUser: record.updatedUser ?? null
  };
}

function buildDeviceWhere(params: GetAttendanceDevicesParams) {
  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  const code = params.code?.trim();
  if (code) and.push({ code: { contains: code, mode: 'insensitive' } });

  const name = params.name?.trim();
  if (name) and.push({ name: { contains: name, mode: 'insensitive' } });

  const location = params.location?.trim();
  if (location) {
    and.push({ location: { contains: location, mode: 'insensitive' } });
  }

  if (params.status && params.status !== '__all__') {
    if (
      (ATTENDANCE_DEVICE_STATUSES as readonly string[]).includes(params.status)
    ) {
      where.status = params.status;
    }
  }

  if (and.length) where.AND = and;
  return where;
}

/** MongoDB `contains` does not support `mode: insensitive` — strip mode for Prisma Mongo. */
function sanitizeMongoWhere(where: Record<string, unknown>) {
  const clone = structuredClone(where);
  const stripMode = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(stripMode);
      return;
    }
    const obj = node as Record<string, unknown>;
    if ('mode' in obj && 'contains' in obj) {
      delete obj.mode;
    }
    Object.values(obj).forEach(stripMode);
  };
  stripMode(clone);
  return clone;
}

export async function getAttendanceDeviceByCode(code: string) {
  return prisma.attendanceDevice.findUnique({
    where: { code: code.trim() }
  });
}

/** Upsert the local DEV-LOCAL reader for development / smoke tests. */
export async function ensureDefaultAttendanceDevice(user?: AuditUser) {
  const existing = await prisma.attendanceDevice.findUnique({
    where: { code: DEFAULT_ATTENDANCE_DEVICE_CODE }
  });
  if (existing) return { success: true as const, data: existing };

  const auditUser = toAuditUser(user);
  const created = await prisma.attendanceDevice.create({
    data: {
      code: DEFAULT_ATTENDANCE_DEVICE_CODE,
      name: 'Local development reader',
      location: 'Dev',
      status: 'active',
      ...(auditUser?.id && { createdBy: auditUser.id, updatedBy: auditUser.id })
    }
  });
  return { success: true as const, data: created };
}

export async function touchAttendanceDeviceSeen(
  deviceId: string,
  when = new Date()
) {
  return prisma.attendanceDevice.update({
    where: { id: deviceId },
    data: { lastSeenAt: when, updatedAt: when }
  });
}

export async function listActiveAttendanceDevices() {
  return prisma.attendanceDevice.findMany({
    where: { status: 'active' },
    orderBy: { code: 'asc' }
  });
}

export async function getAttendanceDevices(
  params: GetAttendanceDevicesParams = {}
): Promise<{
  success: boolean;
  data?: { records: AttendanceDeviceRecord[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageNumber = Math.max(
      1,
      Number.parseInt(params.page ?? process.env.DEFAULT_PAGE ?? '1', 10) || 1
    );
    const defaultPerPage = process.env.DEFAULT_PER_PAGE ?? '10';
    const maxPageSize =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;
    const pageSize = Math.min(
      maxPageSize,
      Math.max(
        1,
        Number.parseInt(params.limit ?? defaultPerPage, 10) ||
          Number.parseInt(defaultPerPage, 10) ||
          10
      )
    );
    const skip = (pageNumber - 1) * pageSize;
    const where = sanitizeMongoWhere(buildDeviceWhere(params));

    const [records, totalRecords] = await Promise.all([
      prisma.attendanceDevice.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ status: 'asc' }, { code: 'asc' }]
      }),
      prisma.attendanceDevice.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: withUsers.map(mapDeviceRecord),
        totalRecords
      },
      message: 'Devices fetched successfully'
    };
  } catch (error: any) {
    console.error('getAttendanceDevices error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch devices' }
    };
  }
}

export async function getAttendanceDeviceSummary(): Promise<{
  success: boolean;
  data?: AttendanceDeviceSummary;
  error?: { message?: string };
}> {
  try {
    const since = new Date(Date.now() - RECENT_SEEN_MS);
    const [total, active, inactive, seenRecently] = await Promise.all([
      prisma.attendanceDevice.count(),
      prisma.attendanceDevice.count({ where: { status: 'active' } }),
      prisma.attendanceDevice.count({ where: { status: 'inactive' } }),
      prisma.attendanceDevice.count({
        where: { lastSeenAt: { gte: since } }
      })
    ]);
    return {
      success: true,
      data: { total, active, inactive, seenRecently }
    };
  } catch (error: any) {
    console.error('getAttendanceDeviceSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load device summary' }
    };
  }
}

export async function getAttendanceDeviceById(id: string): Promise<{
  success: boolean;
  data?: AttendanceDeviceRecord;
  error?: { message?: string };
}> {
  try {
    const record = await prisma.attendanceDevice.findUnique({ where: { id } });
    if (!record) {
      return { success: false, error: { message: 'Device not found' } };
    }
    const [withUsers] = await resolveAuthUsers([record]);
    return { success: true, data: mapDeviceRecord(withUsers) };
  } catch (error: any) {
    console.error('getAttendanceDeviceById error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load device' }
    };
  }
}

function resolveApiKeyHash(
  apiKey: string | null | undefined
): string | null | undefined {
  if (apiKey === undefined) return undefined;
  if (apiKey === null || apiKey.trim() === '') return null;
  return hashApiKey(apiKey.trim());
}

export async function createAttendanceDevice(
  payload: AttendanceDevicePayload | z.infer<typeof deviceCreateSchema>,
  user?: AuditUser
) {
  try {
    const parsed = deviceCreateSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false as const,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);

    let code = data.code?.trim();
    if (!code) {
      const generated = await generateRecordCode(ATTENDANCE_DEVICE_CODE_PREFIX);
      if (!generated.success) {
        return {
          success: false as const,
          error: { message: 'Failed to generate device code' }
        };
      }
      code = generated.code;
    }

    const apiKeyHash = resolveApiKeyHash(data.apiKey);

    const created = await prisma.attendanceDevice.create({
      data: {
        code,
        name: data.name,
        location: data.location ?? '',
        status: data.status,
        ...(apiKeyHash !== undefined ? { apiKeyHash } : {}),
        ...(auditUser?.id && { createdBy: auditUser.id, updatedBy: auditUser.id })
      }
    });

    const [withUsers] = await resolveAuthUsers([created]);
    return {
      success: true as const,
      data: mapDeviceRecord(withUsers),
      message: 'Device created'
    };
  } catch (error: any) {
    console.error('createAttendanceDevice error:', error);
    if (error.code === 'P2002') {
      return {
        success: false as const,
        error: { message: 'Device code already exists' }
      };
    }
    return {
      success: false as const,
      error: { message: error.message || 'Failed to create device' }
    };
  }
}

export async function updateAttendanceDevice(
  payload: AttendanceDevicePayload & { id: string },
  user?: AuditUser
) {
  try {
    const parsed = deviceUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false as const,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const existing = await prisma.attendanceDevice.findUnique({
      where: { id: data.id }
    });
    if (!existing) {
      return {
        success: false as const,
        error: { message: 'Device not found' }
      };
    }

    const auditUser = toAuditUser(user);
    const apiKeyHash = resolveApiKeyHash(data.apiKey);

    const updated = await prisma.attendanceDevice.update({
      where: { id: data.id },
      data: {
        ...(data.code !== undefined ? { code: data.code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(apiKeyHash !== undefined ? { apiKeyHash } : {}),
        ...(auditUser?.id ? { updatedBy: auditUser.id } : {})
      }
    });

    const [withUsers] = await resolveAuthUsers([updated]);
    return {
      success: true as const,
      data: mapDeviceRecord(withUsers),
      message: 'Device updated'
    };
  } catch (error: any) {
    console.error('updateAttendanceDevice error:', error);
    if (error.code === 'P2002') {
      return {
        success: false as const,
        error: { message: 'Device code already exists' }
      };
    }
    return {
      success: false as const,
      error: { message: error.message || 'Failed to update device' }
    };
  }
}

export async function deleteAttendanceDevice(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.attendanceDevice.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Device not found' } };
    }

    const punchCount = await prisma.attendancePunch.count({
      where: { deviceId: id }
    });
    if (punchCount > 0) {
      return {
        success: false,
        error: {
          message: `Cannot delete ${existing.code}: ${punchCount} punch(es) exist. Set status to Inactive instead.`
        }
      };
    }

    await prisma.attendanceDevice.delete({ where: { id } });
    return { success: true, message: 'Device deleted' };
  } catch (error: any) {
    console.error('deleteAttendanceDevice error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete device' }
    };
  }
}

export async function deleteAttendanceDevices(ids: string[]): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids.length) {
      return { success: false, error: { message: 'No devices selected' } };
    }

    const punchCount = await prisma.attendancePunch.count({
      where: { deviceId: { in: ids } }
    });
    if (punchCount > 0) {
      return {
        success: false,
        error: {
          message:
            'One or more selected devices have punches and cannot be deleted. Deactivate them instead.'
        }
      };
    }

    const result = await prisma.attendanceDevice.deleteMany({
      where: { id: { in: ids } }
    });
    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} device(s) deleted`
    };
  } catch (error: any) {
    console.error('deleteAttendanceDevices error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete devices' }
    };
  }
}

export async function activateAttendanceDevices(
  ids: string[],
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!ids.length) {
      return { success: false, error: { message: 'No devices selected' } };
    }
    const auditUser = toAuditUser(user);
    const result = await prisma.attendanceDevice.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'active',
        ...(auditUser?.id ? { updatedBy: auditUser.id } : {})
      }
    });
    return {
      success: true,
      data: { count: result.count },
      message: `${result.count} device(s) activated`
    };
  } catch (error: any) {
    console.error('activateAttendanceDevices error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to activate devices' }
    };
  }
}

export async function getAttendanceDevicesForExport(
  params: GetAttendanceDevicesParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  error?: { message?: string };
}> {
  const result = await getAttendanceDevices({
    ...params,
    page: '1',
    limit: '500'
  });
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }
  return {
    success: true,
    data: result.data.records.map((row) => ({
      code: row.code,
      name: row.name,
      location: row.location,
      status: row.status,
      lastSeenAt: row.lastSeenAt ?? '',
      hasApiKey: row.hasApiKey ? 'Yes' : 'No',
      updatedBy: row.updatedUser?.name ?? '',
      updatedAt: row.updatedAt,
      createdBy: row.createdUser?.name ?? '',
      createdAt: row.createdAt
    }))
  };
}
