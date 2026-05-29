"use server"

import prisma from '@/lib/prisma';
import {DoctorLeaveReportQuery} from '@/types/reports/doctor.leave'
import { Prisma } from '@prisma/client';
import { SRI_LANKA_TZ, SL_OFFSET } from '@/lib/utils';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';

const MAX_RANGE_DAYS = getReportMaxRangeDays('doctor_leave', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('doctor_leave', 20000);

/** Get minutes-from-midnight (0-1439) for a Date in a timezone */
function getMinutesInTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  })
    .formatToParts(date)
    .reduce(
      (acc, p) => {
        if (p.type === 'hour') acc.hour = parseInt(p.value, 10);
        if (p.type === 'minute') acc.minute = parseInt(p.value, 10);
        return acc;
      },
      { hour: 0, minute: 0 }
    );
  return parts.hour * 60 + parts.minute;
}

// ==== GET DOCTOR LEAVES FOR REPORT (extended filters) ==== //
export const getDoctorLeaveReportService = async ({
  fromDateTime,
  toDateTime,
  institutionId,
  locationId,
  departmentId,
  specialityId,
  doctorId
}: DoctorLeaveReportQuery): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const trimmedDoctorId = doctorId?.trim();
    const hasExplicitDoctor = Boolean(
      trimmedDoctorId && trimmedDoctorId !== '__all__'
    );

    // Date range is optional: when both are empty, no date filter is applied
    const hasDateFilter =
      Boolean(fromDateTime?.trim()) && Boolean(toDateTime?.trim());

    // Do not fetch data when no filters are applied
    const hasAnyFilter =
      hasDateFilter ||
      (institutionId && institutionId !== '__all__' && institutionId !== '') ||
      (locationId && locationId !== '__all__' && locationId !== '') ||
      (departmentId && departmentId !== '__all__' && departmentId !== '') ||
      (specialityId && specialityId !== '__all__' && specialityId !== '') ||
      hasExplicitDoctor;
    if (!hasAnyFilter) {
      return { success: true, data: [], totalRecords: 0 };
    }

    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    if (hasDateFilter) {
      fromDate = parseReportDateTimeSl(fromDateTime!, false, SL_OFFSET);
      toDate = parseReportDateTimeSl(toDateTime!, true, SL_OFFSET);

      if (!fromDate || !toDate || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: 'Invalid date format' }
        };
      }
      const daySpan = getInclusiveDaySpan(fromDate, toDate);
      if (daySpan > MAX_RANGE_DAYS) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` }
        };
      }
    }

    // Start with explicit doctor if selected; then apply all other filters
    let doctorIds: string[] | null = hasExplicitDoctor && trimmedDoctorId
      ? [trimmedDoctorId]
      : null;

    // Apply institution, location, department filters (via DoctorSession)
    const sessionWhere: Prisma.DoctorSessionWhereInput = { status: 1 };
    if (institutionId && institutionId !== '__all__' && institutionId !== '') {
      const instNum = parseInt(institutionId, 10);
      if (!isNaN(instNum)) sessionWhere.institution = instNum;
    }
    if (locationId && locationId !== '__all__' && locationId !== '') {
      sessionWhere.locationId = locationId;
    }
    if (departmentId && departmentId !== '__all__' && departmentId !== '') {
      sessionWhere.departmentId = departmentId;
    }
    const hasSessionFilters =
      sessionWhere.institution !== undefined ||
      sessionWhere.locationId !== undefined ||
      sessionWhere.departmentId !== undefined;

    if (hasSessionFilters) {
      const sessions = await prisma.doctorSession.findMany({
        where: sessionWhere,
        select: { doctorId: true },
        distinct: ['doctorId']
      });
      const sessionDoctorIds = sessions
        .map((s) => s.doctorId)
        .filter((id): id is string => id != null);
      doctorIds = doctorIds
        ? doctorIds.filter((id) => sessionDoctorIds.includes(id))
        : sessionDoctorIds;
    }

    // Apply speciality filter (via Doctor)
    const doctorWhere: Prisma.DoctorWhereInput = { status: 1 };
    if (specialityId && specialityId !== '__all__' && specialityId !== '') {
      doctorWhere.specialityId = specialityId;
    }
    const hasSpecialityFilter = doctorWhere.specialityId !== undefined;
    if (hasSpecialityFilter) {
      const doctors = await prisma.doctor.findMany({
        where: doctorWhere,
        select: { id: true }
      });
      const specialityDoctorIds = doctors.map((d) => d.id);
      doctorIds = doctorIds
        ? doctorIds.filter((id) => specialityDoctorIds.includes(id))
        : specialityDoctorIds;
    }

    const hasTimeInFilter =
      hasDateFilter &&
      /T\d{1,2}:\d{2}/.test(fromDateTime ?? '') &&
      /T\d{1,2}:\d{2}/.test(toDateTime ?? '');
    const prismaFrom =
      hasDateFilter && fromDate
        ? hasTimeInFilter
          ? new Date((fromDateTime ?? '').replace(/T.*/, '') + 'T00:00:00' + SL_OFFSET)
          : fromDate
        : undefined;
    const prismaTo =
      hasDateFilter && toDate
        ? hasTimeInFilter
          ? new Date((toDateTime ?? '').replace(/T.*/, '') + 'T23:59:59.999' + SL_OFFSET)
          : toDate
        : undefined;

    const leaveWhere: Prisma.DoctorLeaveWhereInput = {
      // Active leaves only (Leave Active in UI; DoctorLeave.status === 0 per schema)
      status: 0
    };
    if (prismaFrom != null && prismaTo != null) {
      leaveWhere.AND = [
        { toDate: { gte: prismaFrom } },
        { fromDate: { lte: prismaTo } }
      ];
    }
    if (doctorIds !== null && doctorIds.length > 0) {
      leaveWhere.doctorId = { in: doctorIds };
    }
    if (doctorIds !== null && doctorIds.length === 0) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const matchedLeaveCount = await prisma.doctorLeave.count({ where: leaveWhere });
    if (matchedLeaveCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Too many records in selected range (${matchedLeaveCount}). Please narrow filters/date range.` }
      };
    }

    const records = await prisma.doctorLeave.findMany({
      where: leaveWhere,
      orderBy: [{ doctor: { code: 'asc' } }, { fromDate: 'desc' }],
      include: {
        doctor: { select: { id: true, name: true, code: true } },
        createdUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
        updatedUser: { select: { id: true, name: true, staff: { select: { code: true } } } }
      }
    });

    // Time-window filter: when fromDateTime/toDateTime include time (T), only keep leaves
    // whose time (in Sri Lanka) overlaps the filter's time window (repeating daily).
    let filteredRecords = records;
    if (hasTimeInFilter && fromDate && toDate) {
      const filterFromMins = getMinutesInTimezone(fromDate, SRI_LANKA_TZ);
      const filterToMins = getMinutesInTimezone(toDate, SRI_LANKA_TZ);
      filteredRecords = records.filter((rec: { fromDate: Date; toDate: Date }) => {
        const leaveFromMins = getMinutesInTimezone(
          rec.fromDate instanceof Date ? rec.fromDate : new Date(rec.fromDate),
          SRI_LANKA_TZ
        );
        const leaveToMins = getMinutesInTimezone(
          rec.toDate instanceof Date ? rec.toDate : new Date(rec.toDate),
          SRI_LANKA_TZ
        );
        // Overlap: leave [a,b] overlaps filter [x,y] iff a <= y && b >= x
        return leaveFromMins <= filterToMins && leaveToMins >= filterFromMins;
      });
    }

    // Resolve session details, then explode into 1 row per leave-session
    const allSessionIds = new Set<string>();
    for (const rec of filteredRecords) {
      const raw = rec.sessions;
      if (Array.isArray(raw)) {
        for (const item of raw) {
          const id = typeof item === 'string' ? item : (item as { id?: string })?.id;
          if (id) allSessionIds.add(id);
        }
      }
    }

    const sessionMap = new Map<string, { date: Date; startTime: Date; endTime: Date }>();
    if (allSessionIds.size > 0) {
      const sessions = await prisma.session.findMany({
        where: { id: { in: Array.from(allSessionIds) } },
        select: { id: true, date: true, startTime: true, endTime: true }
      });
      for (const s of sessions) {
        sessionMap.set(s.id, {
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime
        });
      }
    }

    const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const formatTime = (d: Date): string => {
      const date = d instanceof Date ? d : new Date(d);
      const h = date.getHours();
      const m = date.getMinutes();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      return `${String(hour12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };
    const flattenedRows: any[] = [];
    for (const rec of filteredRecords as any[]) {
      const raw = rec.sessions;
      const ids: string[] = Array.isArray(raw)
        ? raw
            .map((item: unknown) =>
              typeof item === 'string' ? item : (item as { id?: string })?.id
            )
            .filter((x): x is string => Boolean(x))
        : [];

      for (const sessionId of ids) {
        const s = sessionMap.get(sessionId);
        if (!s) continue;
        const date = s.date instanceof Date ? s.date : new Date(s.date);
        const day = DAY_ABBR[date.getDay()] ?? '';
        const range = `${formatTime(s.startTime)}-${formatTime(s.endTime)}`;
        flattenedRows.push({
          ...rec,
          id: `${rec.id}_${sessionId}`,
          leaveId: rec.id,
          sessionId,
          leaveDate: date,
          sessionStartTime: s.startTime,
          sessionEndTime: s.endTime,
          leaveSessionFormatted: `${day} (${range})`
        });
      }
    }

    // Sort by doctor code then leaveDate desc for grouping display
    flattenedRows.sort((a: any, b: any) => {
      const codeA = a.doctor?.code ?? '';
      const codeB = b.doctor?.code ?? '';
      if (codeA !== codeB) return codeA.localeCompare(codeB);
      const dateA = a.leaveDate instanceof Date ? a.leaveDate.getTime() : new Date(a.leaveDate).getTime();
      const dateB = b.leaveDate instanceof Date ? b.leaveDate.getTime() : new Date(b.leaveDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (a.sessionId ?? '').localeCompare(b.sessionId ?? '');
    });

    return {
      success: true,
      data: flattenedRows,
      totalRecords: flattenedRows.length
    };
  } catch (error: any) {
    console.error('getDoctorLeaveReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch doctor leave report' }
    };
  }
};