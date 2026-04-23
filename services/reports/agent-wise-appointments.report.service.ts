'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { SL_OFFSET, normalizeSessionTime } from '@/lib/utils';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type {
  AgentWiseAppointmentsDetailRow,
  AgentWiseAppointmentsMonthColumn,
  AgentWiseAppointmentsReportQuery,
  AgentWiseAppointmentsReportResult,
  AgentWiseAppointmentsSummaryRow,
} from '@/types/reports/agent-wise-appointments';

const MAX_RANGE_DAYS = getReportMaxRangeDays('agent_wise_appointments', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('agent_wise_appointments', 30000);

const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Paid',
  2: 'Cancel',
  3: 'Refund',
};

function parseDateRange(from?: string, to?: string): { from: Date; to: Date } | null {
  if (!from?.trim() || !to?.trim()) return null;

  const parseFrom = (val: string): Date => {
    const t = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(`${t}T00:00:00${SL_OFFSET}`);
    if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(t)) return new Date(t);
    return new Date(t);
  };
  const parseTo = (val: string): Date => {
    const t = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(`${t}T23:59:59.999${SL_OFFSET}`);
    if (/^\d{4}-\d{2}-\d{2}T\d{1,2}:\d{2}/.test(t)) {
      const [dp, tp] = t.split('T');
      const [h = 23, min = 59] = (tp || '').split(':').map(Number);
      return new Date(`${dp}T${h}:${min}:59.999${SL_OFFSET}`);
    }
    return new Date(t);
  };

  const fromDate = parseFrom(from);
  const toDate = parseTo(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  return { from: fromDate, to: toDate };
}

function colomboYearMonth(d: Date): { y: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(d);
  const y = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  return { y, m };
}

function enumerateMonthsBetween(from: Date, to: Date): AgentWiseAppointmentsMonthColumn[] {
  const start = colomboYearMonth(from);
  let y = start.y;
  let m = start.m;
  const end = colomboYearMonth(to);
  const keys: string[] = [];
  while (y < end.y || (y === end.y && m <= end.m)) {
    keys.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  const sameYear = keys.length > 0 && keys.every((k) => k.startsWith(keys[0].slice(0, 4)));
  return keys.map((key) => {
    const d = new Date(`${key}-15T12:00:00+05:30`);
    const monthLong = d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo', month: 'long' });
    const yr = key.slice(0, 4);
    return {
      key,
      label: sameYear ? monthLong : `${monthLong} ${yr}`,
    };
  });
}

function formatOrdinalDateColombo(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(d);
  const dayNum = Number(parts.find((p) => p.type === 'day')?.value ?? 0);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const suf =
    dayNum % 10 === 1 && dayNum !== 11
      ? 'st'
      : dayNum % 10 === 2 && dayNum !== 12
        ? 'nd'
        : dayNum % 10 === 3 && dayNum !== 13
          ? 'rd'
          : 'th';
  return `${dayNum}${suf} ${month} ${year}`;
}

function formatTimeAmPm(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === 'hour')?.value ?? '';
  const min = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const ap = parts.find((p) => p.type === 'dayPeriod')?.value ?? '';
  return `${h}.${min} ${ap.toUpperCase()}`;
}

function formatCreatorBlock(
  user: { name?: string | null; staff?: { code?: string | null } | null } | null | undefined,
  at: Date | null | undefined
): string {
  const n = user?.name?.trim();
  if (!n) return '—';
  const code = user?.staff?.code?.trim();
  const line1 = code ? `${n} (${code})` : n;
  if (!at || isNaN(at.getTime())) return line1;
  const line2 = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(at);
  return `${line1}\n${line2}`;
}

function agentDisplayName(name: string, code: string | null | undefined): string {
  const c = code?.trim();
  return c ? `${name} (${c})` : name;
}

function consultantDisplayName(name: string, code: string | null | undefined): string {
  const c = code?.trim();
  return c ? `${name} (${c})` : name;
}

export async function getAgentWiseAppointmentsReportService(
  query: AgentWiseAppointmentsReportQuery
): Promise<AgentWiseAppointmentsReportResult> {
  const { fromDateTime, toDateTime, institutionId, locationId, departmentId, agencyId, reportType } =
    query;

  const dateRange = parseDateRange(fromDateTime, toDateTime);
  if (!dateRange) {
    return {
      success: false,
      message: 'Invalid date range',
      monthColumns: [],
      summaryRows: [],
      detailRows: [],
      summaryMonthTotals: {},
      summaryGrandTotal: 0,
      detailTotals: { hospitalFee: 0, doctorFee: 0, discount: 0, totalFee: 0 },
    };
  }

  const daySpan = getInclusiveDaySpan(dateRange.from, dateRange.to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
      monthColumns: [],
      summaryRows: [],
      detailRows: [],
      summaryMonthTotals: {},
      summaryGrandTotal: 0,
      detailTotals: { hospitalFee: 0, doctorFee: 0, discount: 0, totalFee: 0 },
    };
  }

  const sessionWhere: Prisma.SessionWhereInput = {
    date: {
      gte: new Date(dateRange.from.getTime() - 24 * 60 * 60 * 1000),
      lte: new Date(dateRange.to.getTime() + 24 * 60 * 60 * 1000),
    },
  };
  if (institutionId && institutionId !== '__all__') {
    const instNum = parseInt(institutionId, 10);
    if (!isNaN(instNum)) sessionWhere.institution = instNum;
  }
  if (departmentId && departmentId !== '__all__') {
    sessionWhere.departmentId = departmentId;
  }

  const bookingWhere: Prisma.BookingWhereInput = {
    method: 2,
    agencyId: { not: null },
    sessionId: { not: null },
    session: { is: sessionWhere },
  };

  if (locationId && locationId !== '__all__') {
    bookingWhere.locationId = locationId;
  }
  if (agencyId && agencyId !== '__all__') {
    bookingWhere.agencyId = agencyId;
  }

  const matchedBookingCount = await prisma.booking.count({ where: bookingWhere });
  if (matchedBookingCount > MAX_RECORDS_SCAN) {
    return {
      success: false,
      message: `Too many records in selected range (${matchedBookingCount}). Please narrow filters or date range.`,
      monthColumns: [],
      summaryRows: [],
      detailRows: [],
      summaryMonthTotals: {},
      summaryGrandTotal: 0,
      detailTotals: { hospitalFee: 0, doctorFee: 0, discount: 0, totalFee: 0 },
    };
  }

  const bookings = await prisma.booking.findMany({
    where: bookingWhere,
    include: {
      doctor: { select: { id: true, name: true, code: true } },
      session: {
        select: {
          id: true,
          date: true,
          startTime: true,
          endTime: true,
          institution: true,
          departmentId: true,
        },
      },
      agency: { select: { id: true, name: true, code: true } },
      createdUser: {
        select: { id: true, name: true, staff: { select: { code: true } } },
      },
    },
  });

  type B = (typeof bookings)[number];
  const inRange: B[] = [];

  for (const b of bookings) {
    const session = b.session;
    if (!session?.date) continue;
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
    const apptStart = normalizeSessionTime(session.startTime as Date | number, sessionDate);
    if (apptStart.getTime() < dateRange.from.getTime() || apptStart.getTime() > dateRange.to.getTime()) {
      continue;
    }
    if (institutionId && institutionId !== '__all__') {
      const instNum = parseInt(institutionId, 10);
      if (!isNaN(instNum) && session.institution !== instNum) continue;
    }
    if (departmentId && departmentId !== '__all__' && session.departmentId !== departmentId) {
      continue;
    }
    inRange.push(b);
  }

  const monthColumns = enumerateMonthsBetween(dateRange.from, dateRange.to);
  const monthKeys = new Set(monthColumns.map((c) => c.key));

  const byAgency = new Map<
    string,
    { name: string; code: string; monthCounts: Record<string, number>; total: number }
  >();

  const detailRows: AgentWiseAppointmentsDetailRow[] = [];
  let sumH = 0;
  let sumD = 0;
  let sumDisc = 0;
  let sumTot = 0;
  const wantDetail = reportType === 'detail';
  const wantSummary = reportType === 'summary';

  for (const b of inRange) {
    const session = b.session!;
    const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
    const apptStart = normalizeSessionTime(session.startTime as Date | number, sessionDate);
    const ymKey = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
    }).format(apptStart);

    const agency = b.agency;
    if (!agency?.id) continue;

    if (wantSummary) {
      if (!byAgency.has(agency.id)) {
        byAgency.set(agency.id, {
          name: agency.name,
          code: agency.code?.trim() ?? '',
          monthCounts: Object.fromEntries([...monthKeys].map((k) => [k, 0])) as Record<string, number>,
          total: 0,
        });
      }
      const agg = byAgency.get(agency.id)!;
      if (monthKeys.has(ymKey)) {
        agg.monthCounts[ymKey] = (agg.monthCounts[ymKey] ?? 0) + 1;
      }
      agg.total += 1;
    }

    if (wantDetail) {
      const doctor = b.doctor;
      const patientName = [b.title, b.name].filter(Boolean).join(' ').trim() || '—';
      const billNumber = (b.receiptNoString ?? b.bookingid_string ?? '').trim() || '—';
      const creatorLabel = formatCreatorBlock(b.createdUser, b.createdAt);

      detailRows.push({
        id: b.id,
        agentNameWithCode: agentDisplayName(agency.name, agency.code),
        agentRef: (b.agencyRef ?? '').trim() || '—',
        consultantNameWithCode: doctor
          ? consultantDisplayName(doctor.name, doctor.code)
          : '—',
        appointmentDateLabel: formatOrdinalDateColombo(apptStart),
        appointmentTimeLabel: formatTimeAmPm(apptStart),
        appointmentNo: b.appointmentNo,
        billNumber,
        statusLabel: STATUS_LABELS[b.status] ?? String(b.status),
        patientName,
        patientPhone: (b.phone ?? '').trim() || '—',
        creatorLabel,
        hospitalFee: b.hospitalFee ?? 0,
        doctorFee: b.professionalFee ?? 0,
        discount: b.discount ?? 0,
        totalFee: b.amount ?? 0,
        appointmentAtMs: apptStart.getTime(),
      });

      sumH += b.hospitalFee ?? 0;
      sumD += b.professionalFee ?? 0;
      sumDisc += b.discount ?? 0;
      sumTot += b.amount ?? 0;
    }
  }

  if (wantDetail) {
    detailRows.sort((a, b) => {
      if (a.appointmentAtMs !== b.appointmentAtMs) return a.appointmentAtMs - b.appointmentAtMs;
      return a.agentNameWithCode.localeCompare(b.agentNameWithCode);
    });
  }

  const summaryRows: AgentWiseAppointmentsSummaryRow[] = [...byAgency.entries()]
    .map(([agencyId, v]) => ({
      agencyId,
      agentNameWithCode: agentDisplayName(v.name, v.code || undefined),
      agentCode: v.code,
      monthCounts: v.monthCounts,
      grandTotal: v.total,
    }))
    .sort((a, b) => a.agentNameWithCode.localeCompare(b.agentNameWithCode));

  const summaryMonthTotals: Record<string, number> = Object.fromEntries(
    monthColumns.map((c) => [c.key, 0])
  ) as Record<string, number>;
  let summaryGrandTotal = 0;
  for (const r of summaryRows) {
    summaryGrandTotal += r.grandTotal;
    for (const c of monthColumns) {
      summaryMonthTotals[c.key] = (summaryMonthTotals[c.key] ?? 0) + (r.monthCounts[c.key] ?? 0);
    }
  }

  return {
    success: true,
    monthColumns,
    summaryRows,
    detailRows,
    summaryMonthTotals,
    summaryGrandTotal,
    detailTotals: {
      hospitalFee: sumH,
      doctorFee: sumD,
      discount: sumDisc,
      totalFee: sumTot,
    },
  };
}
