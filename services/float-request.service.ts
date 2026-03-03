'use server';

import prisma from '@/lib/prisma';
import type {
  FloatRequest as FloatRequestType,
  CreateFloatRequestInput,
  ApproveFloatRequestInput,
  RejectFloatRequestInput,
  CancelFloatRequestInput,
  DenominationEntry,
} from '@/types/float-request';
import {
  denominationsTotalLKR,
  lkrToCents,
} from '@/types/float-request';
import { getOrCreateAccount, createJournalEntry } from '@/services/accounting.service';
import type { Permissions } from '@/types/user-group';

const FLOAT_REFERENCE_TYPE = 'FloatRequest';

// --- getBulkCashierUsers: users who have Float Approve (add) permission ---
export async function getBulkCashierUsers(): Promise<
  { id: string; name: string; email: string }[]
> {
  const groups = await prisma.userGroup.findMany({
    where: { status: 1 },
    select: { id: true, permissions: true },
  });

  const bulkCashierGroupIds = groups
    .filter((g) => {
      const p = g.permissions as Permissions | null;
      return p?.['bulk-cashier']?.add === true;
    })
    .map((g) => g.id);

  if (bulkCashierGroupIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      userGroupId: { in: bulkCashierGroupIds },
      status: 1,
    },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return users;
}

// --- createFloatRequest ---
export async function createFloatRequest(
  input: CreateFloatRequestInput
): Promise<
  { success: true; floatRequest: FloatRequestType } | { success: false; error: string }
> {
  const amountLKR = denominationsTotalLKR(input.denominationsRequested);
  const amountCents = lkrToCents(amountLKR);
  if (amountCents <= 0) {
    return { success: false, error: 'Total amount must be greater than zero' };
  }
  if (amountCents !== input.amountRequested) {
    return { success: false, error: 'Amount requested must match sum of denominations' };
  }

  const requestedByUser = await prisma.user.findUnique({
    where: { id: input.requestedById },
    select: { id: true },
  });
  if (!requestedByUser) return { success: false, error: 'Requesting user not found' };

  const bulkCashierUser = await prisma.user.findUnique({
    where: { id: input.bulkCashierId },
    select: { id: true },
  });
  if (!bulkCashierUser) return { success: false, error: 'Bulk cashier not found' };

  const row = await prisma.floatRequest.create({
    data: {
      requestedById: input.requestedById,
      bulkCashierId: input.bulkCashierId,
      status: 'PENDING',
      amountRequested: input.amountRequested,
      denominationsRequested: input.denominationsRequested as object,
      shiftId: input.shiftId ?? null,
    },
    include: includeFloatRequest(),
  });

  return { success: true, floatRequest: mapFloatRequest(row) };
}

// --- getFloatRequestsForBulkCashier ---
export async function getFloatRequestsForBulkCashier(
  bulkCashierId: string,
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
) {
  const where: { bulkCashierId: string; status?: typeof status } = {
    bulkCashierId,
  };
  if (status) where.status = status;

  const rows = await prisma.floatRequest.findMany({
    where,
    include: includeFloatRequest(),
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapFloatRequest);
}

// --- getFloatRequestById ---
export async function getFloatRequestById(
  id: string
): Promise<FloatRequestType | null> {
  const row = await prisma.floatRequest.findUnique({
    where: { id },
    include: includeFloatRequest(),
  });
  return row ? mapFloatRequest(row) : null;
}

// --- approveFloatRequest ---
export async function approveFloatRequest(
  input: ApproveFloatRequestInput
): Promise<
  | { success: true; floatRequest: FloatRequestType }
  | { success: false; error: string; errorCode?: string }
> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: input.floatRequestId },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
  if (!fr) return { success: false, error: 'Float request not found' };
  if (fr.status !== 'PENDING') {
    return { success: false, error: 'Request is no longer pending' };
  }
  if (fr.bulkCashierId !== input.approvedBy) {
    return { success: false, error: 'Only the assigned bulk cashier can approve' };
  }

  const approvedTotalLKR = denominationsTotalLKR(input.denominationsApproved);
  const approvedTotalCents = lkrToCents(approvedTotalLKR);
  if (approvedTotalCents < fr.amountRequested) {
    return {
      success: false,
      error: 'Approved denominations total cannot be less than requested amount',
      errorCode: 'INSUFFICIENT_AMOUNT',
    };
  }

  const fromAccount = await prisma.account.findFirst({
    where: { id: input.fromAccountId, type: 'CASH', isActive: true },
  });
  if (!fromAccount) {
    return { success: false, error: 'Selected source cash account not found' };
  }

  const cashierAccountResult = await getOrCreateAccount({
    type: 'CASH',
    userId: fr.requestedById,
    name: `Float - ${fr.requestedBy.name}`,
    minBalanceAllowed: 0,
  });
  if (!cashierAccountResult.success) {
    return { success: false, error: cashierAccountResult.error };
  }
  const toAccount = cashierAccountResult.account;

  const amountCents = approvedTotalCents;
  const journalResult = await createJournalEntry({
    date: new Date(),
    description: `Float transfer to cashier (request ${fr.id.slice(-6)})`,
    referenceType: FLOAT_REFERENCE_TYPE,
    referenceId: fr.id,
    createdBy: input.approvedBy,
    lines: [
      { accountId: toAccount.id, debitAmount: amountCents, creditAmount: 0 },
      { accountId: fromAccount.id, debitAmount: 0, creditAmount: amountCents },
    ],
  });

  if (!journalResult.success) {
    return {
      success: false,
      error: journalResult.error,
      errorCode: journalResult.errorCode,
    };
  }

  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: 'APPROVED',
      denominationsApproved: input.denominationsApproved as object,
      fromAccountId: input.fromAccountId,
      toAccountId: toAccount.id,
      approvedAt: new Date(),
      approvedBy: input.approvedBy,
      journalId: journalResult.journalId,
    },
    include: includeFloatRequest(),
  });

  return { success: true, floatRequest: mapFloatRequest(updated) };
}

// --- rejectFloatRequest ---
export async function rejectFloatRequest(
  input: RejectFloatRequestInput
): Promise<
  | { success: true; floatRequest: FloatRequestType }
  | { success: false; error: string }
> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: input.floatRequestId },
  });
  if (!fr) return { success: false, error: 'Float request not found' };
  if (fr.status !== 'PENDING') {
    return { success: false, error: 'Request is no longer pending' };
  }
  if (fr.bulkCashierId !== input.rejectedBy) {
    return { success: false, error: 'Only the assigned bulk cashier can reject' };
  }

  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: 'REJECTED',
      rejectedAt: new Date(),
      rejectedBy: input.rejectedBy,
      rejectReason: input.reason,
    },
    include: includeFloatRequest(),
  });

  return { success: true, floatRequest: mapFloatRequest(updated) };
}

// --- cancelFloatRequest (requested by cashier or bulk cashier, with reason) ---
export async function cancelFloatRequest(
  input: CancelFloatRequestInput
): Promise<
  | { success: true; floatRequest: FloatRequestType }
  | { success: false; error: string }
> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: input.floatRequestId },
  });
  if (!fr) return { success: false, error: 'Float request not found' };
  if (fr.status !== 'PENDING') {
    return { success: false, error: 'Request is no longer pending' };
  }
  const isRequestedBy = fr.requestedById === input.cancelledBy;
  const isBulkCashier = fr.bulkCashierId === input.cancelledBy;
  if (!isRequestedBy && !isBulkCashier) {
    return { success: false, error: 'Only the requester or bulk cashier can cancel' };
  }

  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelledBy: input.cancelledBy,
      cancelReason: input.reason,
    },
    include: includeFloatRequest(),
  });

  return { success: true, floatRequest: mapFloatRequest(updated) };
}

// --- helpers ---
function includeFloatRequest() {
  return {
    requestedBy: { select: { id: true, name: true, email: true } },
    bulkCashier: { select: { id: true, name: true, email: true } },
    fromAccount: { select: { id: true, name: true, code: true } },
    toAccount: { select: { id: true, name: true, code: true } },
    shift: { select: { id: true, startedAt: true } },
  };
}

function mapFloatRequest(row: {
  id: string;
  requestedById: string;
  bulkCashierId: string;
  status: string;
  amountRequested: number;
  denominationsRequested: unknown;
  denominationsApproved: unknown;
  fromAccountId: string | null;
  toAccountId: string | null;
  shiftId: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  rejectedAt: Date | null;
  rejectedBy: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  rejectReason: string | null;
  cancelReason: string | null;
  journalId: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { id: string; name: string; email?: string } | null;
  bulkCashier?: { id: string; name: string; email?: string } | null;
  fromAccount?: { id: string; name: string; code: string | null } | null;
  toAccount?: { id: string; name: string; code: string | null } | null;
  shift?: { id: string; startedAt: Date } | null;
}): FloatRequestType {
  return {
    id: row.id,
    requestedById: row.requestedById,
    bulkCashierId: row.bulkCashierId,
    status: row.status as FloatRequestType['status'],
    amountRequested: row.amountRequested,
    denominationsRequested: (row.denominationsRequested as DenominationEntry[]) ?? [],
    denominationsApproved: (row.denominationsApproved as DenominationEntry[] | null) ?? null,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    shiftId: row.shiftId,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    rejectReason: row.rejectReason,
    cancelReason: row.cancelReason,
    journalId: row.journalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requestedBy: row.requestedBy ?? null,
    bulkCashier: row.bulkCashier ?? null,
    fromAccount: row.fromAccount ?? null,
    toAccount: row.toAccount ?? null,
    shift: row.shift ?? null,
  };
}
