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
  colomboDateIsoToUtc,
  getColomboParts,
  colomboWallTimeToUtc,
  parseHhMmToMinutes,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import {
  ATTENDANCE_CORRECTION_ATTENDANCE_STATUS_OPTIONS,
  ATTENDANCE_CORRECTION_CODE_PREFIX,
  ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS,
  ATTENDANCE_CORRECTION_STATUS_OPTIONS,
  isAttendanceCorrectionLocked,
  type AttendanceCorrectionFilterOptions,
  type AttendanceCorrectionFormOptions,
  type AttendanceCorrectionPayload,
  type AttendanceCorrectionRecord,
  type AttendanceCorrectionSummary,
  type AttendanceDayLookupForCorrection,
  type GetAttendanceCorrectionsParams
} from '@/types/attendance';

const CORRECTABLE_DAY_STATUSES = ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS.map(
  (o) => o.id
) as [string, ...string[]];

const correctionPayloadSchema = z.object({
  staffId: z.string().min(1, 'Staff member is required'),
  date: z.string().min(1, 'Attendance date is required'),
  correctedFirstIn: z.string().optional().nullable(),
  correctedLastOut: z.string().optional().nullable(),
  correctedStatus: z.enum(CORRECTABLE_DAY_STATUSES),
  reason: z.string().min(1, 'Reason is required').max(500),
  status: z.enum(['draft', 'pending_approval']).optional().default('draft')
});

const approveRejectSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'Select at least one correction')
});

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function formatHhMmLabel(value: Date | null | undefined): string {
  if (!value) return '—';
  const parts = getColomboParts(value);
  return `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
}

function toOption(value: string): { id: string; name: string } {
  return { id: value, name: value };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])
  ].sort((a, b) => a.localeCompare(b));
}

function parseTimeOnDate(
  dateIso: string,
  hhmm: string | null | undefined
): Date | null {
  if (!hhmm?.trim()) return null;
  const minutes = parseHhMmToMinutes(hhmm);
  if (minutes == null) return null;
  const civil = colomboDateIsoToUtc(dateIso);
  return colomboWallTimeToUtc(
    civil,
    Math.floor(minutes / 60),
    minutes % 60,
    0
  );
}

function staffSnapshot(staff: {
  code: string;
  name: string;
  employmentDetails?: {
    employment?: {
      department?: string | null;
      staffDesignation?: string | null;
    } | null;
  } | null;
  shiftAssignments?: Array<{
    department?: string | null;
    designation?: string | null;
  }>;
}): { staffCode: string; staffName: string; department: string; designation: string } {
  const employment = staff.employmentDetails?.employment;
  const assignment = staff.shiftAssignments?.[0];
  return {
    staffCode: staff.code,
    staffName: staff.name,
    department:
      assignment?.department?.trim() ||
      employment?.department?.trim() ||
      '',
    designation:
      assignment?.designation?.trim() ||
      employment?.staffDesignation?.trim() ||
      ''
  };
}

type CorrectionEntity = {
  id: string;
  code: string;
  staffId: string;
  date: Date;
  attendanceDayId: string | null;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  originalFirstInAt: Date | null;
  originalLastOutAt: Date | null;
  originalStatus: string;
  correctedFirstInAt: Date | null;
  correctedLastOutAt: Date | null;
  correctedStatus: string;
  reason: string;
  status: string;
  requestedById: string | null;
  requestedByName: string;
  requestedAt: Date | null;
  approvedById: string | null;
  approvedByName: string;
  approvedAt: Date | null;
  rejectedById: string | null;
  rejectedByName: string;
  rejectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
};

function mapCorrectionRecord(
  record: CorrectionEntity,
  users?: {
    createdUser: AuthUserSummary | null;
    updatedUser: AuthUserSummary | null;
  }
): AttendanceCorrectionRecord {
  return {
    id: record.id,
    code: record.code,
    staffId: record.staffId,
    date: toColomboDateIso(record.date),
    attendanceDayId: record.attendanceDayId,
    staffCode: record.staffCode,
    staffName: record.staffName,
    department: record.department,
    designation: record.designation,
    originalFirstInAt: toIsoString(record.originalFirstInAt),
    originalLastOutAt: toIsoString(record.originalLastOutAt),
    originalFirstInLabel: formatHhMmLabel(record.originalFirstInAt),
    originalLastOutLabel: formatHhMmLabel(record.originalLastOutAt),
    originalStatus: record.originalStatus,
    correctedFirstInAt: toIsoString(record.correctedFirstInAt),
    correctedLastOutAt: toIsoString(record.correctedLastOutAt),
    correctedFirstInLabel: formatHhMmLabel(record.correctedFirstInAt),
    correctedLastOutLabel: formatHhMmLabel(record.correctedLastOutAt),
    correctedStatus: record.correctedStatus,
    reason: record.reason,
    status: record.status,
    requestedById: record.requestedById,
    requestedByName: record.requestedByName,
    requestedAt: toIsoString(record.requestedAt),
    approvedById: record.approvedById,
    approvedByName: record.approvedByName,
    approvedAt: toIsoString(record.approvedAt),
    rejectedById: record.rejectedById,
    rejectedByName: record.rejectedByName,
    rejectedAt: toIsoString(record.rejectedAt),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: record.createdBy,
    updatedBy: record.updatedBy,
    createdUser: users?.createdUser ?? null,
    updatedUser: users?.updatedUser ?? null
  };
}

function buildWhere(
  params: GetAttendanceCorrectionsParams
): Prisma.AttendanceCorrectionWhereInput {
  const where: Prisma.AttendanceCorrectionWhereInput = {};

  if (params.staffId?.trim()) where.staffId = params.staffId.trim();
  if (params.staffCode?.trim()) {
    where.staffCode = {
      contains: params.staffCode.trim(),
      mode: Prisma.QueryMode.insensitive
    };
  }
  if (params.department?.trim()) where.department = params.department.trim();
  if (params.designation?.trim()) where.designation = params.designation.trim();
  if (params.status?.trim()) where.status = params.status.trim();
  if (params.requestedById?.trim()) {
    where.requestedById = params.requestedById.trim();
  }
  if (params.code?.trim()) {
    where.code = {
      contains: params.code.trim(),
      mode: Prisma.QueryMode.insensitive
    };
  }

  if (params.attendanceStatus?.trim()) {
    where.originalStatus = params.attendanceStatus.trim();
  }
  if (params.correctedStatus?.trim()) {
    where.correctedStatus = params.correctedStatus.trim();
  }

  if (params.fromDate || params.toDate) {
    where.date = {};
    if (params.fromDate) {
      where.date.gte = colomboDateIsoToUtc(params.fromDate);
    }
    if (params.toDate) {
      where.date.lte = colomboDateIsoToUtc(params.toDate);
    }
  }

  return where;
}

async function loadStaffForCorrection(staffId: string) {
  return prisma.staff.findUnique({
    where: { id: staffId },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      employmentDetails: true,
      shiftAssignments: {
        where: { status: 'active' },
        take: 1,
        orderBy: { effectiveFrom: 'desc' },
        select: { department: true, designation: true }
      }
    }
  });
}

export async function lookupAttendanceDayForCorrection(
  staffId: string,
  dateIso: string
): Promise<{
  success: boolean;
  data?: AttendanceDayLookupForCorrection | null;
  error?: { message?: string };
}> {
  try {
    if (!staffId?.trim() || !dateIso?.trim()) {
      return { success: true, data: null };
    }

    const staff = await loadStaffForCorrection(staffId);
    if (!staff) {
      return { success: false, error: { message: 'Staff member not found' } };
    }

    const snapshot = staffSnapshot(staff);
    const date = colomboDateIsoToUtc(dateIso);
    const day = await prisma.attendanceDay.findUnique({
      where: {
        staffId_date: { staffId, date }
      }
    });

    return {
      success: true,
      data: {
        attendanceDayId: day?.id ?? null,
        staffCode: day?.staffCode || snapshot.staffCode,
        staffName: day?.staffName || snapshot.staffName,
        department: day?.department || snapshot.department,
        designation: snapshot.designation,
        originalFirstInAt: day?.firstInAt?.toISOString() ?? null,
        originalLastOutAt: day?.lastOutAt?.toISOString() ?? null,
        originalFirstInLabel: formatHhMmLabel(day?.firstInAt ?? null),
        originalLastOutLabel: formatHhMmLabel(day?.lastOutAt ?? null),
        originalStatus: day?.status ?? ''
      }
    };
  } catch (error: any) {
    console.error('lookupAttendanceDayForCorrection error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to lookup attendance day' }
    };
  }
}

export async function getAttendanceCorrections(
  params: GetAttendanceCorrectionsParams
): Promise<{
  success: boolean;
  data?: { records: AttendanceCorrectionRecord[]; totalRecords: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const pageSize = Math.min(
      Number.parseInt(params.limit || '10', 10) || 10,
      100
    );
    const pageNum = Math.max(Number.parseInt(params.page || '1', 10), 1);
    const skip = (pageNum - 1) * pageSize;
    const where = buildWhere(params);

    const [records, totalRecords] = await Promise.all([
      prisma.attendanceCorrection.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.attendanceCorrection.count({ where })
    ]);

    const withUsers = await resolveAuthUsers(records);
    return {
      success: true,
      data: {
        records: withUsers.map((record) =>
          mapCorrectionRecord(record, {
            createdUser: record.createdUser,
            updatedUser: record.updatedUser
          })
        ),
        totalRecords
      },
      message: 'Attendance corrections loaded'
    };
  } catch (error: any) {
    console.error('getAttendanceCorrections error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load attendance corrections'
      }
    };
  }
}

export async function getAttendanceCorrectionSummary(): Promise<{
  success: boolean;
  data?: AttendanceCorrectionSummary;
  error?: { message?: string };
}> {
  try {
    const [totalCorrections, pendingApproval, approved, rejected] =
      await Promise.all([
        prisma.attendanceCorrection.count(),
        prisma.attendanceCorrection.count({
          where: { status: { in: ['draft', 'pending_approval'] } }
        }),
        prisma.attendanceCorrection.count({ where: { status: 'approved' } }),
        prisma.attendanceCorrection.count({ where: { status: 'rejected' } })
      ]);

    return {
      success: true,
      data: { totalCorrections, pendingApproval, approved, rejected }
    };
  } catch (error: any) {
    console.error('getAttendanceCorrectionSummary error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load correction summary' }
    };
  }
}

export async function getAttendanceCorrectionFilterOptions(): Promise<{
  success: boolean;
  data?: AttendanceCorrectionFilterOptions;
  error?: { message?: string };
}> {
  try {
    const [departments, designations, staffRows, requesterRows] =
      await Promise.all([
        prisma.attendanceCorrection.findMany({
          select: { department: true },
          distinct: ['department']
        }),
        prisma.attendanceCorrection.findMany({
          select: { designation: true },
          distinct: ['designation']
        }),
        prisma.staff.findMany({
          where: { status: 1 },
          select: { id: true, code: true, name: true },
          orderBy: { name: 'asc' },
          take: 500
        }),
        prisma.attendanceCorrection.findMany({
          where: { requestedById: { not: null } },
          select: { requestedById: true, requestedByName: true },
          distinct: ['requestedById']
        })
      ]);

    const requesters = requesterRows
      .filter((row) => row.requestedById)
      .map((row) => ({
        id: row.requestedById as string,
        name: row.requestedByName?.trim() || (row.requestedById as string)
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      success: true,
      data: {
        staff: staffRows.map((s) => ({
          id: s.id,
          name: `${s.code} — ${s.name}`
        })),
        departments: uniqueStrings(departments.map((r) => r.department)).map(
          toOption
        ),
        designations: uniqueStrings(designations.map((r) => r.designation)).map(
          toOption
        ),
        attendanceStatuses: ATTENDANCE_CORRECTION_ATTENDANCE_STATUS_OPTIONS,
        correctedStatuses: ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS,
        requesters
      }
    };
  } catch (error: any) {
    console.error('getAttendanceCorrectionFilterOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load filter options' }
    };
  }
}

export async function getAttendanceCorrectionFormOptions(): Promise<{
  success: boolean;
  data?: AttendanceCorrectionFormOptions;
  error?: { message?: string };
}> {
  try {
    const staffRows = await prisma.staff.findMany({
      where: { status: 1 },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
      take: 500
    });

    return {
      success: true,
      data: {
        staff: staffRows.map((s) => ({
          id: s.id,
          name: `${s.code} — ${s.name}`
        })),
        dayStatuses: ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS,
        statuses: ATTENDANCE_CORRECTION_STATUS_OPTIONS.filter(
          (o) => o.id === 'draft' || o.id === 'pending_approval'
        )
      }
    };
  } catch (error: any) {
    console.error('getAttendanceCorrectionFormOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load form options' }
    };
  }
}

export async function createAttendanceCorrection(
  payload: AttendanceCorrectionPayload,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AttendanceCorrectionRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const parsed = correctionPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message:
            parsed.error.flatten().fieldErrors.staffId?.[0] ??
            parsed.error.flatten().fieldErrors.date?.[0] ??
            parsed.error.flatten().fieldErrors.reason?.[0] ??
            parsed.error.flatten().fieldErrors.correctedStatus?.[0] ??
            'Invalid correction payload'
        }
      };
    }

    const data = parsed.data;
    const dateIso = data.date.slice(0, 10);
    const civilDate = colomboDateIsoToUtc(dateIso);
    const auditUser = toAuditUser(user);

    const staff = await loadStaffForCorrection(data.staffId);
    if (!staff || staff.status !== 1) {
      return {
        success: false,
        error: { message: 'Active staff member is required' }
      };
    }

    const snapshot = staffSnapshot(staff);
    const day = await prisma.attendanceDay.findUnique({
      where: {
        staffId_date: { staffId: data.staffId, date: civilDate }
      }
    });

    const correctedFirstInAt = parseTimeOnDate(dateIso, data.correctedFirstIn);
    const correctedLastOutAt = parseTimeOnDate(dateIso, data.correctedLastOut);

    if (data.correctedFirstIn?.trim() && !correctedFirstInAt) {
      return {
        success: false,
        error: { message: 'Corrected check-in must be HH:mm' }
      };
    }
    if (data.correctedLastOut?.trim() && !correctedLastOutAt) {
      return {
        success: false,
        error: { message: 'Corrected check-out must be HH:mm' }
      };
    }

    const generated = await generateRecordCode(ATTENDANCE_CORRECTION_CODE_PREFIX);
    if (!generated.success) {
      return {
        success: false,
        error: { message: 'Failed to generate correction code. Please try again.' }
      };
    }

    const now = new Date();

    const created = await prisma.attendanceCorrection.create({
      data: {
        code: generated.code,
        staffId: data.staffId,
        date: civilDate,
        attendanceDayId: day?.id ?? null,
        staffCode: day?.staffCode || snapshot.staffCode,
        staffName: day?.staffName || snapshot.staffName,
        department: day?.department || snapshot.department,
        designation: snapshot.designation,
        originalFirstInAt: day?.firstInAt ?? null,
        originalLastOutAt: day?.lastOutAt ?? null,
        originalStatus: day?.status ?? '',
        correctedFirstInAt,
        correctedLastOutAt,
        correctedStatus: data.correctedStatus,
        reason: data.reason.trim(),
        status: data.status,
        requestedById: auditUser?.id ?? null,
        requestedByName: auditUser?.name ?? '',
        requestedAt: now,
        createdBy: auditUser?.id,
        updatedBy: auditUser?.id
      }
    });

    return {
      success: true,
      data: mapCorrectionRecord(created),
      message: `${created.code} saved`
    };
  } catch (error: any) {
    console.error('createAttendanceCorrection error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to create correction' }
    };
  }
}

export async function updateAttendanceCorrection(
  id: string,
  payload: Partial<AttendanceCorrectionPayload>,
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: AttendanceCorrectionRecord;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.attendanceCorrection.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Correction not found' } };
    }
    if (isAttendanceCorrectionLocked(existing.status)) {
      return {
        success: false,
        error: {
          message: `${existing.code} is ${existing.status} and cannot be edited`
        }
      };
    }

    const merged = {
      staffId: payload.staffId ?? existing.staffId,
      date: payload.date ?? toColomboDateIso(existing.date),
      correctedFirstIn:
        payload.correctedFirstIn !== undefined
          ? payload.correctedFirstIn
          : formatHhMmLabel(existing.correctedFirstInAt) === '—'
            ? ''
            : formatHhMmLabel(existing.correctedFirstInAt),
      correctedLastOut:
        payload.correctedLastOut !== undefined
          ? payload.correctedLastOut
          : formatHhMmLabel(existing.correctedLastOutAt) === '—'
            ? ''
            : formatHhMmLabel(existing.correctedLastOutAt),
      correctedStatus: payload.correctedStatus ?? existing.correctedStatus,
      reason: payload.reason ?? existing.reason,
      status: (payload.status ??
        (existing.status === 'pending_approval'
          ? 'pending_approval'
          : 'draft')) as 'draft' | 'pending_approval'
    };

    const parsed = correctionPayloadSchema.safeParse(merged);
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message:
            parsed.error.flatten().fieldErrors.reason?.[0] ??
            'Invalid correction payload'
        }
      };
    }

    const data = parsed.data;
    const dateIso = data.date.slice(0, 10);
    const civilDate = colomboDateIsoToUtc(dateIso);
    const auditUser = toAuditUser(user);

    const staff = await loadStaffForCorrection(data.staffId);
    if (!staff || staff.status !== 1) {
      return {
        success: false,
        error: { message: 'Active staff member is required' }
      };
    }

    const snapshot = staffSnapshot(staff);
    const day = await prisma.attendanceDay.findUnique({
      where: {
        staffId_date: { staffId: data.staffId, date: civilDate }
      }
    });

    const correctedFirstInAt = parseTimeOnDate(dateIso, data.correctedFirstIn);
    const correctedLastOutAt = parseTimeOnDate(dateIso, data.correctedLastOut);

    if (data.correctedFirstIn?.trim() && !correctedFirstInAt) {
      return {
        success: false,
        error: { message: 'Corrected check-in must be HH:mm' }
      };
    }
    if (data.correctedLastOut?.trim() && !correctedLastOutAt) {
      return {
        success: false,
        error: { message: 'Corrected check-out must be HH:mm' }
      };
    }

    const updated = await prisma.attendanceCorrection.update({
      where: { id },
      data: {
        staffId: data.staffId,
        date: civilDate,
        attendanceDayId: day?.id ?? null,
        staffCode: day?.staffCode || snapshot.staffCode,
        staffName: day?.staffName || snapshot.staffName,
        department: day?.department || snapshot.department,
        designation: snapshot.designation,
        originalFirstInAt: day?.firstInAt ?? existing.originalFirstInAt,
        originalLastOutAt: day?.lastOutAt ?? existing.originalLastOutAt,
        originalStatus: day?.status || existing.originalStatus,
        correctedFirstInAt,
        correctedLastOutAt,
        correctedStatus: data.correctedStatus,
        reason: data.reason.trim(),
        status: data.status,
        updatedBy: auditUser?.id
      }
    });

    return {
      success: true,
      data: mapCorrectionRecord(updated),
      message: `${updated.code} updated`
    };
  } catch (error: any) {
    console.error('updateAttendanceCorrection error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to update correction' }
    };
  }
}

export async function deleteAttendanceCorrection(id: string): Promise<{
  success: boolean;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const existing = await prisma.attendanceCorrection.findUnique({
      where: { id }
    });
    if (!existing) {
      return { success: false, error: { message: 'Correction not found' } };
    }
    if (isAttendanceCorrectionLocked(existing.status)) {
      return {
        success: false,
        error: {
          message: `${existing.code} is ${existing.status} and cannot be deleted`
        }
      };
    }

    await prisma.attendanceCorrection.delete({ where: { id } });
    return { success: true, message: `${existing.code} deleted` };
  } catch (error: any) {
    console.error('deleteAttendanceCorrection error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to delete correction' }
    };
  }
}

async function applyCorrectionToDay(
  correction: CorrectionEntity,
  auditUser: AuditUser | undefined,
  tx: Prisma.TransactionClient
) {
  const flags: string[] = [];
  if (!correction.correctedFirstInAt && correction.correctedLastOutAt) {
    flags.push('missing_in');
  }
  if (correction.correctedFirstInAt && !correction.correctedLastOutAt) {
    flags.push('missing_out');
  }
  if (correction.correctedStatus === 'early_out') {
    flags.push('early_exit');
  }

  const dayStatus =
    correction.correctedStatus === 'leave'
      ? 'on_leave'
      : correction.correctedStatus === 'incomplete'
        ? 'missing_punch'
        : correction.correctedStatus === 'early_out'
          ? 'present'
          : correction.correctedStatus;

  const dayData = {
    firstInAt: correction.correctedFirstInAt,
    lastOutAt: correction.correctedLastOutAt,
    status: dayStatus,
    flags,
    correctionReason: correction.reason,
    correctedBy: auditUser?.id ?? null,
    correctedAt: new Date(),
    updatedBy: auditUser?.id
  };

  if (correction.attendanceDayId) {
    await tx.attendanceDay.update({
      where: { id: correction.attendanceDayId },
      data: dayData
    });
    return correction.attendanceDayId;
  }

  const existing = await tx.attendanceDay.findUnique({
    where: {
      staffId_date: {
        staffId: correction.staffId,
        date: correction.date
      }
    }
  });

  if (existing) {
    await tx.attendanceDay.update({
      where: { id: existing.id },
      data: dayData
    });
    return existing.id;
  }

  const created = await tx.attendanceDay.create({
    data: {
      staffId: correction.staffId,
      date: correction.date,
      staffCode: correction.staffCode,
      staffName: correction.staffName,
      department: correction.department,
      location: '',
      ...dayData,
      createdBy: auditUser?.id
    }
  });
  return created.id;
}

export async function approveAttendanceCorrections(
  ids: string[],
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const parsed = approveRejectSchema.safeParse({ ids });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message:
            parsed.error.flatten().fieldErrors.ids?.[0] ??
            'Select at least one correction'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const corrections = await prisma.attendanceCorrection.findMany({
      where: { id: { in: parsed.data.ids } }
    });

    if (corrections.length !== parsed.data.ids.length) {
      return {
        success: false,
        error: { message: 'One or more corrections were not found' }
      };
    }

    for (const correction of corrections) {
      if (isAttendanceCorrectionLocked(correction.status)) {
        return {
          success: false,
          error: {
            message: `${correction.code} is already ${correction.status} and cannot be approved again`
          }
        };
      }
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      for (const correction of corrections) {
        const dayId = await applyCorrectionToDay(correction, auditUser, tx);
        await tx.attendanceCorrection.update({
          where: { id: correction.id },
          data: {
            status: 'approved',
            attendanceDayId: dayId,
            approvedById: auditUser?.id ?? null,
            approvedByName: auditUser?.name ?? '',
            approvedAt: now,
            updatedBy: auditUser?.id
          }
        });
      }
    });

    return {
      success: true,
      data: { count: corrections.length },
      message: `${corrections.length} correction(s) approved`
    };
  } catch (error: any) {
    console.error('approveAttendanceCorrections error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to approve corrections' }
    };
  }
}

export async function rejectAttendanceCorrections(
  ids: string[],
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    const parsed = approveRejectSchema.safeParse({ ids });
    if (!parsed.success) {
      return {
        success: false,
        error: {
          message:
            parsed.error.flatten().fieldErrors.ids?.[0] ??
            'Select at least one correction'
        }
      };
    }

    const auditUser = toAuditUser(user);
    const corrections = await prisma.attendanceCorrection.findMany({
      where: { id: { in: parsed.data.ids } }
    });

    if (corrections.length !== parsed.data.ids.length) {
      return {
        success: false,
        error: { message: 'One or more corrections were not found' }
      };
    }

    for (const correction of corrections) {
      if (isAttendanceCorrectionLocked(correction.status)) {
        return {
          success: false,
          error: {
            message: `${correction.code} is already ${correction.status} and cannot be rejected again`
          }
        };
      }
    }

    const now = new Date();
    await prisma.attendanceCorrection.updateMany({
      where: { id: { in: parsed.data.ids } },
      data: {
        status: 'rejected',
        rejectedById: auditUser?.id ?? null,
        rejectedByName: auditUser?.name ?? '',
        rejectedAt: now,
        updatedBy: auditUser?.id
      }
    });

    return {
      success: true,
      data: { count: corrections.length },
      message: `${corrections.length} correction(s) rejected`
    };
  } catch (error: any) {
    console.error('rejectAttendanceCorrections error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to reject corrections' }
    };
  }
}

export async function getAttendanceCorrectionsForExport(
  params: GetAttendanceCorrectionsParams
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  error?: { message?: string };
}> {
  const result = await getAttendanceCorrections({
    ...params,
    page: '1',
    limit: '5000'
  });
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error,
      message: result.message
    };
  }

  return {
    success: true,
    data: result.data.records.map((row) => ({
      correctionNo: row.code,
      staffCode: row.staffCode,
      staffName: row.staffName,
      department: row.department,
      designation: row.designation,
      date: row.date,
      originalIn: row.originalFirstInLabel,
      originalOut: row.originalLastOutLabel,
      originalStatus: row.originalStatus,
      correctedIn: row.correctedFirstInLabel,
      correctedOut: row.correctedLastOutLabel,
      correctedStatus: row.correctedStatus,
      reason: row.reason,
      status: row.status,
      requestedBy: row.requestedByName,
      updatedBy: row.updatedUser?.name || row.updatedBy || '',
      updatedAt: row.updatedAt,
      createdBy: row.createdUser?.name || row.createdBy || '',
      createdAt: row.createdAt
    }))
  };
}
