'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type {
  NoShowPatientReportQuery,
  NoShowPatientReportResult,
  NoShowPatientReportRow,
  NoShowPatientReportType,
} from '@/types/reports/no-show-patient';

const MAX_RANGE_DAYS = getReportMaxRangeDays('no_show_patient', 62);
const MAX_BOOKINGS_SCAN = getReportMaxRecords('no_show_patient', 50000);

/**
 * Parse a date or datetime string into a single moment (aligned with cashier summary report).
 * - If string contains 'T' (e.g. YYYY-MM-DDTHH:mm): parse as full datetime (local).
 * - Otherwise (YYYY-MM-DD): date only; if asEnd use end of day, else start of day.
 */
function parseDateTime(value: string, asEnd: boolean): Date | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = trimmed.split('-').map(Number);
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (asEnd) return new Date(year, month, day, 23, 59, 59, 999);
  return new Date(year, month, day, 0, 0, 0, 0);
}

function parseFromTo(dateFrom?: string, dateTo?: string): { from: Date; to: Date } | null {
  const start = parseDateTime(dateFrom ?? '', false);
  const end = parseDateTime(dateTo ?? '', true);
  if (!start || !end) return null;
  return { from: start, to: end };
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toMonthKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildPeriodKeys(from: Date, to: Date, reportType: NoShowPatientReportType): string[] {
  const keys: string[] = [];
  if (reportType === 'by_month') {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cursor.getTime() <= end.getTime()) {
      keys.push(toMonthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return keys;
  }

  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  while (cursor.getTime() <= end.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function formatPeriodLabel(key: string, reportType: NoShowPatientReportType): string {
  if (reportType === 'by_month') {
    const m = key.match(/^(\d{4})-(\d{2})$/);
    if (!m) return key;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return `${dt.getFullYear()} ${dt.toLocaleString('en-US', { month: 'short' })}`;
  }
  return key;
}

export async function getNoShowPatientReportService(
  query: NoShowPatientReportQuery
): Promise<NoShowPatientReportResult> {
  try {
    const range = parseFromTo(query.fromDate, query.toDate);
    if (!range) {
      return { success: false, message: 'From and To dates are required.' };
    }
    const { from, to } = range;
    if (from.getTime() > to.getTime()) {
      return { success: false, message: 'From date/time must be before or equal to To date/time.' };
    }

    const daySpan = getInclusiveDaySpan(from, to);
    if (daySpan > MAX_RANGE_DAYS) {
      return {
        success: false,
        message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
      };
    }

    const reportType: NoShowPatientReportType = query.reportType === 'by_month' ? 'by_month' : 'by_date';
    const periodKeys = buildPeriodKeys(from, to, reportType);
    const periodLabels = Object.fromEntries(periodKeys.map((key) => [key, formatPeriodLabel(key, reportType)]));
    const institutionNumber =
      query.institutionId && query.institutionId !== '__all__' ? Number(query.institutionId) : null;

    const bookingWhere = {
      channelRoomAttendance: 2,
      session: {
        is: {
          date: { gte: from, lte: to },
          ...(institutionNumber != null && Number.isFinite(institutionNumber)
            ? { institution: institutionNumber }
            : {}),
          ...(query.locationId && query.locationId !== '__all__' ? { locationId: query.locationId } : {}),
          ...(query.departmentId && query.departmentId !== '__all__'
            ? { departmentId: query.departmentId }
            : {}),
        },
      },
      ...(query.doctorId && query.doctorId !== '__all__' ? { doctorId: query.doctorId } : {}),
      ...(query.specialityId && query.specialityId !== '__all__'
        ? {
            doctor: {
              is: { specialityId: query.specialityId },
            },
          }
        : {}),
    } as const;

    const matchedBookingCount = await prisma.booking.count({ where: bookingWhere });
    if (matchedBookingCount > MAX_BOOKINGS_SCAN) {
      return {
        success: false,
        message: `Too many records in selected range (${matchedBookingCount}). Please narrow filters/date range.`,
      };
    }

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        id: true,
        doctor: {
          select: {
            id: true,
            title: true,
            name: true,
            code: true,
            speciality: { select: { name: true } },
          },
        },
        session: { select: { date: true } },
      },
    });

    const byDoctor = new Map<string, NoShowPatientReportRow>();
    for (const b of bookings) {
      if (!b.doctor || !b.session?.date) continue;
      const doctorId = b.doctor.id;
      const doctorName = `${b.doctor.title ?? ''} ${b.doctor.name ?? ''} (${b.doctor.code ?? '-'})`.trim();
      const speciality = b.doctor.speciality?.name || '-';
      if (!byDoctor.has(doctorId)) {
        byDoctor.set(doctorId, {
          rowId: doctorId,
          speciality,
          doctorName,
          periodCounts: {},
          total: 0,
        });
      }
      const row = byDoctor.get(doctorId)!;
      const periodKey = reportType === 'by_month' ? toMonthKey(b.session.date) : toDateKey(b.session.date);
      if (!(periodKey in row.periodCounts)) row.periodCounts[periodKey] = 0;
      row.periodCounts[periodKey] += 1;
      row.total += 1;
    }

    const data = Array.from(byDoctor.values()).sort((a, b) => {
      if (a.speciality !== b.speciality) return a.speciality.localeCompare(b.speciality);
      return a.doctorName.localeCompare(b.doctorName);
    });

    const columnTotals: Record<string, number> = Object.fromEntries(periodKeys.map((k) => [k, 0]));
    for (const row of data) {
      for (const key of periodKeys) {
        columnTotals[key] += row.periodCounts[key] ?? 0;
      }
    }
    const grandTotal = data.reduce((sum, r) => sum + r.total, 0);

    return {
      success: true,
      data,
      periodKeys,
      periodLabels,
      columnTotals,
      grandTotal,
      totalRecords: data.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch no show patient report';
    console.error('getNoShowPatientReportService error:', error);
    return { success: false, message: msg };
  }
}
