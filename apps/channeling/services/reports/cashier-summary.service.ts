'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { RECEIPT_METHOD } from '@/types/receipt';
import { REFERENCE_TYPES } from '@/types/accounting';
import type {
  CashierSummaryReportQuery,
  CashierSummaryReportResponse,
  CashierSummaryReportSection,
  CashierSummaryReportLineItem,
  CashierSummaryPaymentAmounts,
  CashierSummaryIncludedShift,
} from '@/types/report';
import type { Prisma } from '@prisma/client';
import {
  CASHIER_SUMMARY_ZERO_AMOUNTS as ZERO_AMOUNTS,
  receiptToAmounts,
  receiptToAmountsDoctorPaymentNet,
  addCashierSummaryAmounts as addAmounts,
} from '@/lib/cashier-summary-amounts';

const MAX_RANGE_DAYS = getReportMaxRangeDays('cashier_summary', 62);
const MAX_RECEIPTS_SCAN = getReportMaxRecords('cashier_summary', 50000);

function parseDateTime(value: string, asEnd: boolean): Date | null {
  return parseReportDateTime(value, asEnd);
}

/** Parse from/to strings into { start, end } for receipt createdAt filter. */
function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseDateTime(dateFrom, false);
  const end = parseDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
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

function doctorNameFromJournalLines(
  lines: Array<{
    account: { doctor: { title: string; name: string } | null } | null;
  }>
): string | null {
  for (const line of lines) {
    const d = line.account?.doctor;
    if (d) return `${d.title} ${d.name}`.trim();
  }
  return null;
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
  const multiUserIds = (query.userIds ?? [])
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter((id) => id !== '' && id !== '__all__');
  if (multiUserIds.length > 0) {
    baseWhere.createdBy = { in: [...new Set(multiUserIds)] };
  } else if (query.userId && query.userId.trim() !== '' && query.userId !== '__all__') {
    baseWhere.createdBy = query.userId.trim();
  }
  if (query.locationId && query.locationId.trim() !== '' && query.locationId !== '__all__') {
    const locationId = query.locationId.trim();
    baseWhere.OR = [{ locationId }, { userLocationId: locationId }];
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
    paymentLines: { select: { paymentMethod: true, amount: true } },
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
    // Channel sections should exclude agent-linked bookings (those belong under Agent - ... sections).
    where: { ...baseWhere, method: RECEIPT_METHOD.PAYMENT, bookingId: { not: null }, agencyId: null },
    include: receiptIncludeBookingSessionDoctor,
    orderBy: { createdAt: 'asc' },
  });
  const channelBilledRows: CashierSummaryReportLineItem[] = channelBilled.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
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
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
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
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
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
      paymentLines: { select: { paymentMethod: true, amount: true } },
      agency: { select: { name: true } },
      booking: { include: { session: { select: { date: true, startTime: true } }, doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentBilledRows: CashierSummaryReportLineItem[] = agentBilled.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: r.agency?.name ?? null,
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
      paymentLines: { select: { paymentMethod: true, amount: true } },
      agency: { select: { name: true } },
      booking: { include: { session: { select: { date: true, startTime: true } }, doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentRefundedRows: CashierSummaryReportLineItem[] = agentRefunded.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: r.agency?.name ?? null,
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
      paymentLines: { select: { paymentMethod: true, amount: true } },
      agency: { select: { name: true } },
      booking: { include: { session: { select: { date: true, startTime: true } }, doctor: { select: { title: true, name: true } } } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentCanceledRows: CashierSummaryReportLineItem[] = agentCanceled.map((r) => {
    const b = r.booking;
    const sessionDateTime = b?.session ? formatSessionDateTime({ date: b.session.date, startTime: b.session.startTime }) : null;
    const consultant = b?.doctor ? `${b.doctor.title} ${b.doctor.name}`.trim() : null;
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
    return {
      txCreated: r.createdAt,
      shiftLabel: formatShiftLabel(r.shift),
      sessionDateTime,
      billId: bookingDisplayId(b),
      receiptId: r.receiptNoString,
      patient: r.agency?.name ?? null,
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

  // --- Agent Deposit & Withdraw: deposits + agency withdrawals (withdraw rows that cancel a deposit go to Agent Deposit - Canceled only)
  const agentDepositOnly = await prisma.receipt.findMany({
    where: { ...baseWhere, method: RECEIPT_METHOD.AGENCY_DEPOSIT },
    include: {
      paymentLines: { select: { paymentMethod: true, amount: true } },
      agency: { select: { name: true } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const agentWithdrawAll = await prisma.receipt.findMany({
    where: { ...baseWhere, method: RECEIPT_METHOD.AGENCY_WITHDRAW, agencyId: { not: null } },
    include: {
      paymentLines: { select: { paymentMethod: true, amount: true } },
      agency: { select: { name: true } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const withdrawReversalIds = [...new Set(agentWithdrawAll.map((r) => r.reversedReceiptId).filter(Boolean))] as string[];
  const reversalOriginals =
    withdrawReversalIds.length > 0
      ? await prisma.receipt.findMany({
          where: { id: { in: withdrawReversalIds }, method: RECEIPT_METHOD.AGENCY_DEPOSIT },
          select: { id: true },
        })
      : [];
  const agentDepositCancelOrigIds = new Set(reversalOriginals.map((o) => o.id));
  const agentWithdrawForDepositSection = agentWithdrawAll.filter(
    (r) => !r.reversedReceiptId || !agentDepositCancelOrigIds.has(r.reversedReceiptId)
  );
  const agentDepositCombined = [...agentDepositOnly, ...agentWithdrawForDepositSection].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );
  function mapAgentLedgerRow(r: (typeof agentDepositOnly)[0]): CashierSummaryReportLineItem {
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
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
  }
  const agentDepositRows: CashierSummaryReportLineItem[] = agentDepositCombined.map(mapAgentLedgerRow);
  collectShifts(agentDepositCombined);
  const agentDepositTotals = agentDepositRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'agentDeposit',
    title: 'Agent - Deposit & Withdraw Bills',
    rows: isSummary ? [] : agentDepositRows,
    totals: agentDepositTotals,
  });
  grandTotals = addAmounts(grandTotals, agentDepositTotals);

  // --- Agent Deposit Canceled: AGENCY_WITHDRAW reversal of an AGENCY_DEPOSIT (subset of agentWithdrawAll)
  const agentDepositCanceledFiltered = agentWithdrawAll.filter(
    (r) => r.reversedReceiptId != null && agentDepositCancelOrigIds.has(r.reversedReceiptId)
  );
  const agentDepositCanceledRows: CashierSummaryReportLineItem[] = agentDepositCanceledFiltered.map((r) => {
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
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
  collectShifts(agentDepositCanceledFiltered);
  const agentDepositCanceledTotals = agentDepositCanceledRows.reduce((acc, r) => addAmounts(acc, r), ZERO_AMOUNTS);
  sections.push({
    key: 'agentDepositCanceled',
    title: 'Agent Deposit - Canceled Bills',
    rows: isSummary ? [] : agentDepositCanceledRows,
    totals: agentDepositCanceledTotals,
  });
  grandTotals = addAmounts(grandTotals, agentDepositCanceledTotals);

  // --- Doctor Payment / Canceled: method 4 or 5 ---
  const doctorPayments = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      method: { in: [RECEIPT_METHOD.DOCTOR_PAYMENT, RECEIPT_METHOD.DOCTOR_CANCEL] },
    },
    include: {
      paymentLines: { select: { paymentMethod: true, amount: true } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
      doctor: { select: { title: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const paymentReceiptIds = doctorPayments.filter((r) => r.method === RECEIPT_METHOD.DOCTOR_PAYMENT).map((r) => r.id);
  const cancelOriginalIds = doctorPayments
    .filter((r) => r.method === RECEIPT_METHOD.DOCTOR_CANCEL && r.reversedReceiptId)
    .map((r) => r.reversedReceiptId) as string[];

  const bookingsLinked = await prisma.booking.findMany({
    where: { doctorPaymentReceiptId: { in: [...new Set([...paymentReceiptIds, ...cancelOriginalIds])] } },
    select: {
      doctorPaymentReceiptId: true,
      doctor: { select: { title: true, name: true } },
    },
  });
  const consultantByPaymentReceiptId = new Map<string, string>();
  for (const b of bookingsLinked) {
    if (!b.doctorPaymentReceiptId || !b.doctor) continue;
    if (consultantByPaymentReceiptId.has(b.doctorPaymentReceiptId)) continue;
    consultantByPaymentReceiptId.set(
      b.doctorPaymentReceiptId,
      `${b.doctor.title} ${b.doctor.name}`.trim()
    );
  }

  const journalRefIds = [
    ...new Set([
      ...doctorPayments.map((r) => r.id),
      ...doctorPayments.map((r) => r.reversedReceiptId).filter((id): id is string => Boolean(id)),
    ]),
  ];
  const journalsForDoctorReceipts =
    journalRefIds.length > 0
      ? await prisma.journal.findMany({
          where: {
            referenceType: REFERENCE_TYPES.Receipt,
            referenceId: { in: journalRefIds },
          },
          include: {
            journalLines: {
              include: { account: { include: { doctor: { select: { title: true, name: true } } } } },
            },
          },
        })
      : [];
  const consultantByJournalRefId = new Map<string, string>();
  for (const j of journalsForDoctorReceipts) {
    if (!j.referenceId) continue;
    const name = doctorNameFromJournalLines(j.journalLines);
    if (name && !consultantByJournalRefId.has(j.referenceId)) {
      consultantByJournalRefId.set(j.referenceId, name);
    }
  }

  function resolveDoctorConsultant(r: (typeof doctorPayments)[0]): string | null {
    if (r.doctor) {
      return `${r.doctor.title} ${r.doctor.name}`.trim() || null;
    }
    if (r.method === RECEIPT_METHOD.DOCTOR_PAYMENT) {
      return (
        consultantByPaymentReceiptId.get(r.id) ?? consultantByJournalRefId.get(r.id) ?? null
      );
    }
    if (r.method === RECEIPT_METHOD.DOCTOR_CANCEL && r.reversedReceiptId) {
      return (
        consultantByPaymentReceiptId.get(r.reversedReceiptId) ??
        consultantByJournalRefId.get(r.id) ??
        consultantByJournalRefId.get(r.reversedReceiptId) ??
        null
      );
    }
    return null;
  }

  const doctorPaymentRows: CashierSummaryReportLineItem[] = doctorPayments.map((r) => {
    const consultant = resolveDoctorConsultant(r);
    const amounts = receiptToAmountsDoctorPaymentNet(
      r.paymentMethod,
      r.amount,
      r.type,
      r.whd,
      r.paymentLines
    );
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

  // --- Income / Expense + Bank Ledger: methods BRANCH_INCOME, BRANCH_EXPENSE, BANK_DEPOSIT, BANK_WITHDRAW ---
  const incomeExpense = await prisma.receipt.findMany({
    where: {
      ...baseWhere,
      method: {
        in: [
          RECEIPT_METHOD.BRANCH_INCOME,
          RECEIPT_METHOD.BRANCH_EXPENSE,
          RECEIPT_METHOD.BANK_DEPOSIT,
          RECEIPT_METHOD.BANK_WITHDRAW,
        ],
      },
    },
    include: {
      paymentLines: { select: { paymentMethod: true, amount: true } },
      shift: { select: { id: true, startedAt: true, endedAt: true, user: { select: { id: true, name: true, staff: { select: { code: true } } } } } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const incomeExpenseRows: CashierSummaryReportLineItem[] = incomeExpense.map((r) => {
    const amounts = receiptToAmounts(r.paymentMethod, r.amount, r.type, r.paymentLines);
    const typeLabel =
      r.method === RECEIPT_METHOD.BRANCH_INCOME
        ? 'Income'
        : r.method === RECEIPT_METHOD.BRANCH_EXPENSE
          ? 'Expense'
          : r.method === RECEIPT_METHOD.BANK_DEPOSIT
            ? 'Bank Deposit'
            : 'Bank Withdraw';
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
    title: 'Income / Expenses / Bank Deposits - Bills',
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
