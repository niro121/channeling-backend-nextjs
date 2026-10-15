import { format } from 'date-fns';
import { TZDate } from '@date-fns/tz';
import { authPrisma } from '@archmage/db-auth';
import prisma from '@/lib/prisma';
import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';
import {
  ATTENDANCE_TIMEZONE,
  colomboDateIsoToUtc,
  getColomboParts,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import { toDailyDisplayStatus } from '@/services/attendance-services/daily-attendance.service';
import {
  ATTENDANCE_LOG_ACTION_TYPE_OPTIONS,
  ATTENDANCE_LOG_DAY_STATUS_OPTIONS,
  ATTENDANCE_LOG_SOURCE_OPTIONS,
  type AttendanceLogActionType,
  type AttendanceLogCards,
  type AttendanceLogFilterOptions,
  type AttendanceLogHistoryEntry,
  type AttendanceLogRecord,
  type AttendanceLogRegister,
  type AttendanceLogSource,
  type AttendanceLogStatus,
  type GetAttendanceLogsParams,
  type RfidFilterOption
} from '@/types/attendance';

function toOption(value: string): RfidFilterOption {
  return { id: value, name: value };
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.map((v) => v?.trim()).filter(Boolean) as string[])
  ].sort((a, b) => a.localeCompare(b));
}

function defaultPeriod(): { fromDate: string; toDate: string } {
  const todayIso = toColomboDateIso(new Date());
  const [y, m] = todayIso.split('-').map(Number);
  const fromDate = `${y}-${String(m).padStart(2, '0')}-01`;
  return { fromDate, toDate: todayIso };
}

function formatShortDate(dateIso: string): string {
  const d = colomboDateIsoToUtc(dateIso);
  const zoned = new TZDate(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
    ATTENDANCE_TIMEZONE
  );
  return format(zoned, 'd MMM yyyy');
}

function periodLabel(fromDate: string, toDate: string): string {
  const from = colomboDateIsoToUtc(fromDate);
  const zoned = new TZDate(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      12,
      0,
      0
    ),
    ATTENDANCE_TIMEZONE
  );
  if (fromDate.slice(0, 7) === toDate.slice(0, 7)) {
    return format(zoned, 'MMMM yyyy');
  }
  return `${formatShortDate(fromDate)} → ${formatShortDate(toDate)}`;
}

function formatHhMm(instant: Date | null | undefined): string {
  if (!instant) return '—';
  const parts = getColomboParts(instant);
  return `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
}

function formatEventDateLabel(instant: Date): string {
  const zoned = new TZDate(instant.getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'd MMM yyyy');
}

function formatEventTimeLabel(instant: Date): string {
  const zoned = new TZDate(instant.getTime(), ATTENDANCE_TIMEZONE);
  return format(zoned, 'HH:mm:ss');
}

function actionLabel(type: AttendanceLogActionType): string {
  return (
    ATTENDANCE_LOG_ACTION_TYPE_OPTIONS.find((o) => o.id === type)?.name ?? type
  );
}

function sourceLabel(source: AttendanceLogSource): string {
  return (
    ATTENDANCE_LOG_SOURCE_OPTIONS.find((o) => o.id === source)?.name ?? source
  );
}

function dayStatusLabel(statusId: string): string {
  return (
    ATTENDANCE_LOG_DAY_STATUS_OPTIONS.find((o) => o.id === statusId)?.name ??
    statusId
  );
}

function logStatusLabel(status: AttendanceLogStatus): string {
  const map: Record<AttendanceLogStatus, string> = {
    pending: 'Pending',
    approved: 'Approved',
    recorded: 'Recorded',
    completed: 'Completed',
    rejected: 'Rejected'
  };
  return map[status];
}

function logCodeFromId(prefix: string, id: string): string {
  const tail = id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return `LOG-${prefix}${tail || '000000'}`;
}

function statusValueLine(
  checkIn: string,
  checkOut: string,
  status: string
): string {
  return `Check In: ${checkIn}; Check Out: ${checkOut}; ${dayStatusLabel(status)}`;
}

type RawLog = Omit<
  AttendanceLogRecord,
  'createdUser' | 'updatedUser' | 'actionLabel' | 'sourceLabel' | 'logStatusLabel' | 'attendanceStatusLabel' | 'eventDateLabel' | 'eventTimeLabel' | 'attendanceDateLabel'
> & {
  eventAtDate: Date;
  attendanceDateIso: string;
};

function finalizeLog(
  raw: RawLog,
  users: Map<string, AuthUserSummary>
): AttendanceLogRecord {
  const createdUser = raw.createdBy ? users.get(raw.createdBy) ?? null : null;
  const updatedUser = raw.updatedBy ? users.get(raw.updatedBy) ?? null : null;

  return {
    id: raw.id,
    logCode: raw.logCode,
    eventAt: raw.eventAt,
    eventDateLabel: formatEventDateLabel(raw.eventAtDate),
    eventTimeLabel: formatEventTimeLabel(raw.eventAtDate),
    staffId: raw.staffId,
    staffCode: raw.staffCode,
    staffName: raw.staffName,
    department: raw.department,
    attendanceDate: raw.attendanceDate,
    attendanceDateLabel: formatShortDate(raw.attendanceDateIso),
    actionType: raw.actionType,
    actionLabel: actionLabel(raw.actionType),
    previousValue: raw.previousValue,
    newValue: raw.newValue,
    source: raw.source,
    sourceLabel: sourceLabel(raw.source),
    performedById: raw.performedById,
    performedByName: raw.performedByName,
    remarks: raw.remarks,
    logStatus: raw.logStatus,
    logStatusLabel: logStatusLabel(raw.logStatus),
    attendanceStatus: raw.attendanceStatus,
    attendanceStatusLabel: dayStatusLabel(raw.attendanceStatus),
    entityType: raw.entityType,
    entityId: raw.entityId,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    createdBy: raw.createdBy,
    updatedBy: raw.updatedBy,
    createdUser,
    updatedUser
  };
}

function mapDayToLogs(day: {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  date: Date;
  firstInAt: Date | null;
  lastOutAt: Date | null;
  status: string;
  flags: string[];
  correctionReason: string;
  correctedBy: string | null;
  correctedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  rosterAllocationId: string | null;
}): RawLog[] {
  const attendanceDateIso = toColomboDateIso(day.date);
  const displayStatus = toDailyDisplayStatus(day.status, day.flags);
  const inLabel = formatHhMm(day.firstInAt);
  const outLabel = formatHhMm(day.lastOutAt);
  const valueLine = statusValueLine(inLabel, outLabel, displayStatus);
  const logs: RawLog[] = [];

  const createdSource: AttendanceLogSource = day.rosterAllocationId
    ? 'roster'
    : day.createdBy
      ? 'web'
      : 'system';

  logs.push({
    id: `day:${day.id}:created`,
    logCode: logCodeFromId('D', day.id),
    eventAt: day.createdAt.toISOString(),
    eventAtDate: day.createdAt,
    staffId: day.staffId,
    staffCode: day.staffCode || '—',
    staffName: day.staffName || '—',
    department: day.department || '',
    attendanceDate: attendanceDateIso,
    attendanceDateIso,
    actionType: createdSource === 'system' ? 'system_generated' : 'attendance_created',
    previousValue: '—',
    newValue: valueLine,
    source: createdSource,
    performedById: day.createdBy,
    performedByName: day.createdBy ? 'User' : 'Attendance Engine',
    remarks: day.correctionReason || 'Day record created',
    logStatus: 'recorded',
    attendanceStatus: displayStatus,
    entityType: 'AttendanceDay',
    entityId: day.id,
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
    createdBy: day.createdBy,
    updatedBy: day.updatedBy
  });

  const updatedMs = day.updatedAt.getTime() - day.createdAt.getTime();
  if (updatedMs > 2000 && !day.correctedAt) {
    logs.push({
      id: `day:${day.id}:updated`,
      logCode: logCodeFromId('U', day.id),
      eventAt: day.updatedAt.toISOString(),
      eventAtDate: day.updatedAt,
      staffId: day.staffId,
      staffCode: day.staffCode || '—',
      staffName: day.staffName || '—',
      department: day.department || '',
      attendanceDate: attendanceDateIso,
      attendanceDateIso,
      actionType: day.updatedBy ? 'attendance_updated' : 'system_generated',
      previousValue: '—',
      newValue: valueLine,
      source: day.updatedBy ? 'web' : 'system',
      performedById: day.updatedBy,
      performedByName: day.updatedBy ? 'User' : 'Attendance Engine',
      remarks: day.correctionReason || 'Day record updated',
      logStatus: 'completed',
      attendanceStatus: displayStatus,
      entityType: 'AttendanceDay',
      entityId: day.id,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
      createdBy: day.createdBy,
      updatedBy: day.updatedBy
    });
  }

  if (day.correctedAt) {
    logs.push({
      id: `day:${day.id}:status`,
      logCode: logCodeFromId('S', day.id),
      eventAt: day.correctedAt.toISOString(),
      eventAtDate: day.correctedAt,
      staffId: day.staffId,
      staffCode: day.staffCode || '—',
      staffName: day.staffName || '—',
      department: day.department || '',
      attendanceDate: attendanceDateIso,
      attendanceDateIso,
      actionType: 'status_changed',
      previousValue: '—',
      newValue: valueLine,
      source: 'web',
      performedById: day.correctedBy,
      performedByName: day.correctedBy ? 'User' : 'Authorized user',
      remarks: day.correctionReason || 'Status corrected',
      logStatus: 'completed',
      attendanceStatus: displayStatus,
      entityType: 'AttendanceDay',
      entityId: day.id,
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
      createdBy: day.createdBy,
      updatedBy: day.updatedBy
    });
  }

  return logs;
}

function mapCorrectionToLogs(row: {
  id: string;
  code: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  date: Date;
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
}): RawLog[] {
  if (row.status === 'draft' || row.status === 'cancelled') return [];

  const attendanceDateIso = toColomboDateIso(row.date);
  const prev = statusValueLine(
    formatHhMm(row.originalFirstInAt),
    formatHhMm(row.originalLastOutAt),
    row.originalStatus || 'incomplete'
  );
  const next = statusValueLine(
    formatHhMm(row.correctedFirstInAt),
    formatHhMm(row.correctedLastOutAt),
    row.correctedStatus || 'present'
  );
  const dayStatus =
    row.correctedStatus || row.originalStatus || 'incomplete';
  const logs: RawLog[] = [];

  const submittedAt = row.requestedAt ?? row.createdAt;
  logs.push({
    id: `correction:${row.id}:submitted`,
    logCode: logCodeFromId('C', row.id),
    eventAt: submittedAt.toISOString(),
    eventAtDate: submittedAt,
    staffId: row.staffId,
    staffCode: row.staffCode || '—',
    staffName: row.staffName || '—',
    department: row.department || '',
    attendanceDate: attendanceDateIso,
    attendanceDateIso,
    actionType: 'correction_submitted',
    previousValue: prev,
    newValue: next,
    source: 'correction',
    performedById: row.requestedById,
    performedByName: row.requestedByName || 'User',
    remarks: row.reason || `Correction ${row.code}`,
    logStatus: row.status === 'pending_approval' ? 'pending' : 'pending',
    attendanceStatus: dayStatus,
    entityType: 'AttendanceCorrection',
    entityId: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy
  });

  const inChanged =
    formatHhMm(row.originalFirstInAt) !== formatHhMm(row.correctedFirstInAt);
  const outChanged =
    formatHhMm(row.originalLastOutAt) !== formatHhMm(row.correctedLastOutAt);
  const statusChanged =
    (row.originalStatus || '').trim() !== (row.correctedStatus || '').trim();

  if (row.status === 'approved' && row.approvedAt) {
    logs.push({
      id: `correction:${row.id}:approved`,
      logCode: logCodeFromId('A', row.id),
      eventAt: row.approvedAt.toISOString(),
      eventAtDate: row.approvedAt,
      staffId: row.staffId,
      staffCode: row.staffCode || '—',
      staffName: row.staffName || '—',
      department: row.department || '',
      attendanceDate: attendanceDateIso,
      attendanceDateIso,
      actionType: 'correction_approved',
      previousValue: prev,
      newValue: next,
      source: 'correction',
      performedById: row.approvedById,
      performedByName: row.approvedByName || 'Approver',
      remarks: row.reason || `Approved ${row.code}`,
      logStatus: 'approved',
      attendanceStatus: dayStatus,
      entityType: 'AttendanceCorrection',
      entityId: row.id,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
      updatedBy: row.updatedBy
    });

    if (inChanged) {
      logs.push({
        id: `correction:${row.id}:checkin`,
        logCode: logCodeFromId('I', row.id),
        eventAt: row.approvedAt.toISOString(),
        eventAtDate: row.approvedAt,
        staffId: row.staffId,
        staffCode: row.staffCode || '—',
        staffName: row.staffName || '—',
        department: row.department || '',
        attendanceDate: attendanceDateIso,
        attendanceDateIso,
        actionType: 'check_in_modified',
        previousValue: formatHhMm(row.originalFirstInAt),
        newValue: formatHhMm(row.correctedFirstInAt),
        source: 'correction',
        performedById: row.approvedById,
        performedByName: row.approvedByName || 'Approver',
        remarks: row.reason || 'Check-in modified via correction',
        logStatus: 'completed',
        attendanceStatus: dayStatus,
        entityType: 'AttendanceCorrection',
        entityId: row.id,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy
      });
    }
    if (outChanged) {
      logs.push({
        id: `correction:${row.id}:checkout`,
        logCode: logCodeFromId('O', row.id),
        eventAt: row.approvedAt.toISOString(),
        eventAtDate: row.approvedAt,
        staffId: row.staffId,
        staffCode: row.staffCode || '—',
        staffName: row.staffName || '—',
        department: row.department || '',
        attendanceDate: attendanceDateIso,
        attendanceDateIso,
        actionType: 'check_out_modified',
        previousValue: formatHhMm(row.originalLastOutAt),
        newValue: formatHhMm(row.correctedLastOutAt),
        source: 'correction',
        performedById: row.approvedById,
        performedByName: row.approvedByName || 'Approver',
        remarks: row.reason || 'Check-out modified via correction',
        logStatus: 'completed',
        attendanceStatus: dayStatus,
        entityType: 'AttendanceCorrection',
        entityId: row.id,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy
      });
    }
    if (statusChanged) {
      logs.push({
        id: `correction:${row.id}:status`,
        logCode: logCodeFromId('T', row.id),
        eventAt: row.approvedAt.toISOString(),
        eventAtDate: row.approvedAt,
        staffId: row.staffId,
        staffCode: row.staffCode || '—',
        staffName: row.staffName || '—',
        department: row.department || '',
        attendanceDate: attendanceDateIso,
        attendanceDateIso,
        actionType: 'status_changed',
        previousValue: dayStatusLabel(row.originalStatus || 'incomplete'),
        newValue: dayStatusLabel(row.correctedStatus || 'present'),
        source: 'correction',
        performedById: row.approvedById,
        performedByName: row.approvedByName || 'Approver',
        remarks: row.reason || 'Status changed via correction',
        logStatus: 'completed',
        attendanceStatus: dayStatus,
        entityType: 'AttendanceCorrection',
        entityId: row.id,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        createdBy: row.createdBy,
        updatedBy: row.updatedBy
      });
    }
  }

  if (row.status === 'rejected' && row.rejectedAt) {
    logs.push({
      id: `correction:${row.id}:rejected`,
      logCode: logCodeFromId('R', row.id),
      eventAt: row.rejectedAt.toISOString(),
      eventAtDate: row.rejectedAt,
      staffId: row.staffId,
      staffCode: row.staffCode || '—',
      staffName: row.staffName || '—',
      department: row.department || '',
      attendanceDate: attendanceDateIso,
      attendanceDateIso,
      actionType: 'correction_rejected',
      previousValue: prev,
      newValue: next,
      source: 'correction',
      performedById: row.rejectedById,
      performedByName: row.rejectedByName || 'Reviewer',
      remarks: row.reason || `Rejected ${row.code}`,
      logStatus: 'rejected',
      attendanceStatus: dayStatus,
      entityType: 'AttendanceCorrection',
      entityId: row.id,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.createdBy,
      updatedBy: row.updatedBy
    });
  }

  return logs;
}

function matchesFilters(
  log: RawLog,
  params: GetAttendanceLogsParams
): boolean {
  if (params.department?.trim()) {
    if (
      (log.department || '').trim().toLowerCase() !==
      params.department.trim().toLowerCase()
    ) {
      return false;
    }
  }
  if (params.actionType?.trim() && params.actionType !== '__all__') {
    if (log.actionType !== params.actionType) return false;
  }
  if (
    params.attendanceStatus?.trim() &&
    params.attendanceStatus !== '__all__'
  ) {
    if (log.attendanceStatus !== params.attendanceStatus) return false;
  }
  if (params.source?.trim() && params.source !== '__all__') {
    if (log.source !== params.source) return false;
  }
  if (params.performedById?.trim()) {
    const pid = params.performedById.trim();
    if (pid === '__system__') {
      if (log.performedById) return false;
    } else if (log.performedById !== pid) {
      return false;
    }
  }
  if (params.staffSearch?.trim()) {
    const q = params.staffSearch.trim().toLowerCase();
    const hay = `${log.staffName} ${log.staffCode}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function buildCards(logs: RawLog[]): AttendanceLogCards {
  let systemGenerated = 0;
  let manualUpdates = 0;
  let rejectedChanges = 0;
  for (const log of logs) {
    if (
      log.source === 'system' ||
      log.source === 'rfid' ||
      log.source === 'roster' ||
      log.actionType === 'system_generated'
    ) {
      systemGenerated += 1;
    }
    if (log.source === 'web' || log.source === 'correction') {
      manualUpdates += 1;
    }
    if (
      log.actionType === 'correction_rejected' ||
      log.logStatus === 'rejected'
    ) {
      rejectedChanges += 1;
    }
  }
  return {
    logEvents: logs.length,
    systemGenerated,
    manualUpdates,
    rejectedChanges
  };
}

async function collectRawLogs(
  params: GetAttendanceLogsParams
): Promise<{ fromDate: string; toDate: string; logs: RawLog[] }> {
  const defaults = defaultPeriod();
  const fromDate = params.fromDate?.trim() || defaults.fromDate;
  const toDate = params.toDate?.trim() || defaults.toDate;
  const fromUtc = colomboDateIsoToUtc(fromDate);
  const toUtc = colomboDateIsoToUtc(toDate);
  // Inclusive end-of-day window for event timestamps
  const toExclusive = new Date(toUtc.getTime() + 24 * 60 * 60 * 1000);

  const [days, corrections] = await Promise.all([
    prisma.attendanceDay.findMany({
      where: {
        date: { gte: fromUtc, lte: toUtc }
      },
      orderBy: [{ updatedAt: 'desc' }]
    }),
    prisma.attendanceCorrection.findMany({
      where: {
        OR: [
          { date: { gte: fromUtc, lte: toUtc } },
          {
            createdAt: { gte: fromUtc, lt: toExclusive }
          }
        ],
        status: { notIn: ['draft', 'cancelled'] }
      },
      orderBy: [{ updatedAt: 'desc' }]
    })
  ]);

  const logs: RawLog[] = [];
  for (const day of days) {
    logs.push(...mapDayToLogs(day));
  }
  for (const row of corrections) {
    logs.push(...mapCorrectionToLogs(row));
  }

  // Keep events whose eventAt falls in the selected period
  const inPeriod = logs.filter((log) => {
    const t = log.eventAtDate.getTime();
    return t >= fromUtc.getTime() && t < toExclusive.getTime();
  });

  return { fromDate, toDate, logs: inPeriod.filter((l) => matchesFilters(l, params)) };
}

async function hydrateUsers(
  logs: RawLog[]
): Promise<Map<string, AuthUserSummary>> {
  const ids = uniqueStrings([
    ...logs.map((l) => l.createdBy),
    ...logs.map((l) => l.updatedBy),
    ...logs.map((l) => l.performedById)
  ]);
  if (ids.length === 0) return new Map();
  const users = await authPrisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, email: true }
  });
  return new Map(users.map((u) => [u.id, u]));
}

function applyUserNames(
  logs: RawLog[],
  users: Map<string, AuthUserSummary>
): void {
  for (const log of logs) {
    if (log.performedById) {
      const u = users.get(log.performedById);
      if (u?.name?.trim()) {
        log.performedByName = u.name.trim();
      }
    } else if (
      log.source === 'system' ||
      log.actionType === 'system_generated'
    ) {
      log.performedByName = 'Attendance Engine';
    }
  }
}

async function buildFilterOptions(
  logs: RawLog[],
  users: Map<string, AuthUserSummary>
): Promise<AttendanceLogFilterOptions> {
  const departments = uniqueStrings(logs.map((l) => l.department)).map(
    toOption
  );

  const userOptions: RfidFilterOption[] = [
    { id: '__system__', name: 'Attendance Engine' }
  ];
  const seen = new Set<string>(['__system__']);
  for (const log of logs) {
    if (!log.performedById || seen.has(log.performedById)) continue;
    seen.add(log.performedById);
    const u = users.get(log.performedById);
    userOptions.push({
      id: log.performedById,
      name: u?.name?.trim() || log.performedByName || log.performedById
    });
  }
  userOptions.sort((a, b) => a.name.localeCompare(b.name));

  // Also include departments from staff employment for empty ranges
  if (departments.length === 0) {
    const staffRows = await prisma.staff.findMany({
      where: { status: 1 },
      select: { employmentDetails: true },
      take: 500
    });
    const deps = uniqueStrings(
      staffRows.map(
        (s) =>
          (
            s.employmentDetails as {
              employment?: { department?: string | null };
            } | null
          )?.employment?.department
      )
    ).map(toOption);
    return {
      departments: deps,
      actionTypes: ATTENDANCE_LOG_ACTION_TYPE_OPTIONS,
      attendanceStatuses: ATTENDANCE_LOG_DAY_STATUS_OPTIONS,
      sources: ATTENDANCE_LOG_SOURCE_OPTIONS,
      users: userOptions
    };
  }

  return {
    departments,
    actionTypes: ATTENDANCE_LOG_ACTION_TYPE_OPTIONS,
    attendanceStatuses: ATTENDANCE_LOG_DAY_STATUS_OPTIONS,
    sources: ATTENDANCE_LOG_SOURCE_OPTIONS,
    users: userOptions
  };
}

export async function getAttendanceLogRegister(
  params: GetAttendanceLogsParams = {}
): Promise<{
  success: boolean;
  data?: AttendanceLogRegister;
  error?: { message: string };
}> {
  try {
    const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
    const limit = Math.max(
      1,
      Math.min(100, parseInt(params.limit ?? '10', 10) || 10)
    );

    const defaults = defaultPeriod();
    const fromDate = params.fromDate?.trim() || defaults.fromDate;
    const toDate = params.toDate?.trim() || defaults.toDate;

    const { logs: periodLogs } = await collectRawLogs({ fromDate, toDate });
    const logs = periodLogs
      .filter((l) => matchesFilters(l, params))
      .sort((a, b) => b.eventAtDate.getTime() - a.eventAtDate.getTime());

    const cards = buildCards(logs);
    const totalRecords = logs.length;
    const pageSlice = logs.slice((page - 1) * limit, page * limit);

    const users = await hydrateUsers(periodLogs);
    applyUserNames(pageSlice, users);
    applyUserNames(periodLogs, users);

    const rows = pageSlice.map((raw) => finalizeLog(raw, users));
    const filterOptions = await buildFilterOptions(periodLogs, users);

    return {
      success: true,
      data: {
        fromDate,
        toDate,
        periodLabel: periodLabel(fromDate, toDate),
        cards,
        rows,
        totalRecords,
        filterOptions
      }
    };
  } catch (error: any) {
    console.error('getAttendanceLogRegister error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load attendance logs' }
    };
  }
}

export async function getAttendanceLogForExport(
  params: GetAttendanceLogsParams = {}
): Promise<{
  success: boolean;
  data?: Record<string, unknown>[];
  error?: { message: string };
}> {
  try {
    const { logs } = await collectRawLogs(params);
    logs.sort((a, b) => b.eventAtDate.getTime() - a.eventAtDate.getTime());
    const users = await hydrateUsers(logs);
    applyUserNames(logs, users);
    const rows = logs.map((raw) => finalizeLog(raw, users));

    return {
      success: true,
      data: rows.map((r) => ({
        logCode: r.logCode,
        date: r.eventDateLabel,
        time: r.eventTimeLabel,
        staffCode: r.staffCode,
        staffName: r.staffName,
        attendanceDate: r.attendanceDateLabel,
        action: r.actionLabel,
        previousValue: r.previousValue,
        newValue: r.newValue,
        source: r.sourceLabel,
        performedBy: r.performedByName,
        remarks: r.remarks,
        status: r.logStatusLabel,
        createdBy: r.createdUser?.name ?? r.createdBy ?? '',
        createdAt: r.createdAt,
        updatedBy: r.updatedUser?.name ?? r.updatedBy ?? '',
        updatedAt: r.updatedAt
      }))
    };
  } catch (error: any) {
    console.error('getAttendanceLogForExport error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to export attendance logs' }
    };
  }
}

export async function getAttendanceLogDetail(logId: string): Promise<{
  success: boolean;
  data?: AttendanceLogRecord;
  error?: { message: string };
}> {
  try {
    if (!logId?.trim()) {
      return { success: false, error: { message: 'Log id is required' } };
    }

    const [kind, entityId] = logId.split(':');
    if (!entityId) {
      return { success: false, error: { message: 'Invalid log id' } };
    }

    let candidates: RawLog[] = [];
    if (kind === 'day') {
      const day = await prisma.attendanceDay.findUnique({ where: { id: entityId } });
      if (day) candidates = mapDayToLogs(day);
    } else if (kind === 'correction') {
      const row = await prisma.attendanceCorrection.findUnique({
        where: { id: entityId }
      });
      if (row) candidates = mapCorrectionToLogs(row);
    }

    const raw = candidates.find((l) => l.id === logId);
    if (!raw) {
      return { success: false, error: { message: 'Log entry not found' } };
    }
    const users = await hydrateUsers([raw]);
    applyUserNames([raw], users);
    return { success: true, data: finalizeLog(raw, users) };
  } catch (error: any) {
    console.error('getAttendanceLogDetail error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load log detail' }
    };
  }
}

export async function getAttendanceLogHistory(input: {
  staffId: string;
  attendanceDate: string;
}): Promise<{
  success: boolean;
  data?: AttendanceLogHistoryEntry[];
  error?: { message: string };
}> {
  try {
    const staffId = input.staffId?.trim();
    const attendanceDate = input.attendanceDate?.trim();
    if (!staffId || !attendanceDate) {
      return {
        success: false,
        error: { message: 'Staff and attendance date are required' }
      };
    }

    const dayUtc = colomboDateIsoToUtc(attendanceDate);
    const [days, corrections] = await Promise.all([
      prisma.attendanceDay.findMany({
        where: { staffId, date: dayUtc }
      }),
      prisma.attendanceCorrection.findMany({
        where: {
          staffId,
          date: dayUtc,
          status: { notIn: ['draft', 'cancelled'] }
        }
      })
    ]);

    const related: RawLog[] = [];
    for (const day of days) related.push(...mapDayToLogs(day));
    for (const row of corrections) related.push(...mapCorrectionToLogs(row));
    related.sort((a, b) => b.eventAtDate.getTime() - a.eventAtDate.getTime());

    const users = await hydrateUsers(related);
    applyUserNames(related, users);

    const entries: AttendanceLogHistoryEntry[] = related.map((l) => ({
      id: l.id,
      title: actionLabel(l.actionType),
      detail: `${l.previousValue} → ${l.newValue}${l.remarks ? ` · ${l.remarks}` : ''}`,
      userLabel: l.performedByName,
      at: l.eventAt
    }));

    return { success: true, data: entries };
  } catch (error: any) {
    console.error('getAttendanceLogHistory error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load log history' }
    };
  }
}
