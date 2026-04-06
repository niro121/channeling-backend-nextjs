'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SL_OFFSET, normalizeSessionTime } from '@/lib/utils';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type { DoctorArrivalsReportQuery, DoctorArrivalsReportRow } from '@/types/reports/doctor.arrivals';
import moment from 'moment';

const MAX_RANGE_DAYS = getReportMaxRangeDays('doctor_arrivals', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('doctor_arrivals', 20000);

type ArrivalDepartureEntry = { time: string; createdBy: string };

function parseArrivalDepartureJson(json: unknown): ArrivalDepartureEntry[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (item): item is ArrivalDepartureEntry =>
      item != null &&
      typeof item === 'object' &&
      'time' in item &&
      'createdBy' in item &&
      typeof (item as ArrivalDepartureEntry).time === 'string' &&
      typeof (item as ArrivalDepartureEntry).createdBy === 'string'
  );
}

/** Same calendar semantics as doctor-leave report: date-only and datetimes in Sri Lanka offset. */
function parseFromBound(val: string): Date {
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00${SL_OFFSET}`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(trimmed)) {
    const withoutZ = trimmed.replace(/Z$/i, '');
    const m = withoutZ.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/);
    if (m) {
      const [, dp, hh, mm] = m;
      const base = `${dp}T${String(parseInt(hh, 10)).padStart(2, '0')}:${String(parseInt(mm, 10)).padStart(2, '0')}:00`;
      return new Date(`${base}${SL_OFFSET}`);
    }
  }
  return new Date(trimmed);
}

function parseToBound(val: string): Date {
  const trimmed = val.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T23:59:59.999${SL_OFFSET}`);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(trimmed)) {
    const withoutZ = trimmed.replace(/Z$/i, '');
    const m = withoutZ.match(/^(\d{4}-\d{2}-\d{2})T(\d{1,2}):(\d{2})/);
    if (m) {
      const [, dp, hh, mm] = m;
      const base = `${dp}T${String(parseInt(hh, 10)).padStart(2, '0')}:${String(parseInt(mm, 10)).padStart(2, '0')}:59.999`;
      return new Date(`${base}${SL_OFFSET}`);
    }
  }
  return new Date(trimmed);
}

/** Wall-clock time in Sri Lanka (UTC+5:30) for display e.g. 9.30AM */
function formatTimeSl(d: Date): string {
  return moment(d).utcOffset(330).format('h.mmA');
}

function formatUnixEntryTimeSl(timeStr: string): string {
  const sec = parseInt(timeStr, 10);
  if (!Number.isFinite(sec) || sec <= 0) return '-';
  return formatTimeSl(moment.unix(sec).toDate());
}

function userLabel(
  map: Map<string, { name: string | null; staff: { code: string | null } | null }>,
  userId: string | undefined
): string {
  if (!userId?.trim()) return '-';
  const u = map.get(userId);
  if (!u) return '-';
  const name = u.name?.trim() || '—';
  const code = u.staff?.code?.trim();
  return code ? `${name} (${code})` : name;
}

export async function getDoctorArrivalsReportService(query: DoctorArrivalsReportQuery): Promise<{
  success: boolean;
  data?: DoctorArrivalsReportRow[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> {
  try {
    const trimmedDoctorId = query.doctorId?.trim();
    const hasExplicitDoctor = Boolean(trimmedDoctorId && trimmedDoctorId !== '__all__');

    const hasDateFilter =
      Boolean(query.fromDateTime?.trim()) && Boolean(query.toDateTime?.trim());

    const hasAnyFilter =
      hasDateFilter ||
      (query.institutionId && query.institutionId !== '__all__' && query.institutionId !== '') ||
      (query.locationId && query.locationId !== '__all__' && query.locationId !== '') ||
      (query.departmentId && query.departmentId !== '__all__' && query.departmentId !== '') ||
      (query.specialityId && query.specialityId !== '__all__' && query.specialityId !== '') ||
      hasExplicitDoctor;

    if (!hasAnyFilter) {
      return { success: true, data: [], totalRecords: 0 };
    }

    let fromBound: Date | null = null;
    let toBound: Date | null = null;

    if (hasDateFilter) {
      fromBound = parseFromBound(query.fromDateTime!);
      toBound = parseToBound(query.toDateTime!);
      if (isNaN(fromBound.getTime()) || isNaN(toBound.getTime())) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: 'Invalid date format' }
        };
      }
      const daySpan = getInclusiveDaySpan(fromBound, toBound);
      if (daySpan > MAX_RANGE_DAYS) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` }
        };
      }
    }

    const where: Prisma.SessionWhereInput = {};

    if (query.institutionId && query.institutionId !== '__all__' && query.institutionId !== '') {
      const instNum = parseInt(query.institutionId, 10);
      if (!isNaN(instNum)) where.institution = instNum;
    }
    if (query.locationId && query.locationId !== '__all__' && query.locationId !== '') {
      where.locationId = query.locationId;
    }
    if (query.departmentId && query.departmentId !== '__all__' && query.departmentId !== '') {
      where.departmentId = query.departmentId;
    }
    if (hasExplicitDoctor && trimmedDoctorId) {
      where.doctorId = trimmedDoctorId;
    }
    if (query.specialityId && query.specialityId !== '__all__' && query.specialityId !== '') {
      where.doctor = { is: { specialityId: query.specialityId } };
    }

    if (fromBound && toBound) {
      where.startTime = { gte: fromBound, lte: toBound };
    }

    const matchedCount = await prisma.session.count({ where });
    if (matchedCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: {
          message: `Too many records in selected range (${matchedCount}). Please narrow filters or date range.`
        }
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        doctor: { select: { id: true, name: true, code: true, title: true } },
        room: { select: { number: true } }
      },
      orderBy: [{ doctorId: 'asc' }, { date: 'asc' }, { startTime: 'asc' }]
    });

    const userIds = new Set<string>();
    for (const s of sessions) {
      const arr = parseArrivalDepartureJson(s.doctorArrivalTime);
      const dep = parseArrivalDepartureJson(s.doctorDepatureTime);
      if (arr.length) userIds.add(arr[0].createdBy);
      if (dep.length) userIds.add(dep[dep.length - 1].createdBy);
    }

    const users =
      userIds.size > 0
        ? await prisma.user.findMany({
            where: { id: { in: [...userIds] } },
            select: { id: true, name: true, staff: { select: { code: true } } }
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const rows: DoctorArrivalsReportRow[] = [];

    for (const s of sessions) {
      const sessionDate = s.date instanceof Date ? s.date : new Date(s.date);
      const startNorm = normalizeSessionTime(s.startTime as Date | number, sessionDate);
      const endNorm = normalizeSessionTime(s.endTime as Date | number, sessionDate);

      const arrivals = parseArrivalDepartureJson(s.doctorArrivalTime);
      const departures = parseArrivalDepartureJson(s.doctorDepatureTime);

      const roomAllocatedBy = userLabel(userMap, arrivals[0]?.createdBy);
      const roomReleasedBy = userLabel(
        userMap,
        departures.length ? departures[departures.length - 1].createdBy : undefined
      );

      const lastArrival = arrivals.length ? arrivals[arrivals.length - 1] : null;
      const lastDeparture = departures.length ? departures[departures.length - 1] : null;

      const doctor = s.doctor;
      const doctorName = doctor
        ? [doctor.title, doctor.name].filter(Boolean).join(' ').trim() || doctor.name || '-'
        : '-';

      rows.push({
        id: s.id,
        doctor: {
          id: doctor?.id ?? '',
          code: doctor?.code ?? '-',
          name: doctorName
        },
        doctorCode: doctor?.code ?? '-',
        doctorName,
        roomAllocatedBy,
        sessionDate,
        sessionStartTime: startNorm,
        sessionEndTime: endNorm,
        sessionStatus: s.status,
        doctorArrivalDisplay: lastArrival ? formatUnixEntryTimeSl(lastArrival.time) : '-',
        doctorDepartureDisplay: lastDeparture ? formatUnixEntryTimeSl(lastDeparture.time) : '-',
        roomReleasedBy,
        roomNumber: s.room?.number ?? '-'
      });
    }

    return {
      success: true,
      data: rows,
      totalRecords: rows.length
    };
  } catch (error: unknown) {
    console.error('getDoctorArrivalsReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch doctor arrivals report' }
    };
  }
}
