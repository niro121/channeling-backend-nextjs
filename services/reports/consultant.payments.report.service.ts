"use server"

import prisma from '@/lib/prisma';
import { ConsultantPaymentsReportQuery } from '@/types/report';
import { Prisma } from '@prisma/client';
import moment from 'moment';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';

type ExtractWhereInput<T> = T extends { where?: infer W } ? W : never;
type PrismaBookingWhereInput = ExtractWhereInput<NonNullable<Parameters<typeof prisma.booking.findMany>[0]>>;
const MAX_RANGE_DAYS = getReportMaxRangeDays('consultant_payments', 62);
const MAX_RECORDS_SCAN = getReportMaxRecords('consultant_payments', 30000);

function parseDateToUnixRange(fromDateTime?: string, toDateTime?: string): { from: number; to: number } | null {
  if (!fromDateTime || !toDateTime) return null;
  
  const from = new Date(fromDateTime);
  const to = new Date(toDateTime);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return null;

  // Respect the actual date+time range provided by the UI.
  // `YYYY-MM-DDTHH:mm` strings are interpreted as local time by JS Date,
  // which matches what the user selected in the UI.
  const fromUnix = Math.floor(from.getTime() / 1000);
  const toUnix = Math.floor(to.getTime() / 1000);

  return { from: fromUnix, to: toUnix };
}

function getProfessionalDiscount(b: { discountDivision?: unknown | null; professionsalFeeDiscount?: number | null }): number {
  const dd = (b.discountDivision ?? undefined) as Record<string, unknown> | undefined;

  if (dd && typeof dd === 'object') {
    const candidates = [
      dd['professionalFeeDiscount'],
      dd['professionsalFeeDiscount'],
      dd['professional_fee_discount'],
      dd['professionsal_fee_discount']
    ];
    for (const c of candidates) {
      if (typeof c === 'number' && Number.isFinite(c)) {
        return c;
      }
    }
  }

  const fallback = b.professionsalFeeDiscount ?? 0;
  return typeof fallback === 'number' && Number.isFinite(fallback) ? fallback : 0;
}

function formatSessionLabel(sessionStartTime: number | null | undefined, sessionEndTime: number | null | undefined): string {
  if (sessionStartTime == null || sessionEndTime == null) return '-';
  
  const startDate = moment.unix(sessionStartTime);
  const endDate = moment.unix(sessionEndTime);
  
  return `${startDate.format('MMM/DD/YY')} - ${startDate.format('ddd')} (${startDate.format('h:mm A')} - ${endDate.format('h:mm A')})`;
}

function formatPatientName(title: string | null | undefined, name: string | null | undefined): string {
  const parts = [title, name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '-';
}

function parseHandedByFromRemarks(remarks: string | null | undefined): string | null {
  if (!remarks) return null;
  const marker = 'Handed:';
  const idx = remarks.indexOf(marker);
  if (idx === -1) return null;
  const after = remarks.slice(idx + marker.length).trim();
  if (!after) return null;

  // Some source data repeats staff codes or ids consecutively, e.g.
  // "CASHIER 1 (RHCASHIER1) (RHCASHIER1)".
  // Collapse any immediate duplicate tokens so they only appear once.
  const parts = after.split(/\s+/);
  const deduped: string[] = [];
  for (const part of parts) {
    if (deduped.length === 0 || deduped[deduped.length - 1] !== part) {
      deduped.push(part);
    }
  }
  const result = deduped.join(' ').trim();
  return result || null;
}

// ==== GET CONSULTANT PAYMENTS REPORT ==== //
export const getConsultantPaymentsReportService = async ({
  fromDateTime,
  toDateTime,
  institutionId,
  locationId,
  departmentId,
  specialityId,
  doctorId,
  status,
  sessionType
}: ConsultantPaymentsReportQuery): Promise<{
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
    const hasDateRange = Boolean(fromDateTime && toDateTime);

    if (!hasDateRange) {
      return {
        success: true,
        data: [],
        totalRecords: 0,
        message: 'Please select a date & time range to view consultant payments'
      };
    }

    const unixRange = parseDateToUnixRange(fromDateTime, toDateTime);
    if (!unixRange) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: 'Invalid date format' }
      };
    }
    {
      const from = new Date(fromDateTime!);
      const to = new Date(toDateTime!);
      const daySpan = getInclusiveDaySpan(from, to);
      if (daySpan > MAX_RANGE_DAYS) {
        return {
          success: false,
          data: [],
          totalRecords: 0,
          error: { message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` }
        };
      }
    }

    let doctorIds: string[] | null = null;

    if (hasExplicitDoctor && trimmedDoctorId) {
      doctorIds = [trimmedDoctorId];
    } else {
      // Build doctor IDs from filters via DoctorSession and Doctor
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

      const doctorWhere: Prisma.DoctorWhereInput = { status: 1 };
      if (specialityId && specialityId !== '__all__' && specialityId !== '') {
        doctorWhere.specialityId = specialityId;
      }
      const hasDoctorFilter = doctorWhere.specialityId !== undefined;

      if (hasSessionFilters || hasDoctorFilter) {
        if (hasSessionFilters) {
          const sessions = await prisma.doctorSession.findMany({
            where: sessionWhere,
            select: { doctorId: true },
            distinct: ['doctorId']
          });
          doctorIds = sessions
            .map((s) => s.doctorId)
            .filter((id): id is string => id != null);
        }
        if (hasDoctorFilter) {
          const doctors = await prisma.doctor.findMany({
            where: doctorWhere,
            select: { id: true }
          });
          const specialityDoctorIds = doctors.map((d) => d.id);
          if (doctorIds) {
            doctorIds = doctorIds.filter((id) => specialityDoctorIds.includes(id));
          } else {
            doctorIds = specialityDoctorIds;
          }
        }
      }
    }

    const bookingWhere: PrismaBookingWhereInput = {
      status: 1,
      refund: 0,
      sessionStartTime: {
        gte: unixRange.from,
        lte: unixRange.to
      }
    };

    // Filter by institution at the Session level so RH / RHD etc. return correct subsets
    if (institutionId && institutionId !== '__all__' && institutionId !== '') {
      const instNum = parseInt(institutionId, 10);
      if (!isNaN(instNum)) {
        bookingWhere.session = {
          ...(bookingWhere.session as Prisma.SessionWhereInput | undefined),
          institution: instNum
        };
      }
    }

    if (doctorIds !== null && doctorIds.length > 0) {
      bookingWhere.doctorId = { in: doctorIds };
    } else if (doctorIds !== null && doctorIds.length === 0) {
      return { success: true, data: [], totalRecords: 0 };
    }

    if (locationId && locationId !== '__all__' && locationId !== '') {
      bookingWhere.locationId = locationId;
    }

    if (status && status !== '__all__') {
      if (status === '1') {
        bookingWhere.doctorPayment = true;
      } else if (status === '0') {
        bookingWhere.doctorPayment = false;
      }
    }

    const matchedBookingCount = await prisma.booking.count({ where: bookingWhere });
    if (matchedBookingCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        error: { message: `Too many records in selected range (${matchedBookingCount}). Please narrow filters/date range.` }
      };
    }

    let bookings = await prisma.booking.findMany({
      where: bookingWhere,
      include: {
        doctor: { select: { id: true, title: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
        session: { select: { id: true, date: true, startTime: true, endTime: true } }
      },
      orderBy: [
        { location: { name: 'asc' } },
        { doctor: { name: 'asc' } },
        { sessionStartTime: 'asc' }
      ]
    });

    if (!bookings.length) {
      return {
        success: true,
        data: [],
        totalRecords: 0
      };
    }

    // Apply sessionType (morning / evening) based on the *start time hour* in local time
    if (sessionType === 'morning') {
      // 00:00–11:59 AM
      bookings = bookings.filter((b) => {
        const h = moment.unix(b.sessionStartTime ?? 0).hour();
        return h < 12;
      });
    } else if (sessionType === 'evening') {
      // 12:00–11:59 PM
      bookings = bookings.filter((b) => {
        const h = moment.unix(b.sessionStartTime ?? 0).hour();
        return h >= 12;
      });
    }

    if (!bookings.length) {
      return {
        success: true,
        data: [],
        totalRecords: 0
      };
    }

    // Load doctor-payment receipts in bulk
    const doctorPaymentReceiptIds = Array.from(
      new Set(
        bookings
          .map((b) => b.doctorPaymentReceiptId)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );

    let receiptsById = new Map<
      string,
      { id: string; receiptNoString: string; createdAt: Date; createdBy: string | null; remarks: string | null }
    >();
    let usersById = new Map<string, string>();

    if (doctorPaymentReceiptIds.length > 0) {
      const receipts = await prisma.receipt.findMany({
        where: { id: { in: doctorPaymentReceiptIds } },
        select: { id: true, receiptNoString: true, createdAt: true, createdBy: true, remarks: true }
      });

      receiptsById = new Map(
        receipts.map((r) => [
          r.id,
          {
            id: r.id,
            receiptNoString: r.receiptNoString,
            createdAt: r.createdAt,
            createdBy: r.createdBy ?? null,
            remarks: r.remarks ?? null
          }
        ])
      );

      const userIds = Array.from(
        new Set(
          receipts
            .map((r) => r.createdBy)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      );

      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true }
        });
        usersById = new Map(users.map((u) => [u.id, u.name]));
      }
    }

    const rows = bookings.map((b, index) => {
      const professionalFee = b.professionalFee ?? 0;
      const discount = getProfessionalDiscount({
        discountDivision: b.discountDivision,
        professionsalFeeDiscount: b.professionsalFeeDiscount
      });
      const netAmount = professionalFee - discount;

      const receiptInfo = b.doctorPaymentReceiptId ? receiptsById.get(b.doctorPaymentReceiptId) : undefined;
      const paidByUserName =
        receiptInfo?.createdBy && usersById.has(receiptInfo.createdBy)
          ? usersById.get(receiptInfo.createdBy) ?? null
          : null;
      const handedByName = receiptInfo ? parseHandedByFromRemarks(receiptInfo.remarks) : null;

      return {
        id: b.id,
        sNo: index + 1,
        branch: b.location?.name ?? '-',
        consultant: b.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : '-',
        consultantCode: b.doctor?.code ?? '',
        paymentReceipt: b.doctorPaymentReceiptString ?? receiptInfo?.receiptNoString ?? '',
        channelReceipt: b.receiptNoString ?? b.bookingid_string ?? '',
        consultationSession: formatSessionLabel(b.sessionStartTime ?? null, b.sessionEndTime ?? null),
        patientName: formatPatientName(b.title, b.name),
        modeOfPay: b.receiptPaymentMethod != null ? (PAYMENT_METHOD_NAMES[b.receiptPaymentMethod] ?? String(b.receiptPaymentMethod)) : '-',
        consultationCharge: professionalFee,
        discountAmount: discount,
        netAmount,
        paymentStatus: b.doctorPayment ? 'Paid' : 'Due Pay',
        paidBy: paidByUserName ?? '',
        paidDate: receiptInfo?.createdAt ?? b.doctorPaymentAt ?? null,
        handedBy: handedByName ?? '',
        // Store for totals calculation
        _professionalFee: professionalFee,
        _discount: discount
      };
    });

    // Remove internal fields
    const cleanRows = rows.map(({ _professionalFee, _discount, ...rest }) => rest);

    return {
      success: true,
      data: cleanRows,
      totalRecords: cleanRows.length
    };
  } catch (error: any) {
    console.error('getConsultantPaymentsReportService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      error: { message: error?.message ?? 'Failed to fetch consultant payments report' }
    };
  }
};
