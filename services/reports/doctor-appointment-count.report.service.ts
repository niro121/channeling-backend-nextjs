'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import type {
  DoctorAppointmentCountReportQuery,
  DoctorAppointmentCountReportRow,
  DoctorAppointmentCountReportTotals,
} from '@/types/reports/doctor-appointment-count';

const MAX_RANGE_DAYS = getReportMaxRangeDays('doctor_appointment_count', 62);
const MAX_BOOKINGS_SCAN = getReportMaxRecords('doctor_appointment_count', 20000);

function parseDateTime(input?: string, asEnd = false): Date | null {
  const v = input?.trim();
  if (!v) return null;
  if (v.includes('T')) {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = v.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return asEnd ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function isMorning(dt: Date): boolean {
  const h = dt.getHours();
  return h >= 0 && h < 12;
}

export async function getDoctorAppointmentCountReportService(
  query: DoctorAppointmentCountReportQuery
): Promise<{
  success: boolean;
  data?: DoctorAppointmentCountReportRow[];
  totals?: DoctorAppointmentCountReportTotals;
  totalRecords?: number;
  message?: string;
}> {
  try {
    const from = parseDateTime(query.fromDateTime, false);
    const to = parseDateTime(query.toDateTime, true);
    if (!from || !to) {
      return { success: false, message: 'From and To date/time are required.' };
    }
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

    const bookingWhere = {
      session: {
        is: {
          date: { gte: from, lte: to },
          ...(query.locationId && query.locationId !== '__all__' ? { locationId: query.locationId } : {}),
        },
      },
      ...(query.doctorId && query.doctorId !== '__all__' ? { doctorId: query.doctorId } : {}),
      ...(query.bookingType === 'scan' ? { isScan: true } : {}),
      ...(query.specialityId && query.specialityId !== '__all__'
        ? {
            doctor: {
              is: {
                specialityId: query.specialityId,
              },
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
        status: true,
        refund: true,
        canceledAt: true,
        hospitalFee: true,
        hospitalFeeDiscount: true,
        professionalFee: true,
        professionsalFeeDiscount: true,
        refundAmountHospitalFee: true,
        refundAmountProfessionalFee: true,
        doctor: {
          select: {
            id: true,
            title: true,
            name: true,
            code: true,
            speciality: { select: { name: true } },
          },
        },
        session: {
          select: {
            startTime: true,
          },
        },
        receipts: {
          select: {
            method: true,
          },
        },
      },
      orderBy: [{ doctor: { name: 'asc' } }],
    });

    const grouped = new Map<string, DoctorAppointmentCountReportRow>();

    for (const b of bookings) {
      if (!b.doctor) continue;
      if (query.sessionType && query.sessionType !== '__all__') {
        const start = b.session?.startTime;
        if (!start) continue;
        const morning = isMorning(start);
        if (query.sessionType === 'morning' && !morning) continue;
        if (query.sessionType === 'evening' && morning) continue;
      }

      const speciality = b.doctor.speciality?.name || '-';
      const consultant = `${b.doctor.title ?? ''} ${b.doctor.name ?? ''} (${b.doctor.code ?? '-'})`.trim();
      const key = query.groupBy === 'speciality' ? `${speciality}::${b.doctor.id}` : b.doctor.id;

      if (!grouped.has(key)) {
        grouped.set(key, {
          rowId: key,
          consultant,
          speciality,
          notPaid: 0,
          paid: 0,
          cancel: 0,
          hosRefund: 0,
          proRefund: 0,
          hosValid: 0,
          proValid: 0,
          nettValid: 0,
          hos: 0,
          pro: 0,
          total: 0,
        });
      }
      const row = grouped.get(key)!;

      const paymentCount = b.receipts.filter((r) => r.method === 1).length;
      const refundCount = b.receipts.filter((r) => r.method === 0).length;
      const refundType = Number(b.refund ?? 0); // 0 none, 1 pro, 2 hos, 3 full

      if (paymentCount === 0 && refundCount === 0) {
        row.notPaid += 1;
      }

      row.paid += paymentCount;

      if (b.status === 2 || b.canceledAt) {
        row.cancel += refundCount;
      }
      if (refundType === 2 || refundType === 3) {
        row.hosRefund += refundCount;
      }
      if (refundType === 1 || refundType === 3) {
        row.proRefund += refundCount;
      }

      row.hosValid = Math.max(0, row.paid - row.hosRefund);
      row.proValid = Math.max(0, row.paid - row.proRefund);
      row.nettValid = Math.max(0, row.paid - Math.max(row.cancel, row.hosRefund, row.proRefund));

      const hosNet = Math.max(0, (b.hospitalFee ?? 0) - (b.hospitalFeeDiscount ?? 0) - (b.refundAmountHospitalFee ?? 0));
      const proNet = Math.max(
        0,
        (b.professionalFee ?? 0) - (b.professionsalFeeDiscount ?? 0) - (b.refundAmountProfessionalFee ?? 0)
      );
      row.hos += hosNet;
      row.pro += proNet;
      row.total += hosNet + proNet;
    }

    const data = Array.from(grouped.values()).sort((a, b) => {
      if (a.speciality !== b.speciality) return a.speciality.localeCompare(b.speciality);
      return a.consultant.localeCompare(b.consultant);
    });

    const totals: DoctorAppointmentCountReportTotals = {
      notPaid: data.reduce((s, r) => s + r.notPaid, 0),
      paid: data.reduce((s, r) => s + r.paid, 0),
      cancel: data.reduce((s, r) => s + r.cancel, 0),
      hosRefund: data.reduce((s, r) => s + r.hosRefund, 0),
      proRefund: data.reduce((s, r) => s + r.proRefund, 0),
      hosValid: data.reduce((s, r) => s + r.hosValid, 0),
      proValid: data.reduce((s, r) => s + r.proValid, 0),
      nettValid: data.reduce((s, r) => s + r.nettValid, 0),
      hos: data.reduce((s, r) => s + r.hos, 0),
      pro: data.reduce((s, r) => s + r.pro, 0),
      total: data.reduce((s, r) => s + r.total, 0),
    };

    return {
      success: true,
      data,
      totals,
      totalRecords: data.length,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor appointment count report';
    console.error('getDoctorAppointmentCountReportService error:', error);
    return { success: false, message: msg };
  }
}
