'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { RECEIPT_METHOD, RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type {
  CashierSummaryReportQuery,
  CashierSummaryReportResponse,
  CashierSummaryReportSection,
  CashierSummaryReportLineItem,
  CashierSummaryPaymentAmounts,
  CashierSummaryIncludedShift,
} from '@/types/report';
import type { Prisma } from '@prisma/client';

const ZERO_AMOUNTS: CashierSummaryPaymentAmounts = {
  cash: 0,
  creditCard: 0,
  slip: 0,
  cheque: 0,
  agent: 0,
  agentCredit: 0,
  eWallet: 0,
};

const MAX_RANGE_DAYS = getReportMaxRangeDays('cashier_summary', 62);
const MAX_RECEIPTS_SCAN = getReportMaxRecords('cashier_summary', 50000);

/**
 * Parse a date or datetime string into a single moment.
 * - If string contains 'T' (e.g. YYYY-MM-DDTHH:mm): parse as full datetime (local).
 * - Otherwise (YYYY-MM-DD): parse as date only; if asEnd use end of day, else start of day.
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

/** Parse from/to strings into { start, end } for receipt createdAt filter. */
function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseDateTime(dateFrom, false);
  const end = parseDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function paymentColumnKey(paymentMethod: number): keyof CashierSummaryPaymentAmounts {
  const map: Record<number, keyof CashierSummaryPaymentAmounts> = {
    [RECEIPT_PAYMENT_METHOD.CASH]: 'cash',
    [RECEIPT_PAYMENT_METHOD.CREDIT_CARD]: 'creditCard',
    [RECEIPT_PAYMENT_METHOD.SLIP]: 'slip',
    [RECEIPT_PAYMENT_METHOD.CHECK]: 'cheque',
    [RECEIPT_PAYMENT_METHOD.AGENT]: 'agent',
    [RECEIPT_PAYMENT_METHOD.CREDIT]: 'agentCredit',
    [RECEIPT_PAYMENT_METHOD.E_WALLET]: 'eWallet',
  };
  return map[paymentMethod] ?? 'cash';
}

/** Outflows (type 0) show as negative; inflows (type 1) as positive. Use Math.abs so refunds (stored negative) also display as minus. */
function receiptToAmounts(
  paymentMethod: number,
  amount: number,
  type: number
): CashierSummaryPaymentAmounts {
  const key = paymentColumnKey(paymentMethod);
  const value = type === 0 ? -Math.abs(amount) : amount;
  return { ...ZERO_AMOUNTS, [key]: value };
}

function addAmounts(a: CashierSummaryPaymentAmounts, b: CashierSummaryPaymentAmounts): CashierSummaryPaymentAmounts {
  return {
    cash: a.cash + b.cash,
    creditCard: a.creditCard + b.creditCard,
    slip: a.slip + b.slip,
    cheque: a.cheque + b.cheque,
    agent: a.agent + b.agent,
    agentCredit: a.agentCredit + b.agentCredit,
    eWallet: a.eWallet + b.eWallet,
  };
}

/** Booking id for display (Bill ID): prefer bookingid_string, then receiptNoString, then id. */
function bookingDisplayId(booking: { id: string; bookingid_string?: string | null; receiptNoString?: string | null } | null): string | null {
  if (!booking) return null;
  return (booking.bookingid_string ?? booking.receiptNoString ?? booking.id) || null;
}

function formatSessionDateTime(session: { date: Date; startTime?: Date | null } | null): string | null {
  if (!session) return null;
  const d = session.date instanceof Date ? session.date : new Date(session.date);
  const t = session.startTime instanceof Date ? session.startTime : session.startTime;
  if (t != null) {
    const tDate = t instanceof Date ? t : new Date(Number(t) * 1000);
    return `${d.toLocaleDateString('en-CA', { dateStyle: 'short' })} ${tDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  return d.toLocaleDateString('en-CA', { dateStyle: 'short' });
}

function formatShiftLabel(
  shift: { startedAt: Date; endedAt?: Date | null; user?: { id?: string; name: string | null; staff?: { code: string | null } | null } | null } | null
): string | null {
  if (!shift) return null;
  const start = new Date(shift.startedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
  const end = shift.endedAt
    ? new Date(shift.endedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : 'Ongoing';
  const userName = formatUserDisplayName(shift.user?.name, shift.user?.id, shift.user?.staff?.code);
  return `${userName} (${start} - ${end})`;
}

export async function getCashierSummaryReportService(
  query: CashierSummaryReportQuery
): Promise<CashierSummaryReportResponse> {
  const range = parseFromTo(query.dateFrom, query.dateTo);
  if (!range) {
    return { success: false, sections: [], grandTotals: ZERO_AMOUNTS, includedShifts: [], message: 'From date and to date are required.' };
  }
  const { start: from, end: to } = range;
  if (from.getTime() > to.getTime()) {
    return { success: false, sections: [], grandTotals: ZERO_AMOUNTS, includedShifts: [], message: 'From date/time must be before or equal to to date/time.' };
  }
  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return { success: false, sections: [], grandTotals: ZERO_AMOUNTS, includedShifts: [], message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.` };
  }

  const baseWhere: Prisma.ReceiptWhereInput = {
    createdAt: { gte: from, lte: to },
  };
  if (query.userId && query.userId.trim() !== '' && query.userId !== '__all__') {
    baseWhere.createdBy = query.userId.trim();
  }
  const matchedReceiptCount = await prisma.receipt.count({ where: baseWhere });
  if (matchedReceiptCount > MAX_RECEIPTS_SCAN) {
    return {
      success: false,
      sections: [],
      grandTotals: ZERO_AMOUNTS,
      includedShifts: [],
      message: `Too many records in selected range (${matchedReceiptCount}). Please narrow filters/date range.`,
    };
  }
  const isSummary = query.format === 'summary';

  const receiptIncludeBookingSessionDoctor = {
    booking: {
      include: {
        session: { select: { date: true, startTime: true } },
        doctor: { select: { title: true, name: true } },
      },
    },
    shift: {
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        user: { select: { id: true, name: true, staff: { select: { code: true } } } },
      },
    },
  } as const;

  const sections: CashierSummaryReportSection[] = [];
  let grandTotals = { ...ZERO_AMOUNTS };
  const includedShiftMap = new Map<string, CashierSummaryIncludedShift>();

  function collectShifts(
    rows: Array<{
      shiftId?: string | null;
      shift?: { id: string; startedAt: Date; endedAt?: Date | null; user?: { id?: string; name: string | null; staff?: { code: string | null } | null } | null } | null;
    }>
  ) {
    for (const row of rows) {
      if (!row.shiftId || !row.shift) continue;
      if (!includedShiftMap.has(row.shiftId)) {
        includedShiftMap.set(row.shiftId, {
          id: row.shift.id,
          userName: formatUserDisplayName(row.shift.user?.name, row.shift.user?.id, row.shift.user?.staff?.code),
          startedAt: row.shift.startedAt,
          endedAt: row.shift.endedAt ?? null,
        });
      }
    }
  }

  // --- Channel Billed: method PAYMENT, bookingId not null ---
  const channelBilled = await prisma.receipt.findMany({
    where: { ...baseWhere, method: RECEIPT_METHOD.PAYMENT, bookingId: { not: null } },
    include: receiptIncludeBookingSessionDoctor,
    orderBy: { createdAt: 'asc' },
  });
  const channelBilledRows: CashierSummaryReportLineItem[] = channelBilled.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: b ? [b.title, b.name].filter(Boolean).join(' ') || null : null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(channelBilled);
  const channelBilledTotals = channelBilledRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'channelBilled',
    title: 'Channel Billed Bills',
    rows: isSummary ? [] : channelBilledRows,
    totals: channelBilledTotals,
  });
  grandTotals = addAmounts(grandTotals, channelBilledTotals);

  // --- Channel Refund: REFUND receipt, channel — not full cancel (refund 3 + status 2 together)
  const channelRefund = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      method: RECEIPT_METHOD.REFUND,
      bookingId: { not: null },
      agencyId: null,
      booking: { OR: [{ refund: { not: 3 } }, { status: { not: 2 } }] },
    },
    include: receiptIncludeBookingSessionDoctor,
    orderBy: { createdAt: 'asc' },
  });
  const channelRefundRows: CashierSummaryReportLineItem[] = channelRefund.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: b ? [b.title, b.name].filter(Boolean).join(' ') || null : null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(channelRefund);
  const channelRefundTotals = channelRefundRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'channelRefund',
    title: 'Channel Refund Bills',
    rows: channelRefundRows,
    totals: channelRefundTotals,
  });
  grandTotals = addAmounts(grandTotals, channelRefundTotals);

  // --- Channel Cancel: full paid cancel sets refund 3 and status 2 (refund-channel.service)
  const channelCancel = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      method: RECEIPT_METHOD.REFUND,
      bookingId: { not: null },
      agencyId: null,
      booking: { AND: [{ refund: 3 }, { status: 2 }] },
    },
    include: receiptIncludeBookingSessionDoctor,
    orderBy: { createdAt: 'asc' },
  });
  const channelCancelRows: CashierSummaryReportLineItem[] = channelCancel.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: b ? [b.title, b.name].filter(Boolean).join(' ') || null : null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(channelCancel);
  const channelCancelTotals = channelCancelRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'channelCancel',
    title: 'Channel Cancel Bills',
    rows: isSummary ? [] : channelCancelRows,
    totals: channelCancelTotals,
  });
  grandTotals = addAmounts(grandTotals, channelCancelTotals);

  // --- Agent Billed: agencyId not null, method PAYMENT ---
  const agentBilled = await prisma.receipt.findMany({
    where: { ...baseWhere, agencyId: { not: null }, method: RECEIPT_METHOD.PAYMENT },
    include: {
      booking: { include: { session: { select: { date: true, startTime: true } }, doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentBilledRows: CashierSummaryReportLineItem[] = agentBilled.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: b ? [b.title, b.name].filter(Boolean).join(' ') || null : null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(agentBilled);
  const agentBilledTotals = agentBilledRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'agentBilled',
    title: 'Agent - Billed Bills',
    rows: isSummary ? [] : agentBilledRows,
    totals: agentBilledTotals,
  });
  grandTotals = addAmounts(grandTotals, agentBilledTotals);

  // --- Agent Refunded: not full cancel (refund 3 + status 2)
  const agentRefunded = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      agencyId: { not: null },
      method: RECEIPT_METHOD.REFUND,
      booking: { OR: [{ refund: { not: 3 } }, { status: { not: 2 } }] },
    },
    include: {
      booking: { include: { session: { select: { date: true, startTime: true } }, doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentRefundedRows: CashierSummaryReportLineItem[] = agentRefunded.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: b ? [b.title, b.name].filter(Boolean).join(' ') || null : null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(agentRefunded);
  const agentRefundedTotals = agentRefundedRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'agentRefunded',
    title: 'Agent - Refunded Bills',
    rows: isSummary ? [] : agentRefundedRows,
    totals: agentRefundedTotals,
  });
  grandTotals = addAmounts(grandTotals, agentRefundedTotals);

  // --- Agent Canceled: same rule as channel — refund 3 and status 2 on paid full cancel
  const agentCanceled = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      agencyId: { not: null },
      method: RECEIPT_METHOD.REFUND,
      booking: { AND: [{ refund: 3 }, { status: 2 }] },
    },
    include: {
      booking: { include: { session: { select: { date: true, startTime: true } }, doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentCanceledRows: CashierSummaryReportLineItem[] = agentCanceled.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: b ? [b.title, b.name].filter(Boolean).join(' ') || null : null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(agentCanceled);
  const agentCanceledTotals = agentCanceledRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'agentCanceled',
    title: 'Agent - Canceled Bills',
    rows: isSummary ? [] : agentCanceledRows,
    totals: agentCanceledTotals,
  });
  grandTotals = addAmounts(grandTotals, agentCanceledTotals);

  // --- Agent Deposit: method AGENCY_DEPOSIT ---
  const agentDeposit = await prisma.receipt.findMany({
    where: { ...baseWhere, method: RECEIPT_METHOD.AGENCY_DEPOSIT },
    include: {
      agency: { select: { name: true } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentDepositRows: CashierSummaryReportLineItem[] = agentDeposit.map((r) => {
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime: null,
      billId: null,
      receiptId: r.receiptNoString,
      patient: r.agency?.name ?? null,
      consultant: null,
      ...amounts,
    };
  });
  collectShifts(agentDeposit);
  const agentDepositTotals = agentDepositRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'agentDeposit',
    title: 'Agent - Deposit Bills',
    rows: isSummary ? [] : agentDepositRows,
    totals: agentDepositTotals,
  });
  grandTotals = addAmounts(grandTotals, agentDepositTotals);

  // --- Agent Deposit Canceled: no distinct method in schema; use empty section ---
  sections.push({
    key: 'agentDepositCanceled',
    title: 'Agent Deposit - Canceled Bills',
    rows: [],
    totals: ZERO_AMOUNTS,
  });

  // --- Doctor Payment / Canceled: method 4 or 5 ---
  const doctorPayments = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      method: { in: [RECEIPT_METHOD.DOCTOR_PAYMENT, RECEIPT_METHOD.DOCTOR_CANCEL] },
    },
    include: {
      booking: { include: { doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const doctorPaymentRows: CashierSummaryReportLineItem[] = doctorPayments.map((r) => {
    const consultant = r.booking?.doctor ? `${r.booking.doctor.title} ${r.booking.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime: null,
      billId: null,
      receiptId: r.receiptNoString,
      patient: null,
      consultant,
      ...amounts,
    };
  });
  collectShifts(doctorPayments);
  const doctorPaymentTotals = doctorPaymentRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'doctorPayment',
    title: 'Doctor Payment / Canceled - Bills',
    rows: isSummary ? [] : doctorPaymentRows,
    totals: doctorPaymentTotals,
  });
  grandTotals = addAmounts(grandTotals, doctorPaymentTotals);

  // --- Income / Expense: method BRANCH_INCOME, BRANCH_EXPENSE ---
  const incomeExpense = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      method: { in: [RECEIPT_METHOD.BRANCH_INCOME, RECEIPT_METHOD.BRANCH_EXPENSE] },
    },
    include: {
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const incomeExpenseRows: CashierSummaryReportLineItem[] = incomeExpense.map((r) => {
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type);
    const typeLabel = r.method === RECEIPT_METHOD.BRANCH_INCOME ? 'Income' : 'Expense';
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime: null,
      billId: null,
      receiptId: r.receiptNoString,
      patient: null,
      consultant: null,
      name: r.remarks || r.receiptNoString,
      type: typeLabel,
      ...amounts,
    };
  });
  collectShifts(incomeExpense);
  const incomeExpenseTotals = incomeExpenseRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'incomeExpense',
    title: 'Income / Expenses - Bills',
    rows: isSummary ? [] : incomeExpenseRows,
    totals: incomeExpenseTotals,
  });
  grandTotals = addAmounts(grandTotals, incomeExpenseTotals);

  return {
    success: true,
    sections,
    grandTotals,
    includedShifts: Array.from(includedShiftMap.values()).sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime()),
  };
}
