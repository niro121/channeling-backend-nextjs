'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import type {
  ChannelDiscountReportQuery,
  ChannelDiscountReportResult,
  ChannelDiscountReportRow
} from '@/types/reports/channel-discount-report';

const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_discount_report', 62);
const MAX_BOOKINGS_SCAN = getReportMaxRecords('channel_discount_report', 50000);

function parseDateTime(input?: string, isEnd = false): Date | null {
  const v = input?.trim();
  if (!v) return null;
  if (v.includes('T')) {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d : null;
  }
  const [y, m, d] = v.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return isEnd ? new Date(y, m - 1, d, 23, 59, 59, 999) : new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getBookingType(method: number, isScan: boolean): string {
  if (isScan) return 'SCAN';
  switch (method) {
    case 1:
      return 'ON-CALL';
    case 2:
      return 'AGENT';
    case 3:
      return 'STAFF';
    case 4:
      return 'API';
    default:
      return 'POS';
  }
}

function isWithinRange(date: Date | null | undefined, from: Date, to: Date): boolean {
  if (!date) return false;
  const t = date.getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export async function getChannelDiscountReportService(query: ChannelDiscountReportQuery): Promise<ChannelDiscountReportResult> {
  try {
    const from = parseDateTime(query.fromDateTime, false);
    const to = parseDateTime(query.toDateTime, true);
    if (!from || !to) {
      return { success: false, message: 'From and To date/time are required.' };
    }
    if (from.getTime() > to.getTime()) {
      return { success: false, message: 'From date must be before or equal to To date.' };
    }
    const daySpan = getInclusiveDaySpan(from, to);
    if (daySpan > MAX_RANGE_DAYS) {
      return { success: false, message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` };
    }

    const where: Prisma.BookingWhereInput = {
      status: { in: [1, 2, 3] },
      receiptNoString: { not: null },
      AND: [
        {
          OR: [
            { receiptNoCreatedAt: { gte: from, lte: to } },
            { refundReceiptCreatedAt: { gte: from, lte: to } }
          ]
        },
        {
          OR: [
            { hospitalFeeDiscount: { gt: 0 } },
            { professionsalFeeDiscount: { gt: 0 } },
            { autoDiscountId: { not: null } },
            { discountId: { not: null } }
          ]
        }
      ]
    };

    if (query.doctorId && query.doctorId !== '__all__') {
      where.doctorId = query.doctorId;
    }
    if (query.locationId && query.locationId !== '__all__') {
      where.locationId = query.locationId;
    }
    if (query.specialityId && query.specialityId !== '__all__') {
      where.doctor = { is: { specialityId: query.specialityId } };
    }
    if (query.discountSchemeId && query.discountSchemeId !== '__all__') {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [{ discountId: query.discountSchemeId }, { autoDiscountId: query.discountSchemeId }]
        }
      ];
    }

    const matchedBookingCount = await prisma.booking.count({ where });
    if (matchedBookingCount > MAX_BOOKINGS_SCAN) {
      return {
        success: false,
        message: `Too many records in selected range (${matchedBookingCount}). Please narrow filters/date range.`
      };
    }

    const rows = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        title: true,
        name: true,
        method: true,
        isScan: true,
        receiptPaymentMethod: true,
        receiptNoString: true,
        receiptNoCreatedAt: true,
        refundReceiptCreatedAt: true,
        refund: true,
        hospitalFee: true,
        hospitalFeeDiscount: true,
        professionalFee: true,
        professionsalFeeDiscount: true,
        discountId: true,
        autoDiscountId: true,
        doctor: {
          select: { title: true, name: true, code: true }
        },
        session: {
          select: { date: true }
        },
        sessionStartTime: true,
        sessionEndTime: true
      },
      orderBy: [{ receiptNoCreatedAt: 'asc' }, { receiptNo: 'asc' }]
    });

    const discountIds = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.discountId, r.autoDiscountId])
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      )
    );
    const discounts = discountIds.length
      ? await prisma.discount.findMany({
          where: { id: { in: discountIds } },
          select: { id: true, name: true }
        })
      : [];
    const discountById = new Map(discounts.map((d) => [d.id, d.name]));

    const data: ChannelDiscountReportRow[] = rows.flatMap((r) => {
      const hospitalFee = Number(r.hospitalFee ?? 0);
      const hospitalFeeDiscount = Number(r.hospitalFeeDiscount ?? 0);
      const professionalFee = Number(r.professionalFee ?? 0);
      const professionalFeeDiscount = Number(r.professionsalFeeDiscount ?? 0);
      const discount = hospitalFeeDiscount + professionalFeeDiscount;
      const refundType = Number(r.refund ?? 0);
      // Exclude professional-fee-only refunds from this report (refundType=1).
      const hasRefundEvent = refundType === 2 || refundType === 3;
      const inPaymentWindow = isWithinRange(r.receiptNoCreatedAt, from, to);
      const inRefundWindow = hasRefundEvent && isWithinRange(r.refundReceiptCreatedAt, from, to);
      const bookingType = getBookingType(Number(r.method ?? 0), Boolean(r.isScan));
      const paymentType =
        r.receiptPaymentMethod != null
          ? (PAYMENT_METHOD_NAMES[Number(r.receiptPaymentMethod)] ?? String(r.receiptPaymentMethod)).toUpperCase()
          : '-';

      const common = {
        id: r.id,
        sessionDate: r.session?.date ?? null,
        sessionStartTime: r.sessionStartTime ?? null,
        sessionEndTime: r.sessionEndTime ?? null,
        billNo: r.receiptNoString ?? '-',
        patientName: `${r.title ?? ''} ${r.name ?? ''}`.trim(),
        doctor: `${r.doctor?.title ?? ''} ${r.doctor?.name ?? ''} (${r.doctor?.code ?? '-'})`.trim(),
        autoDiscountScheme: r.autoDiscountId ? (discountById.get(r.autoDiscountId) ?? '-') : '-',
        discountScheme: r.discountId ? (discountById.get(r.discountId) ?? '-') : '-'
      };
      const out: ChannelDiscountReportRow[] = [];
      if (inPaymentWindow) {
        out.push({
          ...common,
          id: `${r.id}-payment`,
          bookingDate: r.receiptNoCreatedAt ?? null,
          type: `${bookingType}-${paymentType}`,
          hospitalFee,
          hospitalFeeDiscount,
          professionalFee,
          professionalFeeDiscount,
          discount,
        });
      }
      if (inRefundWindow) {
        const reversalHospitalFee = -hospitalFee;
        const reversalHospitalFeeDiscount = -hospitalFeeDiscount;
        const reversalProfessionalFee = refundType === 2 ? professionalFee : -professionalFee;
        const reversalProfessionalFeeDiscount =
          refundType === 2 ? professionalFeeDiscount : -professionalFeeDiscount;
        const reversalDiscount = reversalHospitalFeeDiscount + reversalProfessionalFeeDiscount;

        out.push({
          ...common,
          id: `${r.id}-refund`,
          bookingDate: r.refundReceiptCreatedAt ?? null,
          type: `${bookingType}-${paymentType}-REVERSAL`,
          hospitalFee: reversalHospitalFee,
          hospitalFeeDiscount: reversalHospitalFeeDiscount,
          professionalFee: reversalProfessionalFee,
          professionalFeeDiscount: reversalProfessionalFeeDiscount,
          discount: reversalDiscount,
        });
      }
      return out;
    }).sort((a, b) => {
      const ta = a.bookingDate?.getTime() ?? 0;
      const tb = b.bookingDate?.getTime() ?? 0;
      if (ta !== tb) return ta - tb;
      return String(a.billNo).localeCompare(String(b.billNo));
    });

    return { success: true, data, totalRecords: data.length };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch channel discount report';
    return { success: false, message };
  }
}
