'use server';

import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import {
  buildCashierSummaryReportUrl,
  deriveHandoverCashierSummaryFilters,
} from '@/lib/handover-utils';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from '@/types/handover';
import type {
  CompletedHandoversReportQuery,
  CompletedHandoversReportRow,
} from '@/types/reports/completed-handovers';

const MAX_RANGE_DAYS = getReportMaxRangeDays('completed_handovers', 31);
const MAX_RECORDS = getReportMaxRecords('completed_handovers', 10000);

function normAll(v: string | undefined): string {
  const s = (v ?? '').trim();
  return s || '__all__';
}

function parseFromTo(dateFrom: string, dateTo: string): { start: Date; end: Date } | null {
  const start = parseReportDateTime(dateFrom, false);
  const end = parseReportDateTime(dateTo, true);
  if (!start || !end) return null;
  return { start, end };
}

function statusLabel(status: number): string {
  if (status === HANDOVER_STATUS.APPROVED) return 'Approved';
  if (status === HANDOVER_STATUS.REJECTED) return 'Rejected';
  if (status === HANDOVER_STATUS.CANCELLED) return 'Cancelled';
  if (status === HANDOVER_STATUS.PENDING) return 'Pending';
  return '—';
}

function reconciliationStatusLabel(status: number | null | undefined): string {
  const value = status ?? RECONCILIATION_STATUS.PENDING;
  if (value === RECONCILIATION_STATUS.IN_RECONCILIATION) return 'In reconciliation';
  if (value === RECONCILIATION_STATUS.RECONCILED_APPROVED) return 'Reconciled';
  if (value === RECONCILIATION_STATUS.RECONCILED_REJECTED) return 'Rejected';
  if (value === RECONCILIATION_STATUS.PENDING) return 'Pending';
  return '—';
}

function reconciliationStatusWhere(filter: string): Prisma.ShiftHandoverWhereInput | null {
  if (filter === 'pending') {
    return {
      OR: [{ reconciliationStatus: RECONCILIATION_STATUS.PENDING }, { reconciliationStatus: null }],
    };
  }
  if (filter === 'in_reconciliation') {
    return { reconciliationStatus: RECONCILIATION_STATUS.IN_RECONCILIATION };
  }
  if (filter === 'reconciled') {
    return { reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED };
  }
  if (filter === 'rejected') {
    return { reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_REJECTED };
  }
  return null;
}

function rowTotalCents(h: {
  cashCents: number;
  cardCents: number;
  slipCents: number;
  checkCents: number;
  creditCents: number;
  eWalletCents: number;
  totalCents: number;
}): number {
  const sum =
    h.cashCents + h.cardCents + h.slipCents + h.checkCents + h.creditCents + h.eWalletCents;
  return sum || h.totalCents || 0;
}

export async function getCompletedHandoversReportService(
  query: CompletedHandoversReportQuery
): Promise<{
  success: boolean;
  data: CompletedHandoversReportRow[];
  totalRecords: number;
  message?: string;
}> {
  const range = parseFromTo(query.dateFrom, query.dateTo);
  if (!range) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  const { start: from, end: to } = range;
  if (from.getTime() > to.getTime()) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: 'From date must be before or equal to to date.',
    };
  }

  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  const fromUserId = normAll(query.fromUserId);
  const toUserId = normAll(query.toUserId);
  const statusFilter = normAll(query.status).toLowerCase();
  const reconciliationFilter = normAll(query.reconciliationStatus).toLowerCase();

  let statusIn: number[] = [HANDOVER_STATUS.PENDING, HANDOVER_STATUS.APPROVED, HANDOVER_STATUS.REJECTED];
  if (statusFilter === 'pending') statusIn = [HANDOVER_STATUS.PENDING];
  else if (statusFilter === 'approved') statusIn = [HANDOVER_STATUS.APPROVED];
  else if (statusFilter === 'rejected') statusIn = [HANDOVER_STATUS.REJECTED];

  const reconWhere = reconciliationStatusWhere(reconciliationFilter);

  const where: Prisma.ShiftHandoverWhereInput = {
    createdAt: { gte: from, lte: to },
    status: { in: statusIn },
    ...(fromUserId !== '__all__' ? { fromUserId } : {}),
    ...(toUserId !== '__all__' ? { toUserId } : {}),
    ...(reconWhere ?? {}),
  };

  const totalRecords = await prisma.shiftHandover.count({ where });
  if (totalRecords > MAX_RECORDS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Too many records (${totalRecords.toLocaleString()}). Please narrow the date range or filters (max ${MAX_RECORDS.toLocaleString()}).`,
    };
  }

  const rows = await prisma.shiftHandover.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      fromUserId: true,
      toUserId: true,
      status: true,
      reconciliationStatus: true,
      cashCents: true,
      cardCents: true,
      slipCents: true,
      checkCents: true,
      creditCents: true,
      eWalletCents: true,
      totalCents: true,
      discrepancyReason: true,
      createdAt: true,
      approvedAt: true,
      rejectedAt: true,
      fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      toUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
      shift: { select: { id: true, startedAt: true, userId: true } },
    },
  });

  const data: CompletedHandoversReportRow[] = rows.map((h) => {
    const filters = deriveHandoverCashierSummaryFilters({
      fromUserId: h.fromUserId,
      createdAt: h.createdAt,
      shift: h.shift,
    });
    const cashierSummaryUrl = filters ? buildCashierSummaryReportUrl(filters, 'detail') : null;
    const completedAt = h.approvedAt ?? h.rejectedAt ?? null;

    return {
      id: h.id,
      fromUserId: h.fromUserId,
      fromUserName: formatUserDisplayName(h.fromUser?.name, h.fromUser?.id, h.fromUser?.staff?.code),
      toUserId: h.toUserId,
      toUserName: formatUserDisplayName(h.toUser?.name, h.toUser?.id, h.toUser?.staff?.code),
      shiftStartedAt: h.shift?.startedAt ?? null,
      cashCents: h.cashCents,
      cardCents: h.cardCents,
      slipCents: h.slipCents,
      checkCents: h.checkCents,
      creditCents: h.creditCents,
      eWalletCents: h.eWalletCents,
      totalCents: rowTotalCents(h),
      status: h.status,
      statusLabel: statusLabel(h.status),
      reconciliationStatus: h.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING,
      reconciliationStatusLabel: reconciliationStatusLabel(h.reconciliationStatus),
      createdAt: h.createdAt,
      completedAt,
      discrepancyReason: h.discrepancyReason,
      cashierSummaryUrl,
    };
  });

  return { success: true, data, totalRecords: data.length };
}
