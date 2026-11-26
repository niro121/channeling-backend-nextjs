import { z } from 'zod';
import prisma from '@/lib/prisma';
import { normalizeFingerPrintRfid } from '@/lib/helpers/attendance-timezone.helper';
import {
  getAttendanceDeviceByCode,
  touchAttendanceDeviceSeen
} from '@/services/attendance-services/device.service';
import { recomputeAttendanceDayForPunch } from '@/services/attendance-services/attendance-day.service';
import {
  ATTENDANCE_PUNCH_DIRECTIONS,
  ATTENDANCE_PUNCH_SOURCES,
  type AttendancePunchRecord
} from '@/types/attendance';

const ingestSchema = z.object({
  deviceCode: z.string().trim().min(1).max(50),
  externalPunchId: z.string().trim().min(1).max(200),
  rfid: z.string().trim().min(1).max(100),
  punchedAt: z.coerce.date(),
  direction: z.enum(ATTENDANCE_PUNCH_DIRECTIONS).optional().default('unknown'),
  source: z.enum(ATTENDANCE_PUNCH_SOURCES).optional().default('device'),
  rawPayload: z.unknown().optional()
});

function toPunchRecord(row: {
  id: string;
  deviceId: string;
  deviceCode: string;
  externalPunchId: string;
  rfid: string;
  staffId: string | null;
  punchedAt: Date;
  direction: string;
  source: string;
  matchStatus: string;
}): AttendancePunchRecord {
  return {
    id: row.id,
    deviceId: row.deviceId,
    deviceCode: row.deviceCode,
    externalPunchId: row.externalPunchId,
    rfid: row.rfid,
    staffId: row.staffId,
    punchedAt: row.punchedAt.toISOString(),
    direction: row.direction,
    source: row.source,
    matchStatus: row.matchStatus
  };
}

async function resolveStaffByRfid(rfid: string) {
  const normalized = normalizeFingerPrintRfid(rfid);
  if (!normalized) return null;

  const byRoot = await prisma.staff.findFirst({
    where: { fingerPrintRfid: normalized },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      fingerPrintRfid: true,
      employmentDetails: true
    }
  });
  if (byRoot) {
    return byRoot;
  }

  // Legacy rows: RFID only on embedded hrDetails — match and backfill root field.
  const byEmbedded = await prisma.staff.findFirst({
    where: {
      hrDetails: { is: { fingerPrintRfid: normalized } }
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      fingerPrintRfid: true,
      employmentDetails: true
    }
  });

  if (byEmbedded && !byEmbedded.fingerPrintRfid) {
    await prisma.staff.update({
      where: { id: byEmbedded.id },
      data: { fingerPrintRfid: normalized }
    });
  }

  return byEmbedded;
}

/**
 * Ingest a single punch from a device gateway.
 * Idempotent on (deviceId, externalPunchId).
 * Never writes RosterAllocation.attendance — that is HR Confirm to Duty Roster only (P5).
 */
export async function ingestAttendancePunch(payload: unknown): Promise<{
  success: boolean;
  data?: AttendancePunchRecord;
  duplicate?: boolean;
  dayId?: string | null;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> {
  try {
    const parsed = ingestSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
        }
      };
    }

    const data = parsed.data;
    const rfid = normalizeFingerPrintRfid(data.rfid);
    if (!rfid) {
      return { success: false, error: { message: 'RFID is required' } };
    }

    const device = await getAttendanceDeviceByCode(data.deviceCode);
    if (!device) {
      return {
        success: false,
        error: {
          message: `Unknown device code: ${data.deviceCode}. Register the device first (or use DEV-LOCAL).`
        }
      };
    }
    if (device.status !== 'active') {
      return {
        success: false,
        error: { message: `Device ${device.code} is inactive` }
      };
    }

    const existing = await prisma.attendancePunch.findFirst({
      where: {
        deviceId: device.id,
        externalPunchId: data.externalPunchId
      }
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        data: toPunchRecord(existing),
        message: 'Duplicate punch ignored'
      };
    }

    const staff = await resolveStaffByRfid(rfid);
    let matchStatus: 'matched' | 'unmatched' | 'inactive_staff' = 'unmatched';
    let staffId: string | null = null;
    if (staff) {
      staffId = staff.id;
      matchStatus = staff.status === 1 ? 'matched' : 'inactive_staff';
    }

    const punch = await prisma.attendancePunch.create({
      data: {
        deviceId: device.id,
        deviceCode: device.code,
        externalPunchId: data.externalPunchId,
        rfid,
        staffId,
        punchedAt: data.punchedAt,
        direction: data.direction,
        source: data.source,
        matchStatus,
        ...(data.rawPayload !== undefined
          ? { rawPayload: data.rawPayload as object }
          : {})
      }
    });

    await touchAttendanceDeviceSeen(device.id, data.punchedAt);

    let dayId: string | null = null;
    if (staffId && matchStatus === 'matched') {
      const dayResult = await recomputeAttendanceDayForPunch({
        staffId,
        punchedAt: data.punchedAt,
        deviceLocation: device.location
      });
      dayId = dayResult.data?.id ?? null;
    }

    return {
      success: true,
      duplicate: false,
      data: toPunchRecord(punch),
      dayId,
      message: 'Punch ingested'
    };
  } catch (error: any) {
    console.error('ingestAttendancePunch error:', error);
    if (error.code === 'P2002') {
      return {
        success: true,
        duplicate: true,
        message: 'Duplicate punch ignored'
      };
    }
    return {
      success: false,
      error: { message: error.message || 'Failed to ingest punch' }
    };
  }
}
