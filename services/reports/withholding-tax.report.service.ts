import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { WithholdingTaxReportQuery, WithholdingTaxReportRow } from '@/types/report';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';

const MAX_RANGE_DAYS = getReportMaxRangeDays('withholding_tax', 62);
const MAX_RECEIPTS_SCAN = getReportMaxRecords('withholding_tax', 50000);

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

type ReceiptReportBucket = {
  receiptId: string;
  receiptNoString: string;
  createdAt: Date;
  remarks: string;
  totalAmt: number;
  taxPercent: number;
  holdingTax: number;
  consultant: string;
  speciality: string;
};

export async function getWithholdingTaxReportService(
  query: WithholdingTaxReportQuery
): Promise<{ success: boolean; data: WithholdingTaxReportRow[]; totalRecords: number; message?: string }> {
  try {
    const reportType = query.reportType === 'summary' ? 'summary' : 'detail';
    const from = parseDateTime(query.fromDateTime, false);
    const to = parseDateTime(query.toDateTime, true);
    if (!from || !to) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: 'From and To date/time are required.'
      };
    }
    if (from.getTime() > to.getTime()) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: 'From date must be before or equal to To date.'
      };
    }
    const daySpan = getInclusiveDaySpan(from, to);
    if (daySpan > MAX_RANGE_DAYS) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`
      };
    }

    const where: Prisma.ReceiptWhereInput = {
      method: 4, // RECEIPT_METHOD.DOCTOR_PAYMENT
      whd: { gt: 0 },
      createdAt: {
        gte: from,
        lte: to
      }
    };

    if (query.locationId && query.locationId !== '__all__') {
      where.locationId = query.locationId;
    }

    const matchedCount = await prisma.receipt.count({ where });
    if (matchedCount > MAX_RECEIPTS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Too many records in selected range (${matchedCount}). Please narrow filters/date range.`
      };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      select: {
        id: true,
        receiptNoString: true,
        createdAt: true,
        amount: true,
        paymentLines: { select: { amount: true } },
        whd: true,
        whdPercentage: true,
        remarks: true
      },
      orderBy: [{ createdAt: 'asc' }, { receiptNo: 'asc' }]
    });

    if (!receipts.length) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const receiptIds = receipts.map((r) => r.id);
    const bookings = await prisma.booking.findMany({
      where: {
        doctorPaymentReceiptId: { in: receiptIds }
      },
      select: {
        doctorPaymentReceiptId: true,
        doctorId: true,
        doctor: {
          select: {
            title: true,
            name: true,
            specialityId: true,
            speciality: { select: { name: true } }
          }
        }
      }
    });

    const specialityFilter =
      query.specialityId && query.specialityId !== '__all__' ? query.specialityId : null;

    const receiptDoctorMap = new Map<string, { consultant: string; speciality: string; doctorId: string }>();
    for (const b of bookings) {
      if (!b.doctorPaymentReceiptId || !b.doctor) continue;
      if (query.doctorId && query.doctorId !== '__all__' && b.doctorId !== query.doctorId) continue;
      if (specialityFilter && b.doctor.specialityId !== specialityFilter) continue;
      if (receiptDoctorMap.has(b.doctorPaymentReceiptId)) continue;
      receiptDoctorMap.set(b.doctorPaymentReceiptId, {
        consultant: `${b.doctor.title ?? ''} ${b.doctor.name ?? ''}`.trim() || '-',
        speciality: b.doctor.speciality?.name ?? '-',
        doctorId: b.doctorId
      });
    }

    const detailRows: ReceiptReportBucket[] = receipts
      .map((r) => {
        const mapped = receiptDoctorMap.get(r.id);
        if (!mapped) return null;
        const lineTotal =
          r.paymentLines.length > 0
            ? r.paymentLines.reduce((sum, line) => sum + line.amount, 0)
            : Number(r.amount ?? 0);
        const totalAmt = Math.abs(lineTotal);
        const holdingTax = Number(r.whd ?? 0);
        const netAmt = totalAmt - holdingTax;
        return {
          receiptId: r.id,
          receiptNoString: r.receiptNoString,
          createdAt: r.createdAt,
          remarks: r.remarks ?? '-',
          totalAmt,
          taxPercent: Number(r.whdPercentage ?? 0),
          holdingTax,
          consultant: mapped.consultant,
          speciality: mapped.speciality
        };
      })
      .filter((r): r is ReceiptReportBucket => r !== null);

    if (!detailRows.length) {
      return { success: true, data: [], totalRecords: 0 };
    }

    let rows: WithholdingTaxReportRow[] = [];
    if (reportType === 'summary') {
      const grouped = new Map<string, Omit<WithholdingTaxReportRow, 'id' | 'sNo' | 'docDate' | 'docNo' | 'remarks'>>();
      for (const row of detailRows) {
        const key = `${row.consultant}::${row.speciality}::${row.taxPercent}`;
        const current = grouped.get(key);
        if (current) {
          current.totalAmt += row.totalAmt;
          current.holdingTax += row.holdingTax;
          current.netAmt += row.totalAmt - row.holdingTax;
        } else {
          grouped.set(key, {
            consultant: row.consultant,
            speciality: row.speciality,
            totalAmt: row.totalAmt,
            taxPercent: row.taxPercent,
            holdingTax: row.holdingTax,
            netAmt: row.totalAmt - row.holdingTax
          });
        }
      }

      rows = Array.from(grouped.values()).map((g, idx) => ({
        id: `summary-${idx + 1}`,
        sNo: idx + 1,
        docDate: null,
        docNo: '-',
        consultant: g.consultant,
        speciality: g.speciality,
        remarks: '-',
        totalAmt: g.totalAmt,
        taxPercent: g.taxPercent,
        holdingTax: g.holdingTax,
        netAmt: g.netAmt
      }));
    } else {
      rows = detailRows.map((row, idx) => ({
        id: row.receiptId,
        sNo: idx + 1,
        docDate: row.createdAt,
        docNo: row.receiptNoString,
        consultant: row.consultant,
        speciality: row.speciality,
        remarks: row.remarks,
        totalAmt: row.totalAmt,
        taxPercent: row.taxPercent,
        holdingTax: row.holdingTax,
        netAmt: row.totalAmt - row.holdingTax
      }));
    }

    return {
      success: true,
      data: rows,
      totalRecords: rows.length
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch withholding tax report';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message
    };
  }
}
