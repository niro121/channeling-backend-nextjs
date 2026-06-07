'use server';

import prisma from '@/lib/prisma';
import type {
  FloatRequest as FloatRequestType,
  CreateFloatRequestInput,
  ApproveFloatRequestInput,
  RejectFloatRequestInput,
  CancelFloatRequestInput,
  ReceiveFloatRequestInput,
  DeclineApprovedFloatRequestInput,
  FloatRequestPrintData,
  DenominationEntry,
} from '@/types/float-request';
import {
  FLOAT_REQUEST_STATUS,
  denominationsTotalLKR,
  lkrToCents,
} from '@/types/float-request';
import { getAccountBalance, getCashAccountByUserId, createJournalEntry } from '@/services/accounting.service';
import { resolveTillForUserAndLocation } from '@/services/accounting.service';
import { formatCents } from '@/lib/format-money';
import type { Permissions } from '@/types/user-group';
import { getIO, floatRequestRoom, floatBalanceRoom } from '@/lib/socket-server';
import { createNotification } from '@/services/notification.service';
import { NOTIFICATION_TYPES, REFERENCE_TYPES as NOTIF_REF_TYPES } from '@/types/notification';
import type { ReferenceSelectOption } from '@/types/reference';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';

const FLOAT_REFERENCE_TYPE = 'FloatRequest';

// --- getBulkCashierUsers: users who have Float Approve permission (any user, not just staff) ---
export async function getBulkCashierUsers(
  excludeUserId?: string | null
): Promise<{ id: string; name: string; email: string; isBulkCashier: boolean }[]> {
  const groups = await prisma.userGroup.findMany({
    where: { status: 1 },
    select: { id: true, permissions: true },
  });

  const groupIdsWithFloatApprove = groups
    .filter((g) => {
      const p = g.permissions as Permissions | null;
      return p?.['bulk-cashier']?.['float-approve'] === true;
    })
    .map((g) => g.id);

  const groupIdsWithBulkCashierDashboard = new Set(
    groups
      .filter((g) => {
        const p = g.permissions as Permissions | null;
        return p?.['bulk-cashier']?.['bulk-cashier-dashboard'] === true;
      })
      .map((g) => g.id)
  );

  if (groupIdsWithFloatApprove.length === 0) return [];

  const users = await prisma.user.findMany({
    where: {
      userGroupId: { in: groupIdsWithFloatApprove },
      status: 1,
    },
    select: { id: true, name: true, email: true, userGroupId: true },
    orderBy: { name: 'asc' },
  });

  return users
    .filter((u) => !excludeUserId || u.id !== excludeUserId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isBulkCashier: u.userGroupId ? groupIdsWithBulkCashierDashboard.has(u.userGroupId) : false,
    }));
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
  if (input.requestedById === input.bulkCashierId) {
    return {
      success: false,
      error: 'You cannot request float from yourself. Select another bulk cashier.',
    };
  }

  const existingPending = await prisma.floatRequest.findFirst({
    where: { requestedById: input.requestedById, status: FLOAT_REQUEST_STATUS.PENDING as never },
    select: { id: true },
  });
  if (existingPending) {
    return { success: false, error: 'You already have a pending float request. Wait for it to be approved or rejected before requesting again.' };
  }

  const row = await prisma.floatRequest.create({
    data: {
      requestedById: input.requestedById,
      bulkCashierId: input.bulkCashierId,
      status: FLOAT_REQUEST_STATUS.PENDING as never,
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
  status?: number
) {
  const where: { bulkCashierId: string; status?: number } = {
    bulkCashierId,
  };
  if (status !== undefined) where.status = status;

  const rows = await prisma.floatRequest.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- status is Int in schema; Prisma client may lag
    where: where as any,
    include: includeFloatRequest(),
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapFloatRequest);
}

export type GetAllFloatRequestsForDashboardParams = {
  status?: number;
  requestedById?: string | null;
};

function applyFloatRequestRequestedByFilter(
  where: object,
  requestedById?: string | null
): object {
  if (!requestedById) return where;
  return { AND: [where, { requestedById }] };
}

type FloatRequestRequesterUser = {
  id: string;
  name: string | null;
  email: string | null;
  staff: { code: string | null } | null;
} | null;

function mapFloatRequestRequesterOption(
  requestedById: string,
  user: FloatRequestRequesterUser
): ReferenceSelectOption {
  return {
    id: requestedById,
    name: formatUserDisplayName(
      user?.name ?? user?.email,
      requestedById,
      user?.staff?.code
    ),
    code: user?.staff?.code ?? null,
  };
}

function collectFloatRequestRequesterOptions(
  rows: Array<{ requestedById: string; requestedBy: FloatRequestRequesterUser }>
): ReferenceSelectOption[] {
  const byId = new Map<string, ReferenceSelectOption>();
  for (const row of rows) {
    if (byId.has(row.requestedById)) continue;
    byId.set(row.requestedById, mapFloatRequestRequesterOption(row.requestedById, row.requestedBy));
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct users who have submitted float requests (Bulk Cashier dashboard filter). */
export async function getFloatRequestRequestersForDashboard(): Promise<ReferenceSelectOption[]> {
  const rows = await prisma.floatRequest.findMany({
    select: {
      requestedById: true,
      requestedBy: {
        select: { id: true, name: true, email: true, staff: { select: { code: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return collectFloatRequestRequesterOptions(rows);
}

/**
 * Float requests for Bulk Cashier dashboard: today's requests + all PENDING (any date).
 * So you see today's activity and never miss a pending request that needs action.
 * Approve/Reject only for requests assigned to current user (enforced in UI and approve/reject services).
 */
export async function getAllFloatRequestsForDashboard(
  params: GetAllFloatRequestsForDashboardParams = {}
) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const todayRange = { gte: startOfToday, lte: endOfToday };

  let where: object;
  if (params.status !== undefined) {
    if (params.status === FLOAT_REQUEST_STATUS.PENDING) {
      where = { status: FLOAT_REQUEST_STATUS.PENDING };
    } else {
      where = { status: params.status, createdAt: todayRange };
    }
  } else {
    where = {
      OR: [
        { status: FLOAT_REQUEST_STATUS.PENDING },
        { createdAt: todayRange },
      ],
    };
  }

  const rows = await prisma.floatRequest.findMany({
    where: applyFloatRequestRequestedByFilter(where, params.requestedById) as never,
    include: includeFloatRequest(),
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(mapFloatRequest);
}

export type GetFloatRequestsForBulkCashierPaginatedParams = {
  page?: number;
  limit?: number;
  status?: number | null;
  requestedById?: string | null;
};

/** Paginated list of float requests assigned to this bulk cashier (for Float Transfers dashboard). */
export async function getFloatRequestsForBulkCashierPaginated(
  bulkCashierId: string,
  params: GetFloatRequestsForBulkCashierPaginatedParams = {}
) {
  const page = Math.max(0, params.page ?? 0);
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
  const where: { bulkCashierId: string; status?: number; requestedById?: string } = {
    bulkCashierId,
  };
  if (params.status !== undefined && params.status !== null) where.status = params.status;
  if (params.requestedById) where.requestedById = params.requestedById;

  const [totalRecords, rows] = await Promise.all([
    prisma.floatRequest.count({ where: where as never }),
    prisma.floatRequest.findMany({
      where: where as never,
      include: includeFloatRequest(),
      orderBy: { createdAt: 'desc' },
      skip: page * limit,
      take: limit,
    }),
  ]);

  return { data: rows.map(mapFloatRequest), totalRecords };
}

// --- getPendingFloatRequestByUserId ---
export async function getPendingFloatRequestByUserId(
  userId: string
): Promise<FloatRequestType | null> {
  const row = await prisma.floatRequest.findFirst({
    where: { requestedById: userId, status: FLOAT_REQUEST_STATUS.PENDING as never },
    include: includeFloatRequest(),
    orderBy: { createdAt: 'desc' },
  });
  return row ? mapFloatRequest(row) : null;
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
  | { success: true; floatRequest: FloatRequestType; printData: FloatRequestPrintData }
  | { success: false; error: string; errorCode?: string }
> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: input.floatRequestId },
    include: { requestedBy: { select: { id: true, name: true } } },
  });
  if (!fr) return { success: false, error: 'Float request not found' };
  if (normalizeStatus((fr as { status: unknown }).status) !== FLOAT_REQUEST_STATUS.PENDING) {
    return { success: false, error: 'Request is no longer pending' };
  }
  if (fr.bulkCashierId !== input.approvedBy) {
    return { success: false, error: 'Only the assigned bulk cashier can approve' };
  }

  const approvedTotalLKR = denominationsTotalLKR(input.denominationsApproved);
  const approvedTotalCents = lkrToCents(approvedTotalLKR);
  if (approvedTotalCents <= 0) {
    return {
      success: false,
      error: 'Approved amount must be greater than zero',
      errorCode: 'INVALID_AMOUNT',
    };
  }
  if (approvedTotalCents > fr.amountRequested) {
    return {
      success: false,
      error: 'Cannot give more than requested. Approved total must not exceed the requested amount.',
      errorCode: 'EXCEEDS_REQUESTED',
    };
  }
  if (approvedTotalCents < fr.amountRequested) {
    const reason = input.reasonForLessThanRequested;
    if (!reason || !String(reason).trim()) {
      return {
        success: false,
        error: 'Reason for giving less than requested is required when approved amount is below the requested amount.',
        errorCode: 'REASON_FOR_LESS_REQUIRED',
      };
    }
  }

  // Source is always the bulk cashier's own float account (CASH account linked to approvedBy user)
  const fromAccount = await getCashAccountByUserId(input.approvedBy);
  if (!fromAccount) {
    return {
      success: false,
      error: 'You need a float account to approve requests. Create one from the Bulk Cashier page.',
      errorCode: 'NO_FLOAT_ACCOUNT',
    };
  }

  const fromBalanceCents = await getAccountBalance(fromAccount.id);
  if (fromBalanceCents < approvedTotalCents) {
    return {
      success: false,
      error: `Insufficient balance in source account. Available: ${formatCents(fromBalanceCents)} LKR, required: ${formatCents(approvedTotalCents)} LKR.`,
      errorCode: 'INSUFFICIENT_BALANCE',
    };
  }

  const requestShift = fr.shiftId
    ? await prisma.shift.findUnique({ where: { id: fr.shiftId }, select: { locationId: true } })
    : null;
  const requester = await prisma.user.findUnique({
    where: { id: fr.requestedById },
    select: { userLocationId: true },
  });
  const tillLocationId = requestShift?.locationId ?? requester?.userLocationId ?? null;
  if (!tillLocationId) {
    return { success: false, error: 'Cannot resolve requester location for till assignment.' };
  }
  const toTill = await resolveTillForUserAndLocation(fr.requestedById, tillLocationId);

  // 4-digit receive code for cashier to confirm receipt (double entry happens on receive)
  const receiveCode = String(Math.floor(1000 + Math.random() * 9000));

  const updateData = {
    status: FLOAT_REQUEST_STATUS.APPROVED,
    denominationsApproved: input.denominationsApproved as object,
    fromAccountId: fromAccount.id,
    toAccountId: toTill.accountId,
    toTillId: toTill.tillId,
    approvedAt: new Date(),
    approvedBy: input.approvedBy,
    receiveCode,
  };
  if (approvedTotalCents < fr.amountRequested && input.reasonForLessThanRequested) {
    (updateData as { reasonForLessThanRequested?: string }).reasonForLessThanRequested = String(input.reasonForLessThanRequested).trim();
  }
  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- status is Int in schema; Prisma client may lag
    data: updateData as any,
    include: includeFloatRequest(),
  });

  const printData: FloatRequestPrintData = {
    floatRequestId: updated.id,
    receiveCode,
    amountLKR: approvedTotalCents / 100,
    denominationsApproved: (input.denominationsApproved as DenominationEntry[]) ?? [],
    requestedByName: fr.requestedBy.name,
    bulkCashierName: (updated.bulkCashier?.name) ?? '',
    approvedAt: updated.approvedAt!.toISOString(),
  };

  const io = getIO();
  if (io) {
    io.to(floatRequestRoom(fr.requestedById)).emit('float-request-update', {
      floatRequestId: updated.id,
      status: FLOAT_REQUEST_STATUS.APPROVED,
    });
  }

  const bulkCashierName = (updated.bulkCashier as { name?: string } | null)?.name ?? 'Bulk cashier';
  await createNotification({
    userId: fr.requestedById,
    type: NOTIFICATION_TYPES.FloatApproved,
    title: 'Float request approved',
    message: `${bulkCashierName} approved your float request. Enter the code on your slip to receive it.`,
    referenceType: NOTIF_REF_TYPES.FloatRequest,
    referenceId: updated.id,
  });

  return { success: true, floatRequest: mapFloatRequest(updated), printData };
}

// --- getApprovedFloatRequestByUserId: APPROVED (not yet received) for cashier to confirm receipt ---
export async function getApprovedFloatRequestByUserId(
  userId: string
): Promise<FloatRequestType | null> {
  const row = await prisma.floatRequest.findFirst({
    where: { requestedById: userId, status: FLOAT_REQUEST_STATUS.APPROVED as never },
    include: includeFloatRequest(),
    orderBy: { approvedAt: 'desc' },
  });
  return row ? mapFloatRequest(row) : null;
}

// --- receiveFloatRequest: cashier enters code → create journal, set RECEIVED ---
export async function receiveFloatRequest(
  input: ReceiveFloatRequestInput
): Promise<
  | { success: true; floatRequest: FloatRequestType }
  | { success: false; error: string; errorCode?: string }
> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: input.floatRequestId },
    include: {
      requestedBy: { select: { id: true, name: true } },
      fromAccount: true,
      toAccount: true,
      toTill: { select: { id: true, accountId: true } },
    },
  });
  if (!fr) return { success: false, error: 'Float request not found' };
  if (normalizeStatus((fr as { status: unknown }).status) !== FLOAT_REQUEST_STATUS.APPROVED) {
    return { success: false, error: 'Only approved requests can be received.', errorCode: 'INVALID_STATUS' };
  }
  if (fr.requestedById !== input.receivedById) {
    return { success: false, error: 'Only the requesting cashier can confirm receipt.', errorCode: 'UNAUTHORIZED' };
  }
  const normalizedInput = input.receiveCode.trim().padStart(4, '0').slice(-4);
  const storedCode = (fr as { receiveCode?: string | null }).receiveCode ?? '';
  const normalizedStored = storedCode.trim().padStart(4, '0').slice(-4);
  if (normalizedInput !== normalizedStored) {
    return { success: false, error: 'Invalid receive code.', errorCode: 'INVALID_CODE' };
  }

  if (!fr.fromAccountId) {
    return { success: false, error: 'Float request missing source account.', errorCode: 'MISSING_SOURCE_ACCOUNT' };
  }

  // Ensure cashier has a float (CASH) account; use it for the journal (covers edge case where it wasn't created at approve)
  const toAccountId = fr.toAccountId ?? fr.toTill?.accountId ?? null;
  if (!toAccountId) {
    return {
      success: false,
      error: 'Approved float request is missing destination till account.',
      errorCode: 'MISSING_DESTINATION_ACCOUNT',
    };
  }

  const approvedDenoms = (fr.denominationsApproved as DenominationEntry[] | null) ?? [];
  const amountCents = lkrToCents(denominationsTotalLKR(approvedDenoms));
  if (amountCents <= 0) {
    return { success: false, error: 'Approved amount is missing or zero.' };
  }
  const fromBalanceCents = await getAccountBalance(fr.fromAccountId);
  if (fromBalanceCents < amountCents) {
    return {
      success: false,
      error: `Insufficient balance in source account. Available: ${formatCents(fromBalanceCents)} LKR.`,
      errorCode: 'INSUFFICIENT_BALANCE',
    };
  }

  const journalResult = await createJournalEntry({
    date: new Date(),
    description: `Float transfer to cashier (request ${fr.id.slice(-6)})`,
    referenceType: FLOAT_REFERENCE_TYPE,
    referenceId: fr.id,
    createdBy: input.receivedById,
    lines: [
      { accountId: toAccountId, debitAmount: amountCents, creditAmount: 0 },
      { accountId: fr.fromAccountId, debitAmount: 0, creditAmount: amountCents },
    ],
  });

  if (!journalResult.success) {
    return {
      success: false,
      error: journalResult.error,
      errorCode: journalResult.errorCode,
    };
  }

  const now = new Date();
  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: FLOAT_REQUEST_STATUS.RECEIVED as never,
      toAccountId,
      toTillId: fr.toTillId ?? fr.toTill?.id ?? null,
      journalId: journalResult.journalId,
      receivedAt: now,
      receivedById: input.receivedById,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- status/receivedAt are in schema; Prisma client may lag
    } as any,
    include: includeFloatRequest(),
  });

  const io = getIO();
  if (io) {
    io.to(floatBalanceRoom(fr.requestedById)).emit('float-balance-update', {});
  }

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
  if (normalizeStatus((fr as { status: unknown }).status) !== FLOAT_REQUEST_STATUS.PENDING) {
    return { success: false, error: 'Request is no longer pending' };
  }
  if (fr.bulkCashierId !== input.rejectedBy) {
    return { success: false, error: 'Only the assigned bulk cashier can reject' };
  }

  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: FLOAT_REQUEST_STATUS.REJECTED as never,
      rejectedAt: new Date(),
      rejectedBy: input.rejectedBy,
      rejectReason: input.reason,
    },
    include: includeFloatRequest(),
  });

  const io = getIO();
  if (io) {
    io.to(floatRequestRoom(fr.requestedById)).emit('float-request-update', {
      floatRequestId: updated.id,
      status: FLOAT_REQUEST_STATUS.REJECTED,
    });
  }

  await createNotification({
    userId: fr.requestedById,
    type: NOTIFICATION_TYPES.FloatRejected,
    title: 'Float request rejected',
    message: input.reason?.trim() ? `Reason: ${input.reason.trim()}` : undefined,
    referenceType: NOTIF_REF_TYPES.FloatRequest,
    referenceId: updated.id,
  });

  return { success: true, floatRequest: mapFloatRequest(updated) };
}

// --- cancelFloatRequest (only the requester can cancel, with reason) ---
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
  if (normalizeStatus((fr as { status: unknown }).status) !== FLOAT_REQUEST_STATUS.PENDING) {
    return { success: false, error: 'Request is no longer pending' };
  }
  if (fr.requestedById !== input.cancelledBy) {
    return { success: false, error: 'Only the requester can cancel their own float request' };
  }

  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: FLOAT_REQUEST_STATUS.CANCELLED as never,
      cancelledAt: new Date(),
      cancelledBy: input.cancelledBy,
      cancelReason: input.reason,
    },
    include: includeFloatRequest(),
  });

  return { success: true, floatRequest: mapFloatRequest(updated) };
}

// --- declineApprovedFloatRequest: cashier declines to receive (cancels handover; no journal entry) ---
export async function declineApprovedFloatRequest(
  input: DeclineApprovedFloatRequestInput
): Promise<
  | { success: true; floatRequest: FloatRequestType }
  | { success: false; error: string }
> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: input.floatRequestId },
  });
  if (!fr) return { success: false, error: 'Float request not found' };
  if (normalizeStatus((fr as { status: unknown }).status) !== FLOAT_REQUEST_STATUS.APPROVED) {
    return { success: false, error: 'Only an approved (not yet received) request can be declined.' };
  }
  if (fr.requestedById !== input.declinedBy) {
    return { success: false, error: 'Only the requesting cashier can decline to receive this float.' };
  }

  const updated = await prisma.floatRequest.update({
    where: { id: input.floatRequestId },
    data: {
      status: FLOAT_REQUEST_STATUS.CANCELLED as never,
      cancelledAt: new Date(),
      cancelledBy: input.declinedBy,
      cancelReason: input.reason.trim(),
    },
    include: includeFloatRequest(),
  });

  const io = getIO();
  if (io) {
    io.to(floatRequestRoom(fr.requestedById)).emit('float-request-update', {
      floatRequestId: updated.id,
      status: FLOAT_REQUEST_STATUS.CANCELLED,
    });
  }

  return { success: true, floatRequest: mapFloatRequest(updated) };
}

// --- helpers ---
function includeFloatRequest() {
  return {
    requestedBy: { select: { id: true, name: true, email: true } },
    bulkCashier: { select: { id: true, name: true, email: true } },
    fromAccount: { select: { id: true, name: true, code: true } },
    toAccount: { select: { id: true, name: true, code: true } },
    toTill: { select: { id: true, locationId: true, accountId: true } },
    receivedBy: { select: { id: true, name: true } },
    shift: { select: { id: true, startedAt: true } },
  };
}

function normalizeStatus(s: unknown): number {
  if (typeof s === 'number') return s;
  const n = (FLOAT_REQUEST_STATUS as Record<string, number>)[String(s)];
  return n !== undefined ? n : 0;
}

function mapFloatRequest(
  row: {
    id: string;
    requestedById: string;
    bulkCashierId: string;
    status: unknown;
    amountRequested: number;
    denominationsRequested: unknown;
    denominationsApproved: unknown;
    fromAccountId: string | null;
    toAccountId: string | null;
    toTillId?: string | null;
    shiftId: string | null;
    approvedAt: Date | null;
    approvedBy: string | null;
    rejectedAt: Date | null;
    rejectedBy: string | null;
    cancelledAt: Date | null;
    cancelledBy: string | null;
    rejectReason: string | null;
    cancelReason: string | null;
    reasonForLessThanRequested?: string | null;
    receiveCode?: string | null;
    receivedAt?: Date | null;
    receivedById?: string | null;
    journalId: string | null;
    createdAt: Date;
    updatedAt: Date;
    requestedBy?: { id: string; name: string; email?: string } | null;
    bulkCashier?: { id: string; name: string; email?: string } | null;
    fromAccount?: { id: string; name: string; code: string | null } | null;
    toAccount?: { id: string; name: string; code: string | null } | null;
    toTill?: { id: string; locationId: string; accountId: string } | null;
    receivedBy?: { id: string; name: string } | null;
    shift?: { id: string; startedAt: Date } | null;
  }
): FloatRequestType {
  const status = normalizeStatus(row.status);
  return {
    id: row.id,
    requestedById: row.requestedById,
    bulkCashierId: row.bulkCashierId,
    status,
    amountRequested: row.amountRequested,
    denominationsRequested: (row.denominationsRequested as DenominationEntry[]) ?? [],
    denominationsApproved: (row.denominationsApproved as DenominationEntry[] | null) ?? null,
    fromAccountId: row.fromAccountId,
    toAccountId: row.toAccountId,
    toTillId: row.toTillId ?? null,
    shiftId: row.shiftId,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    rejectReason: row.rejectReason,
    cancelReason: row.cancelReason,
    reasonForLessThanRequested: row.reasonForLessThanRequested ?? null,
    receiveCode: row.receiveCode ?? null,
    receivedAt: row.receivedAt ?? null,
    receivedById: row.receivedById ?? null,
    journalId: row.journalId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    requestedBy: row.requestedBy ?? null,
    bulkCashier: row.bulkCashier ?? null,
    fromAccount: row.fromAccount ?? null,
    toAccount: row.toAccount ?? null,
    toTill: row.toTill ?? null,
    receivedBy: row.receivedBy ?? null,
    shift: row.shift ?? null,
  };
}
