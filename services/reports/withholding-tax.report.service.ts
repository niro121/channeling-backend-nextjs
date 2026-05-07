import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { WithholdingTaxReportQuery, WithholdingTaxReportRow } from '@/types/report';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { WHT_PAYABLE_ACCOUNT_CODE } from '@/services/accounting/account/wht-payable-account.constants';

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
  netAmt: number;
  consultant: string;
  speciality: string;
  doctorId: string | null;
  specialityId: string | null;
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

    const whtPayableAccount = await prisma.account.findUnique({
      where: { code: WHT_PAYABLE_ACCOUNT_CODE },
      select: { id: true }
    });
    if (!whtPayableAccount) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const lineWhere: Prisma.JournalLineWhereInput = {
      accountId: whtPayableAccount.id,
      journal: {
        referenceType: 'Receipt',
        date: { gte: from, lte: to },
        ...(query.locationId && query.locationId !== '__all__' ? { locationId: query.locationId } : {}),
      },
    };

    const matchedCount = await prisma.journalLine.count({ where: lineWhere });
    if (matchedCount > MAX_RECEIPTS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Too many records in selected range (${matchedCount}). Please narrow filters/date range.`
      };
    }

    const whtLines = await prisma.journalLine.findMany({
      where: lineWhere,
      select: {
        id: true,
        journalId: true,
        debitAmount: true,
        creditAmount: true,
        journal: {
          select: {
            id: true,
            date: true,
            referenceId: true,
            journalLines: {
              select: {
                account: {
                  select: {
                    doctor: {
                      select: {
                        id: true,
                        title: true,
                        name: true,
                        specialityId: true,
                        speciality: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ journal: { date: 'asc' } }, { id: 'asc' }],
    });

    if (!whtLines.length) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const receiptIds = Array.from(
      new Set(
        whtLines
          .map((l) => l.journal.referenceId)
          .filter((id): id is string => Boolean(id))
      )
    );
    if (!receiptIds.length) {
      return { success: true, data: [], totalRecords: 0 };
    }

    const receipts = await prisma.receipt.findMany({
      where: { id: { in: receiptIds }, method: { in: [4, 5] } },
      select: {
        id: true,
        method: true,
        receiptNoString: true,
        createdAt: true,
        amount: true,
        paymentLines: { select: { amount: true } },
        whd: true,
        whdPercentage: true,
        remarks: true,
        reversedReceiptId: true,
      },
    });
    const receiptById = new Map(receipts.map((r) => [r.id, r]));

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

    const receiptDoctorMap = new Map<
      string,
      { consultant: string; speciality: string; doctorId: string | null; specialityId: string | null }
    >();
    for (const b of bookings) {
      if (!b.doctorPaymentReceiptId || !b.doctor) continue;
      if (receiptDoctorMap.has(b.doctorPaymentReceiptId)) continue;
      receiptDoctorMap.set(b.doctorPaymentReceiptId, {
        consultant: `${b.doctor.title ?? ''} ${b.doctor.name ?? ''}`.trim() || '-',
        speciality: b.doctor.speciality?.name ?? '-',
        doctorId: b.doctorId,
        specialityId: b.doctor.specialityId ?? null,
      });
    }

    const journalDoctorMap = new Map<
      string,
      { consultant: string; speciality: string; doctorId: string | null; specialityId: string | null }
    >();
    for (const line of whtLines) {
      if (journalDoctorMap.has(line.journalId)) continue;
      const doctor = line.journal.journalLines
        .map((jl) => jl.account?.doctor)
        .find((d) => Boolean(d));
      if (!doctor) continue;
      journalDoctorMap.set(line.journalId, {
        consultant: `${doctor.title ?? ''} ${doctor.name ?? ''}`.trim() || '-',
        speciality: doctor.speciality?.name ?? '-',
        doctorId: doctor.id,
        specialityId: doctor.specialityId ?? null,
      });
    }

    const specialityFilter =
      query.specialityId && query.specialityId !== '__all__' ? query.specialityId : null;

    const detailRows: ReceiptReportBucket[] = whtLines
      .map((line): ReceiptReportBucket | null => {
        const receiptId = line.journal.referenceId;
        if (!receiptId) return null;
        const receipt = receiptById.get(receiptId);
        if (!receipt) return null;

        const signedHoldingTax = (Number(line.creditAmount ?? 0) - Number(line.debitAmount ?? 0)) / 100;
        const sign =
          signedHoldingTax > 0
            ? 1
            : signedHoldingTax < 0
              ? -1
              : receipt.method === 5
                ? -1
                : 1;
        const lineTotal =
          receipt.paymentLines.length > 0
            ? receipt.paymentLines.reduce((sum, pl) => sum + Number(pl.amount ?? 0), 0)
            : Number(receipt.amount ?? 0);
        const totalAmt = Math.abs(lineTotal) * sign;
        const netAmt = totalAmt - signedHoldingTax;

        const mapped =
          journalDoctorMap.get(line.journalId) ??
          receiptDoctorMap.get(receipt.id) ??
          (receipt.reversedReceiptId ? receiptDoctorMap.get(receipt.reversedReceiptId) : undefined);
        if (!mapped) return null;

        if (query.doctorId && query.doctorId !== '__all__' && mapped.doctorId !== query.doctorId) return null;
        if (specialityFilter && mapped.specialityId !== specialityFilter) return null;

        return {
          receiptId: receipt.id,
          receiptNoString: receipt.receiptNoString,
          createdAt: line.journal.date,
          remarks: receipt.remarks ?? '-',
          totalAmt,
          taxPercent: Number(receipt.whdPercentage ?? 0),
          holdingTax: signedHoldingTax,
          netAmt,
          consultant: mapped.consultant,
          speciality: mapped.speciality,
          doctorId: mapped.doctorId ?? null,
          specialityId: mapped.specialityId,
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
          current.netAmt += row.netAmt;
        } else {
          grouped.set(key, {
            consultant: row.consultant,
            speciality: row.speciality,
            totalAmt: row.totalAmt,
            taxPercent: row.taxPercent,
            holdingTax: row.holdingTax,
            netAmt: row.netAmt
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
        netAmt: row.netAmt
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
