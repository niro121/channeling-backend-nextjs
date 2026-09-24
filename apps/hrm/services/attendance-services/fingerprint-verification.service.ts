import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  ATTENDANCE_TIMEZONE,
  addColomboCivilDays,
  colomboDateIsoToUtc,
  colomboMinutesFromMidnight,
  colomboWallTimeToUtc,
  parseHhMmToMinutes,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { recomputeAttendanceDaysForDate } from '@/services/attendance-services/attendance-day.service';
import type {
  FingerprintRowStatus,
  FingerprintVerificationFilterOptions,
  FingerprintVerificationMode,
  FingerprintVerificationRow,
  FingerprintVerificationSaveRow,
  FingerprintVerificationSummary,
  FingerprintVerificationWorkspace,
  GetFingerprintVerificationParams
} from '@/types/attendance';

function formatDayHeading(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'dd MM yyyy - EEEE');
}

function formatAttTime(instant: Date | null | undefined): string {
  if (!instant) return '';
  const zoned = new TZDate(instant.getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'hh:mm a');
}

function formatVerifiedTime(instant: Date | null | undefined): string {
  if (!instant) return '';
  const zoned = new TZDate(instant.getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'hh:mm:ss a');
}

/** Parse "08:16 AM" / "08:16:04 AM" / "08:16" into HH:mm[:ss] parts. */
function parseDisplayTime(value: string | null | undefined): {
  hours: number;
  minutes: number;
  seconds: number;
} | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  const ampm = /^(.*?)\s*(AM|PM)$/i.exec(raw);
  const timePart = (ampm?.[1] ?? raw).trim();
  const meridiem = (ampm?.[2] ?? '').toUpperCase();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timePart);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    Number.isNaN(seconds) ||
    minutes > 59 ||
    seconds > 59
  ) {
    return null;
  }
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (!meridiem && (hours < 0 || hours > 23)) return null;
  return { hours, minutes, seconds };
}

function displayTimeToUtc(
  dateIso: string,
  display: string | null | undefined
): Date | null {
  const parts = parseDisplayTime(display);
  if (!parts) return null;
  const civil = colomboDateIsoToUtc(dateIso);
  const base = colomboWallTimeToUtc(civil, parts.hours, parts.minutes, 0);
  if (parts.seconds <= 0) return base;
  return new Date(base.getTime() + parts.seconds * 1000);
}

function eachCivilDayInclusive(fromIso: string, toIso: string): string[] {
  const days: string[] = [];
  let cursor = colomboDateIsoToUtc(fromIso);
  const end = colomboDateIsoToUtc(toIso);
  while (cursor.getTime() <= end.getTime()) {
    days.push(toColomboDateIso(cursor));
    cursor = addColomboCivilDays(cursor, 1);
  }
  return days;
}

function computeRowStatus(input: {
  isLeave: boolean;
  isDayOff: boolean;
  verifiedStart: string;
  verifiedEnd: string;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  earlyExitThresholdMinutes: number;
}): { status: FingerprintRowStatus; exceptionCode: string } {
  if ((input.isLeave || input.isDayOff) && !input.verifiedStart && !input.verifiedEnd) {
    return { status: 'missing', exceptionCode: '' };
  }

  const hasStart = Boolean(input.verifiedStart.trim());
  const hasEnd = Boolean(input.verifiedEnd.trim());
  if (!hasStart || !hasEnd) {
    return { status: 'missing', exceptionCode: '' };
  }

  const startParts = parseDisplayTime(input.verifiedStart);
  if (startParts && input.shiftStartTime) {
    const startMins = parseHhMmToMinutes(input.shiftStartTime);
    if (startMins != null) {
      const arrival = startParts.hours * 60 + startParts.minutes;
      if (arrival > startMins + Math.max(0, input.graceMinutes || 0)) {
        return { status: 'late', exceptionCode: 'L' };
      }
    }
  }

  const endParts = parseDisplayTime(input.verifiedEnd);
  if (endParts && input.shiftEndTime) {
    const endMins = parseHhMmToMinutes(input.shiftEndTime);
    if (endMins != null) {
      const departure = endParts.hours * 60 + endParts.minutes;
      const threshold = Math.max(0, input.earlyExitThresholdMinutes || 0);
      if (departure < endMins - threshold) {
        return { status: 'early_out', exceptionCode: 'E' };
      }
    }
  }

  return { status: 'ok', exceptionCode: '' };
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ok':
      return 'OK';
    case 'missing':
      return 'Missing';
    case 'late':
      return 'Late';
    case 'early_out':
      return 'Early Out';
    default:
      return status;
  }
}

function summarize(
  rows: FingerprintVerificationRow[]
): FingerprintVerificationSummary {
  return {
    verified: rows.filter((r) => r.status === 'ok').length,
    late: rows.filter((r) => r.status === 'late').length,
    missingPunch: rows.filter((r) => r.status === 'missing').length,
    earlyOut: rows.filter((r) => r.status === 'early_out').length
  };
}

async function loadFilterOptions(): Promise<FingerprintVerificationFilterOptions> {
  const [rosters, staff] = await Promise.all([
    prisma.shiftRoster.findMany({
      where: { status: { in: ['published', 'draft'] } },
      select: {
        id: true,
        code: true,
        name: true,
        roster: true,
        department: true,
        fromDate: true,
        toDate: true
      },
      orderBy: { fromDate: 'desc' },
      take: 200
    }),
    prisma.staff.findMany({
      where: { status: 1 },
      select: { id: true, code: true, name: true },
      orderBy: { name: 'asc' },
      take: 500
    })
  ]);

  return {
    rosters: rosters.map((r) => {
      const range = `${toColomboDateIso(r.fromDate)} → ${toColomboDateIso(r.toDate)}`;
      const label =
        r.name?.trim() ||
        [r.roster, r.department].filter(Boolean).join(' · ') ||
        r.code;
      return { id: r.id, name: `${label} (${range})` };
    }),
    staff: staff.map((s) => ({
      id: s.id,
      name: `${s.code} — ${s.name}`
    }))
  };
}

function mapAllocationRow(input: {
  allocation: {
    id: string;
    staffId: string;
    date: Date;
    staffCode: string;
    staffName: string;
    isLeave: boolean;
    hours: number;
    holidayId: string | null;
    shiftType: {
      name: string;
      chipLabel: string | null;
      startTime: string;
      endTime: string;
      graceMinutes: number;
      earlyExitThresholdMinutes: number;
      durationHours: number;
    } | null;
  };
  day: {
    id: string;
    firstInAt: Date | null;
    lastOutAt: Date | null;
    verifiedFirstInAt: Date | null;
    verifiedLastOutAt: Date | null;
  } | null;
  staffLegacyId: string;
  no: number;
  fillMode?: 'none' | 'all' | 'additional';
}): FingerprintVerificationRow {
  const dateIso = toColomboDateIso(input.allocation.date);
  const shift = input.allocation.shiftType;
  const isDayOff =
    Boolean(input.allocation.holidayId) ||
    (!input.allocation.isLeave &&
      (shift?.chipLabel?.toUpperCase() === 'DO' ||
        shift?.name?.toUpperCase() === 'DO'));

  const shiftLabel = input.allocation.isLeave
    ? 'LV'
    : isDayOff
      ? 'DO'
      : shift?.chipLabel ||
        (shift?.startTime && shift?.endTime
          ? `${shift.startTime.replace(':', '.')}-${shift.endTime.replace(':', '.')}`
          : shift?.name || '—');

  const durationMinutes =
    input.allocation.hours > 0
      ? Math.round(input.allocation.hours * 60)
      : Math.round((shift?.durationHours ?? 0) * 60);

  let attStart = formatAttTime(input.day?.firstInAt);
  let attEnd = formatAttTime(input.day?.lastOutAt);
  let verifiedStart = formatVerifiedTime(input.day?.verifiedFirstInAt);
  let verifiedEnd = formatVerifiedTime(input.day?.verifiedLastOutAt);

  if (input.fillMode === 'all') {
    if (attStart) verifiedStart = formatVerifiedTime(input.day?.firstInAt);
    if (attEnd) verifiedEnd = formatVerifiedTime(input.day?.lastOutAt);
  } else if (input.fillMode === 'additional') {
    if (!verifiedStart && attStart) {
      verifiedStart = formatVerifiedTime(input.day?.firstInAt);
    }
    if (!verifiedEnd && attEnd) {
      verifiedEnd = formatVerifiedTime(input.day?.lastOutAt);
    }
  }

  const { status, exceptionCode } = computeRowStatus({
    isLeave: input.allocation.isLeave,
    isDayOff,
    verifiedStart,
    verifiedEnd,
    shiftStartTime: shift?.startTime ?? '',
    shiftEndTime: shift?.endTime ?? '',
    graceMinutes: shift?.graceMinutes ?? 0,
    earlyExitThresholdMinutes: shift?.earlyExitThresholdMinutes ?? 0
  });

  return {
    rowKey: input.allocation.id,
    attendanceDayId: input.day?.id ?? null,
    rosterAllocationId: input.allocation.id,
    staffId: input.allocation.staffId,
    date: dateIso,
    dateLabel: formatDayHeading(dateIso),
    no: input.no,
    shiftLabel,
    durationMinutes,
    staffCode: input.allocation.staffCode,
    staffLegacyId: input.staffLegacyId,
    leaveReplace: input.allocation.isLeave ? 'Leave' : '—',
    staffName: input.allocation.staffName,
    attStart,
    attEnd,
    exceptionCode,
    verifiedStart,
    verifiedEnd,
    status,
    statusLabel: statusLabel(status),
    shiftStartTime: shift?.startTime ?? '',
    shiftEndTime: shift?.endTime ?? '',
    graceMinutes: shift?.graceMinutes ?? 0,
    earlyExitThresholdMinutes: shift?.earlyExitThresholdMinutes ?? 0
  };
}

export async function getFingerprintVerificationWorkspace(
  params: GetFingerprintVerificationParams = {},
  options?: { fillMode?: 'none' | 'all' | 'additional' }
): Promise<{
  success: boolean;
  data?: FingerprintVerificationWorkspace;
  error?: { message?: string };
}> {
  try {
    const mode: FingerprintVerificationMode =
      params.mode === 'staff' ? 'staff' : 'roster';
    const today = toColomboDateIso(new Date());
    const fromDate = params.fromDate?.trim().slice(0, 10) || today;
    const toDate = params.toDate?.trim().slice(0, 10) || fromDate;

    if (colomboDateIsoToUtc(fromDate).getTime() > colomboDateIsoToUtc(toDate).getTime()) {
      return {
        success: false,
        error: { message: 'From date must be on or before To date' }
      };
    }

    const filterOptions = await loadFilterOptions();
    const fillMode = options?.fillMode ?? 'none';

    if (mode === 'roster' && !params.shiftRosterId?.trim()) {
      return {
        success: true,
        data: {
          mode,
          fromDate,
          toDate,
          summary: { verified: 0, late: 0, missingPunch: 0, earlyOut: 0 },
          rows: [],
          filterOptions
        }
      };
    }

    if (mode === 'staff' && !params.staffId?.trim()) {
      return {
        success: true,
        data: {
          mode,
          fromDate,
          toDate,
          summary: { verified: 0, late: 0, missingPunch: 0, earlyOut: 0 },
          rows: [],
          filterOptions
        }
      };
    }

    const fromUtc = colomboDateIsoToUtc(fromDate);
    const toUtc = colomboDateIsoToUtc(toDate);

    const allocationWhere: Record<string, unknown> = {
      date: { gte: fromUtc, lte: toUtc },
      status: { in: ['published', 'amended', 'draft'] }
    };
    if (mode === 'roster') {
      allocationWhere.shiftRosterId = params.shiftRosterId!.trim();
    } else {
      allocationWhere.staffId = params.staffId!.trim();
    }

    const allocations = await prisma.rosterAllocation.findMany({
      where: allocationWhere,
      orderBy: [{ date: 'asc' }, { staffName: 'asc' }],
      select: {
        id: true,
        staffId: true,
        date: true,
        staffCode: true,
        staffName: true,
        isLeave: true,
        hours: true,
        holidayId: true,
        shiftType: {
          select: {
            name: true,
            chipLabel: true,
            startTime: true,
            endTime: true,
            graceMinutes: true,
            earlyExitThresholdMinutes: true,
            durationHours: true
          }
        }
      }
    });

    if (allocations.length === 0) {
      return {
        success: true,
        data: {
          mode,
          fromDate,
          toDate,
          summary: { verified: 0, late: 0, missingPunch: 0, earlyOut: 0 },
          rows: [],
          filterOptions
        }
      };
    }

    if (fillMode !== 'none') {
      const days = eachCivilDayInclusive(fromDate, toDate);
      for (const day of days) {
        await recomputeAttendanceDaysForDate({ dateIso: day });
      }
    }

    const staffIds = [...new Set(allocations.map((a) => a.staffId))];
    const [days, staffRows] = await Promise.all([
      prisma.attendanceDay.findMany({
        where: {
          staffId: { in: staffIds },
          date: { gte: fromUtc, lte: toUtc }
        }
      }),
      prisma.staff.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, fingerPrintRfid: true, code: true }
      })
    ]);

    const dayMap = new Map(
      days.map((d) => [`${d.staffId}:${toColomboDateIso(d.date)}`, d])
    );
    const staffMap = new Map(staffRows.map((s) => [s.id, s]));

    const perDayCounter = new Map<string, number>();
    const rows: FingerprintVerificationRow[] = allocations.map((allocation) => {
      const dateIso = toColomboDateIso(allocation.date);
      const no = (perDayCounter.get(dateIso) ?? 0) + 1;
      perDayCounter.set(dateIso, no);
      const day = dayMap.get(`${allocation.staffId}:${dateIso}`) ?? null;
      const staff = staffMap.get(allocation.staffId);
      return mapAllocationRow({
        allocation,
        day,
        staffLegacyId: staff?.fingerPrintRfid?.trim() || staff?.code || '',
        no,
        fillMode
      });
    });

    return {
      success: true,
      data: {
        mode,
        fromDate,
        toDate,
        summary: summarize(rows),
        rows,
        filterOptions
      }
    };
  } catch (error: any) {
    console.error('getFingerprintVerificationWorkspace error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to load fingerprint verification'
      }
    };
  }
}

function deriveDayStatusFromVerified(input: {
  verifiedFirstInAt: Date | null;
  verifiedLastOutAt: Date | null;
  isLeave: boolean;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  earlyExitThresholdMinutes: number;
}): { status: string; flags: string[] } {
  if (input.isLeave) {
    return { status: 'on_leave', flags: [] };
  }
  const flags: string[] = [];
  if (!input.verifiedFirstInAt && !input.verifiedLastOutAt) {
    return { status: 'absent', flags };
  }
  if (!input.verifiedFirstInAt) {
    flags.push('missing_in');
    return { status: 'missing_punch', flags };
  }
  if (!input.verifiedLastOutAt) {
    flags.push('missing_out');
    return { status: 'missing_punch', flags };
  }

  let status = 'present';
  const startMins = parseHhMmToMinutes(input.shiftStartTime);
  if (startMins != null) {
    const arrival = colomboMinutesFromMidnight(input.verifiedFirstInAt);
    if (arrival > startMins + Math.max(0, input.graceMinutes || 0)) {
      status = 'late';
    }
  }

  const endMins = parseHhMmToMinutes(input.shiftEndTime);
  if (endMins != null) {
    const departure = colomboMinutesFromMidnight(input.verifiedLastOutAt);
    const threshold = Math.max(0, input.earlyExitThresholdMinutes || 0);
    if (departure < endMins - threshold) {
      flags.push('early_exit');
      if (status === 'present') status = 'early_out';
    }
  }

  return { status, flags };
}

export async function saveFingerprintVerificationRows(
  rows: FingerprintVerificationSaveRow[],
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> {
  try {
    if (!rows.length) {
      return { success: false, error: { message: 'No rows to save' } };
    }
    const auditUser = toAuditUser(user);
    const now = new Date();
    let count = 0;

    for (const row of rows) {
      const civilDate = colomboDateIsoToUtc(row.date);
      const verifiedFirstInAt = row.clearVerified
        ? null
        : displayTimeToUtc(row.date, row.verifiedStart);
      const verifiedLastOutAt = row.clearVerified
        ? null
        : displayTimeToUtc(row.date, row.verifiedEnd);

      let allocation: {
        isLeave: boolean;
        department: string;
        dutyLocation: string;
        staffCode: string;
        staffName: string;
        shiftTypeId: string;
        id: string;
        shiftType: {
          startTime: string;
          endTime: string;
          graceMinutes: number;
          earlyExitThresholdMinutes: number;
        } | null;
      } | null = null;

      if (row.rosterAllocationId) {
        allocation = await prisma.rosterAllocation.findUnique({
          where: { id: row.rosterAllocationId },
          select: {
            id: true,
            isLeave: true,
            department: true,
            dutyLocation: true,
            staffCode: true,
            staffName: true,
            shiftTypeId: true,
            shiftType: {
              select: {
                startTime: true,
                endTime: true,
                graceMinutes: true,
                earlyExitThresholdMinutes: true
              }
            }
          }
        });
      }

      const derived = deriveDayStatusFromVerified({
        verifiedFirstInAt,
        verifiedLastOutAt,
        isLeave: Boolean(allocation?.isLeave),
        shiftStartTime: allocation?.shiftType?.startTime ?? '',
        shiftEndTime: allocation?.shiftType?.endTime ?? '',
        graceMinutes: allocation?.shiftType?.graceMinutes ?? 0,
        earlyExitThresholdMinutes:
          allocation?.shiftType?.earlyExitThresholdMinutes ?? 0
      });

      const existing =
        row.attendanceDayId
          ? await prisma.attendanceDay.findUnique({
              where: { id: row.attendanceDayId }
            })
          : await prisma.attendanceDay.findUnique({
              where: {
                staffId_date: { staffId: row.staffId, date: civilDate }
              }
            });

      // Punches (firstInAt / lastOutAt) stay immutable — only verified* + derived status.
      const payload = {
        verifiedFirstInAt,
        verifiedLastOutAt,
        verifiedBy: row.clearVerified ? null : (auditUser?.id ?? null),
        verifiedAt: row.clearVerified ? null : now,
        status: derived.status,
        flags: derived.flags,
        updatedBy: auditUser?.id,
        ...(allocation
          ? {
              department: allocation.department,
              location: allocation.dutyLocation,
              staffCode: allocation.staffCode,
              staffName: allocation.staffName,
              shiftTypeId: allocation.shiftTypeId,
              rosterAllocationId: allocation.id
            }
          : {})
      };

      if (existing) {
        await prisma.attendanceDay.update({
          where: { id: existing.id },
          data: payload
        });
      } else {
        const staff = await prisma.staff.findUnique({
          where: { id: row.staffId },
          select: { code: true, name: true }
        });
        await prisma.attendanceDay.create({
          data: {
            staffId: row.staffId,
            date: civilDate,
            staffCode: allocation?.staffCode || staff?.code || '',
            staffName: allocation?.staffName || staff?.name || '',
            department: allocation?.department || '',
            location: allocation?.dutyLocation || '',
            ...payload,
            createdBy: auditUser?.id
          }
        });
      }
      count += 1;
    }

    return {
      success: true,
      data: { count },
      message: `${count} row(s) saved`
    };
  } catch (error: any) {
    console.error('saveFingerprintVerificationRows error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to save verification rows' }
    };
  }
}

export async function getFingerprintVerificationExport(
  params: GetFingerprintVerificationParams
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  message?: string;
  error?: { message?: string };
}> {
  const result = await getFingerprintVerificationWorkspace(params);
  if (!result.success || !result.data) {
    return { success: false, error: result.error };
  }
  return {
    success: true,
    data: result.data.rows.map((row) => ({
      date: row.dateLabel,
      no: row.no,
      shift: row.shiftLabel,
      duration: row.durationMinutes,
      staffCode: row.staffCode,
      id: row.staffLegacyId,
      leaveReplace: row.leaveReplace,
      staffName: row.staffName,
      attStart: row.attStart || '',
      exception: row.exceptionCode,
      attEnd: row.attEnd || '',
      verifiedStart: row.verifiedStart || '',
      verifiedEnd: row.verifiedEnd || '',
      status: row.statusLabel
    }))
  };
}
