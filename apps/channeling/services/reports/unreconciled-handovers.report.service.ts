'use server';

import moment from 'moment';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { formatCents, signedReceiptAmountToCents } from '@/lib/format-money';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { getReportMaxRecords } from '@/lib/report-limits';
import { getTillBalanceBreakdown } from '@/services/accounting/balance.service';
import {
  getFullChainByForwardedTo,
  getPreviousHandoversForHandoverDetail,
  type IncludedHandoverForDisplay,
} from '@/services/shift-handover.service';
import {
  getReceiptsForHandoverReconciliation,
  type ReceiptForReconciliation,
} from '@/services/reconciliation.service';
import { HANDOVER_STATUS, RECONCILIATION_STATUS } from '@/types/handover';
import { PAYMENT_METHOD_NAMES } from '@/types/receipt';
import {
  parseUnreconciledPaymentType,
  UNRECONCILED_DEDUCTED_METHODS,
  UNRECONCILED_TILL_ONLY_METHODS,
  type UnreconciledHandoversReportQuery,
  type UnreconciledHandoversReportRow,
} from '@/types/reports/unreconciled-handovers';

const MAX_RECORDS = getReportMaxRecords('unreconciled_handovers', 10000);
const LOAD_CONCURRENCY = 4;

type TopHandover = Prisma.ShiftHandoverGetPayload<{
  select: {
    id: true;
    fromUserId: true;
    toUserId: true;
    shiftId: true;
    status: true;
    reconciliationStatus: true;
    hasReconciliationIssues: true;
    forwardedToHandoverId: true;
    handoverNoString: true;
    reconciliationNoString: true;
    includedHandoverIds: true;
    createdAt: true;
    fromUser: { select: { id: true; name: true; staff: { select: { code: true } } } };
    shift: { select: { id: true; startedAt: true } };
  };
}>;

type ChainMember = {
  id: string;
  fromUserId: string;
  handoverNo: string | null;
  shiftId: string;
  shiftStartedAt: Date;
  createdAt: Date;
};

function reconciliationStatusLabel(status: number | null | undefined): string {
  const value = status ?? RECONCILIATION_STATUS.PENDING;
  if (value === RECONCILIATION_STATUS.IN_RECONCILIATION) return 'In reconciliation';
  if (value === RECONCILIATION_STATUS.RECONCILED_APPROVED) return 'Reconciled';
  if (value === RECONCILIATION_STATUS.RECONCILED_REJECTED) return 'Rejected';
  if (value === RECONCILIATION_STATUS.PENDING) return 'Not sent';
  return '—';
}

function stillHoldsUndeductedMoney(handover: {
  forwardedToHandoverId: string | null;
  reconciliationStatus: number | null;
  hasReconciliationIssues: boolean | null;
}): boolean {
  if (handover.forwardedToHandoverId) return false;
  const status = handover.reconciliationStatus ?? RECONCILIATION_STATUS.PENDING;
  if (status === RECONCILIATION_STATUS.RECONCILED_APPROVED) {
    return handover.hasReconciliationIssues === true;
  }
  return (
    status === RECONCILIATION_STATUS.PENDING ||
    status === RECONCILIATION_STATUS.IN_RECONCILIATION ||
    status === RECONCILIATION_STATUS.RECONCILED_REJECTED
  );
}

function lineWhy(receipt: ReceiptForReconciliation, reconciliationStatus: number | null): string {
  if (receipt.cannotReconcileAt) {
    const reason = (receipt.cannotReconcileReason ?? '').trim();
    return reason ? `Can't reconcile: ${reason}` : "Can't reconcile";
  }
  const status = reconciliationStatus ?? RECONCILIATION_STATUS.PENDING;
  if (status === RECONCILIATION_STATUS.RECONCILED_REJECTED) return 'Rejected';
  if (status === RECONCILIATION_STATUS.PENDING) return 'Not sent';
  return 'Open';
}

function lineReference(receipt: ReceiptForReconciliation): string {
  const parts = [receipt.cardReference, receipt.slipReference, receipt.slipDate]
    .map((part) => (part ?? '').trim())
    .filter(Boolean);
  return parts.join(' · ');
}

function methodBreakdown(lines: Array<{ paymentMethod: number; amountCents: number }>): string {
  const totals = new Map<number, number>();
  for (const line of lines) {
    totals.set(line.paymentMethod, (totals.get(line.paymentMethod) ?? 0) + line.amountCents);
  }
  const parts = UNRECONCILED_DEDUCTED_METHODS.map((method) => {
    const cents = totals.get(method.method) ?? 0;
    if (cents === 0) return null;
    return `${method.label} ${formatCents(cents)}`;
  }).filter((part): part is string => Boolean(part));
  return parts.join(' · ');
}

function memberFromIncluded(handover: IncludedHandoverForDisplay): ChainMember | null {
  const shiftId = handover.shift?.id ?? handover.shiftId;
  if (!shiftId) return null;
  return {
    id: handover.id,
    fromUserId: handover.fromUserId,
    handoverNo: handover.handoverNoString,
    shiftId,
    shiftStartedAt: handover.shift?.startedAt ?? handover.createdAt,
    createdAt: handover.createdAt,
  };
}

async function chainForHandover(handover: TopHandover): Promise<ChainMember[]> {
  let included = await getPreviousHandoversForHandoverDetail({
    handoverId: handover.id,
    shiftId: handover.shiftId,
    includedHandoverIds: handover.includedHandoverIds,
  });
  if (included.length === 0) {
    included = await getFullChainByForwardedTo(handover.id);
  }
  const top: ChainMember = {
    id: handover.id,
    fromUserId: handover.fromUserId,
    handoverNo: handover.handoverNoString,
    shiftId: handover.shift?.id ?? handover.shiftId,
    shiftStartedAt: handover.shift?.startedAt ?? handover.createdAt,
    createdAt: handover.createdAt,
  };
  const rest = included
    .filter((item) => item.id !== handover.id)
    .map(memberFromIncluded)
    .filter((item): item is ChainMember => item != null);
  return [top, ...rest];
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

export async function getUnreconciledHandoversReportService(
  query: UnreconciledHandoversReportQuery
): Promise<{
  success: boolean;
  data: UnreconciledHandoversReportRow[];
  totalRecords: number;
  message?: string;
}> {
  const userId = (query.userId ?? '').trim();
  if (!userId || userId === '__all__') {
    return { success: false, data: [], totalRecords: 0, message: 'Select a user.' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, staff: { select: { code: true } } },
  });
  if (!user) {
    return { success: false, data: [], totalRecords: 0, message: 'User not found.' };
  }

  const userName = formatUserDisplayName(user.name, user.id, user.staff?.code);
  const paymentMethod = parseUnreconciledPaymentType(query.paymentMethod);
  if (Number.isNaN(paymentMethod)) {
    return { success: false, data: [], totalRecords: 0, message: 'Select a payment type.' };
  }
  const tillOnly =
    paymentMethod != null &&
    UNRECONCILED_TILL_ONLY_METHODS.some((method) => method.method === paymentMethod);

  const [breakdown, handovers] = await Promise.all([
    getTillBalanceBreakdown(userId),
    tillOnly
      ? Promise.resolve([] as TopHandover[])
      : prisma.shiftHandover.findMany({
      where: {
        status: HANDOVER_STATUS.APPROVED,
        AND: [
          { OR: [{ toUserId: userId }, { reconciliationRequestedBy: userId }] },
          {
            OR: [
              { forwardedToHandoverId: null },
              { forwardedToHandoverId: { isSet: false } },
            ],
          },
          {
            OR: [
              {
                reconciliationStatus: {
                  in: [
                    RECONCILIATION_STATUS.PENDING,
                    RECONCILIATION_STATUS.IN_RECONCILIATION,
                    RECONCILIATION_STATUS.RECONCILED_REJECTED,
                  ],
                },
              },
              { reconciliationStatus: null },
              { reconciliationStatus: { isSet: false } },
              {
                reconciliationStatus: RECONCILIATION_STATUS.RECONCILED_APPROVED,
                hasReconciliationIssues: true,
              },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fromUserId: true,
        toUserId: true,
        shiftId: true,
        status: true,
        reconciliationStatus: true,
        hasReconciliationIssues: true,
        forwardedToHandoverId: true,
        handoverNoString: true,
        reconciliationNoString: true,
        includedHandoverIds: true,
        createdAt: true,
        fromUser: { select: { id: true, name: true, staff: { select: { code: true } } } },
        shift: { select: { id: true, startedAt: true } },
      },
    }),
  ]);

  const openHandovers = handovers.filter(stillHoldsUndeductedMoney);

  const loaded = await mapPool(openHandovers, LOAD_CONCURRENCY, async (handover) => {
    const members = await chainForHandover(handover);
    const receiptLists = await Promise.all(
      members.map((member) =>
        getReceiptsForHandoverReconciliation(
          member.shiftId,
          member.fromUserId,
          member.shiftStartedAt,
          member.createdAt,
          member.id,
          handover.id
        )
      )
    );
    const lines: Array<{
      receipt: ReceiptForReconciliation;
      sourceHandoverNo: string;
      amountCents: number;
    }> = [];
    receiptLists.forEach((receipts, index) => {
      const member = members[index]!;
      for (const receipt of receipts) {
        if (receipt.reconciledAt) continue;
        if (paymentMethod != null && receipt.paymentMethod !== paymentMethod) continue;
        const canceled = receipt.canceledAt ? ' (canceled)' : '';
        lines.push({
          receipt: {
            ...receipt,
            receiptNoString: `${receipt.receiptNoString}${canceled}`,
          },
          sourceHandoverNo: member.id === handover.id ? '' : member.handoverNo?.trim() || 'Included',
          amountCents: signedReceiptAmountToCents(receipt.amount, receipt.type),
        });
      }
    });
    return { handover, lines };
  });

  const seenLineIds = new Set<string>();
  const blocks = loaded
    .map((block) => ({
      handover: block.handover,
      lines: block.lines.filter((line) => {
        if (seenLineIds.has(line.receipt.id)) return false;
        seenLineIds.add(line.receipt.id);
        return true;
      }),
    }))
    .filter((block) => block.lines.length > 0);
  const itemCount = blocks.reduce((sum, block) => sum + block.lines.length, 0);
  if (itemCount > MAX_RECORDS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Too many unreconciled lines (${itemCount.toLocaleString()}). Max ${MAX_RECORDS.toLocaleString()}.`,
    };
  }

  const undeductedByMethod = new Map<number, number>();
  for (const block of blocks) {
    for (const line of block.lines) {
      const method = line.receipt.paymentMethod;
      undeductedByMethod.set(method, (undeductedByMethod.get(method) ?? 0) + line.amountCents);
    }
  }

  const tillLabel = [breakdown.tillAccountCode, breakdown.tillAccountName].filter(Boolean).join(' ');
  const balanceGroupLabel = tillLabel
    ? `${userName} · Till ${tillLabel}`
    : `${userName} · No till account`;

  const rows: UnreconciledHandoversReportRow[] = [];

  for (const method of UNRECONCILED_DEDUCTED_METHODS) {
    if (paymentMethod != null && paymentMethod !== method.method) continue;
    const tillCents = breakdown[method.tillKey];
    const undeductedCents = undeductedByMethod.get(method.method) ?? 0;
    const differenceCents = tillCents - undeductedCents;
    rows.push({
      id: `balance-${method.method}`,
      groupKey: 'balance',
      groupLabel: balanceGroupLabel,
      rowKind: 'balance',
      methodLabel: method.label,
      tillCents,
      undeductedCents,
      differenceCents,
      note:
        differenceCents === 0
          ? 'Explained by undeducted handover lines'
          : 'Not explained by undeducted handover lines',
      handoverNo: '',
      reconciliationNo: '',
      fromUserName: '',
      createdAt: '',
      reconciliationStatusLabel: '',
      receiptNo: '',
      sourceHandoverNo: '',
      bank: '',
      reference: '',
      amountCents: null,
      why: '',
    });
  }

  for (const method of UNRECONCILED_TILL_ONLY_METHODS) {
    if (paymentMethod != null && paymentMethod !== method.method) continue;
    rows.push({
      id: `balance-${method.tillKey}`,
      groupKey: 'balance',
      groupLabel: balanceGroupLabel,
      rowKind: 'balance',
      methodLabel: method.label,
      tillCents: breakdown[method.tillKey],
      undeductedCents: null,
      differenceCents: null,
      note: method.note,
      handoverNo: '',
      reconciliationNo: '',
      fromUserName: '',
      createdAt: '',
      reconciliationStatusLabel: '',
      receiptNo: '',
      sourceHandoverNo: '',
      bank: '',
      reference: '',
      amountCents: null,
      why: '',
    });
  }

  for (const block of blocks) {
    const handover = block.handover;
    const fromUserName = formatUserDisplayName(
      handover.fromUser?.name,
      handover.fromUserId,
      handover.fromUser?.staff?.code
    );
    const handoverNo = handover.handoverNoString?.trim() || '—';
    const reconciliationNo = handover.reconciliationNoString?.trim() || '—';
    const createdAt = moment(handover.createdAt).format('YYYY-MM-DD HH:mm');
    const statusLabel = reconciliationStatusLabel(handover.reconciliationStatus);
    const breakdownLabel = methodBreakdown(
      block.lines.map((line) => ({
        paymentMethod: line.receipt.paymentMethod,
        amountCents: line.amountCents,
      }))
    );
    const groupLabel = [
      `Handover ${handoverNo}`,
      `Recon ${reconciliationNo}`,
      `From ${fromUserName}`,
      createdAt,
      statusLabel,
      breakdownLabel,
    ]
      .filter(Boolean)
      .join(' · ');
    const handoverTotal = block.lines.reduce((sum, line) => sum + line.amountCents, 0);

    for (const line of block.lines) {
      rows.push({
        id: `item-${handover.id}-${line.receipt.id}`,
        groupKey: handover.id,
        groupLabel,
        rowKind: 'item',
        methodLabel: PAYMENT_METHOD_NAMES[line.receipt.paymentMethod] ?? '—',
        tillCents: null,
        undeductedCents: null,
        differenceCents: null,
        note: '',
        handoverNo,
        reconciliationNo,
        fromUserName,
        createdAt,
        reconciliationStatusLabel: statusLabel,
        receiptNo: line.receipt.receiptNoString,
        sourceHandoverNo: line.sourceHandoverNo,
        bank: (line.receipt.bank ?? '').trim(),
        reference: lineReference(line.receipt),
        amountCents: line.amountCents,
        why: lineWhy(line.receipt, handover.reconciliationStatus),
      });
    }

    rows.push({
      id: `subtotal-${handover.id}`,
      groupKey: handover.id,
      groupLabel,
      rowKind: 'subtotal',
      methodLabel: '',
      tillCents: null,
      undeductedCents: null,
      differenceCents: null,
      note: '',
      handoverNo,
      reconciliationNo,
      fromUserName,
      createdAt,
      reconciliationStatusLabel: statusLabel,
      receiptNo: '',
      sourceHandoverNo: '',
      bank: '',
      reference: '',
      amountCents: handoverTotal,
      why: breakdownLabel,
    });
  }

  return { success: true, data: rows, totalRecords: itemCount };
}
