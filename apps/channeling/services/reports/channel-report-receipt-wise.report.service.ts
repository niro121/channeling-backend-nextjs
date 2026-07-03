'use server';

import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { PAYMENT_METHOD_NAMES, RECEIPT_METHOD, RECEIPT_METHOD_NAMES } from '@/types/receipt';
import {
  ChannelReportReceiptWiseQuery,
  ChannelReportReceiptWiseRow,
} from '@/types/reports/channel-report-receipt-wise';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';

const MAX_RANGE_DAYS = getReportMaxRangeDays('channel_report_receipt_wise', 31);
const MAX_RECORDS_SCAN = getReportMaxRecords('channel_report_receipt_wise', 30000);

const BOOKING_STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Paid',
  2: 'Cancel',
  3: 'Refund',
};

function mapReceiptCategoryToMethods(category?: string): number[] | null {
  switch (category) {
    case 'channel_txn':
      return [RECEIPT_METHOD.PAYMENT, RECEIPT_METHOD.REFUND];
    case 'channel_payment':
      return [RECEIPT_METHOD.PAYMENT];
    case 'channel_refund':
      return [RECEIPT_METHOD.REFUND];
    case 'agent_ledger':
      return [
        RECEIPT_METHOD.DEBIT_NOTE,
        RECEIPT_METHOD.CREDIT_NOTE,
        RECEIPT_METHOD.AGENCY_DEPOSIT,
        RECEIPT_METHOD.AGENCY_WITHDRAW,
      ];
    case 'agent_deposit':
      return [RECEIPT_METHOD.AGENCY_DEPOSIT];
    case 'agent_withdraw':
      return [RECEIPT_METHOD.AGENCY_WITHDRAW];
    case 'bank_ledger':
      return [RECEIPT_METHOD.BANK_DEPOSIT, RECEIPT_METHOD.BANK_WITHDRAW];
    case 'bank_deposit':
      return [RECEIPT_METHOD.BANK_DEPOSIT];
    case 'bank_withdraw':
      return [RECEIPT_METHOD.BANK_WITHDRAW];
    case 'doctor_payments':
      return [RECEIPT_METHOD.DOCTOR_PAYMENT, RECEIPT_METHOD.DOCTOR_CANCEL];
    case 'doctor_payment':
      return [RECEIPT_METHOD.DOCTOR_PAYMENT];
    case 'doctor_cancel':
      return [RECEIPT_METHOD.DOCTOR_CANCEL];
    case 'branch_ledger':
      return [RECEIPT_METHOD.BRANCH_INCOME, RECEIPT_METHOD.BRANCH_EXPENSE];
    case 'branch_income':
      return [RECEIPT_METHOD.BRANCH_INCOME];
    case 'branch_expense':
      return [RECEIPT_METHOD.BRANCH_EXPENSE];
    default:
      return null;
  }
}

function parseDateRange(from?: string, to?: string): { from: Date; to: Date } | null {
  if (!from?.trim() || !to?.trim()) return null;
  const fromDate = parseReportDateTime(from, false);
  const toDate = parseReportDateTime(to, true);
  if (!fromDate || !toDate) return null;
  if (fromDate.getTime() > toDate.getTime()) return null;
  return { from: fromDate, to: toDate };
}

export async function getChannelReportReceiptWiseService(
  query: ChannelReportReceiptWiseQuery
): Promise<{
  success: boolean;
  data?: ChannelReportReceiptWiseRow[];
  totalRecords?: number;
  message?: string;
}> {
  try {
    const dateRange = parseDateRange(query.fromDateTime, query.toDateTime);
    if (!dateRange) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: 'Please provide a valid date & time range.',
      };
    }

    const daySpan = getInclusiveDaySpan(dateRange.from, dateRange.to);
    if (daySpan > MAX_RANGE_DAYS) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
      };
    }

    const receiptNo = query.receiptNo?.trim();
    const scope = query.receiptScope ?? '__all__';
    const methods = mapReceiptCategoryToMethods(query.receiptCategory);
    const where = {
      createdAt: { gte: dateRange.from, lte: dateRange.to },
      ...(scope === 'channel'
        ? { bookingId: { not: null } }
        : scope === 'other'
          ? { bookingId: null }
          : {}),
      ...(methods?.length ? { method: { in: methods } } : {}),
      ...(receiptNo
        ? {
            receiptNoString: {
              contains: receiptNo,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const matchedCount = await prisma.receipt.count({ where });
    if (matchedCount > MAX_RECORDS_SCAN) {
      return {
        success: false,
        data: [],
        totalRecords: 0,
        message: `Too many records in selected range (${matchedCount}). Please narrow filters/date range.`,
      };
    }

    const receipts = await prisma.receipt.findMany({
      where,
      select: {
        id: true,
        receiptNoString: true,
        createdAt: true,
        amount: true,
        paymentMethod: true,
        paymentLines: { select: { paymentMethod: true, amount: true } },
        method: true,
        createdBy: true,
        agency: { select: { name: true } },
        creditCustomer: { select: { name: true } },
        booking: {
          select: {
            bookingid_string: true,
            appointmentNo: true,
            title: true,
            name: true,
            status: true,
            agency: { select: { name: true } },
            doctor: { select: { code: true, name: true } },
            session: { select: { date: true, startTime: true, endTime: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { receiptNo: 'desc' }],
    });

    const creatorIds = Array.from(new Set(receipts.map((r) => r.createdBy).filter(Boolean))) as string[];
    const creators =
      creatorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: creatorIds } },
            select: { id: true, name: true, staff: { select: { code: true } } },
          })
        : [];
    const creatorById = new Map(
      creators.map((u) => [u.id, formatUserDisplayName(u.name, u.id, u.staff?.code)])
    );

    const rows: ChannelReportReceiptWiseRow[] = receipts.map((receipt) => {
      const booking = receipt.booking;
      const session = booking?.session;
      const doctorCode = booking?.doctor?.code?.trim();
      const doctorName = booking?.doctor?.name?.trim();
      const consultant = [doctorCode, doctorName].filter(Boolean).join(' - ') || '-';
      const sessionTime =
        session?.startTime && session?.endTime
          ? `${new Date(session.startTime).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })} - ${new Date(session.endTime).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })}`
          : '-';

      return {
        id: receipt.id,
        receiptScope: booking ? 'Channel' : 'Other',
        receiptNo: receipt.receiptNoString || '-',
        receiptDate: receipt.createdAt,
        receiptMethod:
          receipt.paymentLines.length > 0
            ? receipt.paymentLines
                .map((line) => `${PAYMENT_METHOD_NAMES[line.paymentMethod] ?? String(line.paymentMethod)} ${line.amount}`)
                .join(' + ')
            : PAYMENT_METHOD_NAMES[receipt.paymentMethod] ?? String(receipt.paymentMethod),
        transactionType: RECEIPT_METHOD_NAMES[receipt.method] ?? String(receipt.method),
        receiptAmount: Number(receipt.amount ?? 0),
        bookingNo: booking?.bookingid_string || '-',
        appointmentNo:
          typeof booking?.appointmentNo === 'number' ? String(booking.appointmentNo) : '-',
        sessionDate: session?.date ?? null,
        sessionTime,
        consultant,
        patientName: [booking?.title, booking?.name].filter(Boolean).join(' ').trim() || '-',
        bookingStatus:
          typeof booking?.status === 'number'
            ? (BOOKING_STATUS_LABELS[booking.status] ?? String(booking.status))
            : '-',
        agency: booking?.agency?.name || receipt.agency?.name || '-',
        creditCustomer: receipt.creditCustomer?.name || '-',
        creator: receipt.createdBy ? creatorById.get(receipt.createdBy) || 'Unknown user' : 'System',
      };
    });

    return {
      success: true,
      data: rows,
      totalRecords: rows.length,
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch channel report receipt-wise';
    console.error('getChannelReportReceiptWiseService error:', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message,
    };
  }
}
