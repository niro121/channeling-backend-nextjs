import { z } from 'zod';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import { generateRecordCode } from '@/lib/conventions/record-code-generator';
import {
  ATTENDANCE_DEVICE_CODE_PREFIX,
  ATTENDANCE_DEVICE_STATUSES,
  DEFAULT_ATTENDANCE_DEVICE_CODE
} from '@/types/attendance';

const deviceCreateSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  name: z.string().trim().min(1).max(200),
  location: z.string().trim().max(200).optional().default(''),
  status: z.enum(ATTENDANCE_DEVICE_STATUSES).optional().default('active')
});

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

export async function createAttendanceDevice(
  payload: z.infer<typeof deviceCreateSchema>,
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

    const created = await prisma.attendanceDevice.create({
      data: {
        code,
        name: data.name,
        location: data.location ?? '',
        status: data.status,
        ...(auditUser?.id && { createdBy: auditUser.id, updatedBy: auditUser.id })
      }
    });

    return { success: true as const, data: created, message: 'Device created' };
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

export async function touchAttendanceDeviceSeen(deviceId: string, when = new Date()) {
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
