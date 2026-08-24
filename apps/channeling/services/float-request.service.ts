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
import {
  getAccountBalance,
  createJournalEntry,
  resolveTillForUserAndLocation,
  type ResolvedTill,
} from '@/services/accounting.service';
import { SHIFT_STATUS } from '@/types/shift';
import { formatCents } from '@/lib/format-money';
import type { Permissions } from '@/types/user-group';
import { getIO, floatRequestRoom, floatBalanceRoom } from '@/lib/socket-server';
import { createNotification } from '@/services/notification.service';
import { NOTIFICATION_TYPES, REFERENCE_TYPES as NOTIF_REF_TYPES } from '@/types/notification';
import type { ReferenceSelectOption } from '@/types/reference';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { allocateFloatDocumentNumber, ensureFloatDocumentNumber } from '@/services/float-request-sequence';

const FLOAT_REFERENCE_TYPE = 'FloatRequest';

const OPEN_SHIFT_STATUSES = [
  SHIFT_STATUS.ACTIVE,
  SHIFT_STATUS.PAUSED,
  SHIFT_STATUS.HANDOVER_PENDING,
] as const;

/**
 * Till float is taken from: the bulk cashier's current open shift location till.
 * Shift validity (expired / paused / handover) is enforced at approve time, not here,
 * so the modal can show the real till balance.
 */
export async function resolveBulkCashierSourceTill(userId: string): Promise<ResolvedTill | null> {
  const shift = await prisma.shift.findFirst({
    where: {
      userId,
      status: { in: [...OPEN_SHIFT_STATUSES] },
    },
    select: { locationId: true },
    orderBy: { startedAt: 'desc' },
  });
  if (!shift?.locationId) return null;
  return resolveTillForUserAndLocation(userId, shift.locationId);
}

export async function getBulkCashierSourceTillSummary(userId: string): Promise<{
  till: ResolvedTill | null;
  balanceCents: number;
}> {
  const till = await resolveBulkCashierSourceTill(userId);
  if (!till) return { till: null, balanceCents: 0 };
  const balanceCents = await getAccountBalance(till.accountId);
  return { till, balanceCents };
}

// --- getBulkCashierUsers: users who have Float Approve permission (any user, not just staff) ---
export async function getBulkCashierUsers(
  excludeUserId?: string | null
): Promise<{ id: string; name: string; email: string; isBulkCashier: boolean; staffCode: string | null }[]> {
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
    select: {
      id: true,
      name: true,
      email: true,
      userGroupId: true,
      staff: { select: { code: true } },
    },
    orderBy: { name: 'asc' },
  });

  return users
    .filter((u) => !excludeUserId || u.id !== excludeUserId)
    .map((u) => ({
      id: u.id,
      name: formatUserDisplayName(u.name || u.email, u.id, u.staff?.code),
      email: u.email,
      isBulkCashier: u.userGroupId ? groupIdsWithBulkCashierDashboard.has(u.userGroupId) : false,
      staffCode: u.staff?.code ?? null,
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

  let locationId: string | null = null;
  if (input.shiftId) {
    const shift = await prisma.shift.findUnique({
      where: { id: input.shiftId },
      select: { locationId: true },
    });
    locationId = shift?.locationId ?? null;
  }
  if (!locationId) {
    const requester = await prisma.user.findUnique({
      where: { id: input.requestedById },
      select: { userLocationId: true },
    });
    locationId = requester?.userLocationId ?? null;
  }

  const documentNumber = await allocateFloatDocumentNumber(locationId);
  if (!documentNumber) {
    return { success: false, error: 'Could not allocate a float document number. Please try again.' };
  }

  const row = await prisma.floatRequest.create({
    data: {
      requestedById: input.requestedById,
      bulkCashierId: input.bulkCashierId,
      status: FLOAT_REQUEST_STATUS.PENDING as never,
      amountRequested: input.amountRequested,
      denominationsRequested: input.denominationsRequested as object,
      shiftId: input.shiftId ?? null,
      floatNo: documentNumber.floatNo,
      floatNoString: documentNumber.floatNoString,
    } as never,
    include: includeFloatRequest(),
  });

  const requesterName = row.requestedBy?.name?.trim() || 'A cashier';
  const floatLabel = row.floatNoString ? ` ${row.floatNoString}` : '';
  await createNotification({
    userId: input.bulkCashierId,
    type: NOTIFICATION_TYPES.FloatRequested,
    title: 'Float request submitted to you',
    message: `${requesterName} requested LKR ${formatCents(input.amountRequested)}${floatLabel}. Approve or reject it.`,
    referenceType: NOTIF_REF_TYPES.FloatRequest,
    referenceId: row.id,
  });

  const io = getIO();
  if (io) {
    io.to(floatRequestRoom(input.bulkCashierId)).emit('float-request-update', {
      floatRequestId: row.id,
      status: FLOAT_REQUEST_STATUS.PENDING,
    });
  }

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

  return Promise.all(rows.map(withFloatDocumentNumber));
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

  return Promise.all(rows.map(withFloatDocumentNumber));
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

  return { data: await Promise.all(rows.map(withFloatDocumentNumber)), totalRecords };
}

export type GetFloatRequestsRequestedByUserPaginatedParams = {
  page?: number;
  limit?: number;
  status?: number | null;
  bulkCashierId?: string | null;
};

/** Paginated list of float requests submitted by this user (Float Transfers "Requested" tab). */
export async function getFloatRequestsRequestedByUserPaginated(
  requestedById: string,
  params: GetFloatRequestsRequestedByUserPaginatedParams = {}
) {
  const page = Math.max(0, params.page ?? 0);
  const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
  const where: { requestedById: string; status?: number; bulkCashierId?: string } = {
    requestedById,
  };
  if (params.status !== undefined && params.status !== null) where.status = params.status;
  if (params.bulkCashierId) where.bulkCashierId = params.bulkCashierId;

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

  return { data: await Promise.all(rows.map(withFloatDocumentNumber)), totalRecords };
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
  return row ? withFloatDocumentNumber(row) : null;
}

// --- getFloatRequestById ---
export async function getFloatRequestById(
  id: string
): Promise<FloatRequestType | null> {
  const row = await prisma.floatRequest.findUnique({
    where: { id },
    include: includeFloatRequest(),
  });
  return row ? withFloatDocumentNumber(row) : null;
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

  let fromTill: ResolvedTill | null = null;
  try {
    fromTill = await resolveBulkCashierSourceTill(input.approvedBy);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Cannot resolve your active till.',
      errorCode: 'NO_FLOAT_ACCOUNT',
    };
  }
  if (!fromTill) {
    return {
      success: false,
      error:
        'You need an active shift at a location to approve float requests.',
      errorCode: 'NO_FLOAT_ACCOUNT',
    };
  }

  const fromBalanceCents = await getAccountBalance(fromTill.accountId);
  if (fromBalanceCents < approvedTotalCents) {
    return {
      success: false,
      error: `Insufficient balance in your active till. Available: ${formatCents(fromBalanceCents)} LKR, required: ${formatCents(approvedTotalCents)} LKR.`,
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
    fromAccountId: fromTill.accountId,
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

  const mappedApproved = await withFloatDocumentNumber(updated);
  const printData: FloatRequestPrintData = {
    floatRequestId: updated.id,
    floatNoString: mappedApproved.floatNoString ?? null,
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

  return { success: true, floatRequest: mappedApproved, printData };
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
  return row ? withFloatDocumentNumber(row) : null;
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

/** Journal double-entry posted when a float request is received (null if not received / no journal). */
export type FloatRequestJournalDetail = {
  id: string;
  journalNumber: number | null;
  date: Date;
  description: string;
  lines: {
    accountId: string;
    accountName: string;
    accountCode: string | null;
    debitAmount: number;
    creditAmount: number;
  }[];
};

export async function getFloatRequestJournal(
  floatRequestId: string
): Promise<FloatRequestJournalDetail | null> {
  const fr = await prisma.floatRequest.findUnique({
    where: { id: floatRequestId },
    select: { journalId: true },
  });
  if (!fr?.journalId) return null;

  const journal = await prisma.journal.findUnique({
    where: { id: fr.journalId },
    include: {
      journalLines: {
        include: {
          account: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
  if (!journal) return null;

  return {
    id: journal.id,
    journalNumber: journal.journalNumber,
    date: journal.date,
    description: journal.description,
    lines: journal.journalLines.map((l) => ({
      accountId: l.accountId,
      accountName: l.account.name,
      accountCode: l.account.code ?? null,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
    })),
  };
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

  const requesterName = updated.requestedBy?.name?.trim() || 'The requester';
  await createNotification({
    userId: fr.bulkCashierId,
    type: NOTIFICATION_TYPES.FloatCancelled,
    title: 'Float request cancelled',
    message: `${requesterName} cancelled their pending float request.`,
    referenceType: NOTIF_REF_TYPES.FloatRequest,
    referenceId: updated.id,
  });

  const io = getIO();
  if (io) {
    io.to(floatRequestRoom(fr.bulkCashierId)).emit('float-request-update', {
      floatRequestId: updated.id,
      status: FLOAT_REQUEST_STATUS.CANCELLED,
    });
  }

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

/** Cancel leftover PENDING / APPROVED-unreceived float requests when a shift ends with no till to hand over. */
export async function cancelOpenFloatRequestsOnEmptyShiftEnd(
  userId: string
): Promise<{ cancelledIds: string[] }> {
  const open = await prisma.floatRequest.findMany({
    where: {
      requestedById: userId,
      status: { in: [FLOAT_REQUEST_STATUS.PENDING, FLOAT_REQUEST_STATUS.APPROVED] as never },
    },
    select: { id: true },
  });
  if (open.length === 0) return { cancelledIds: [] };

  const now = new Date();
  const cancelledIds = open.map((row) => row.id);
  await prisma.floatRequest.updateMany({
    where: { id: { in: cancelledIds } },
    data: {
      status: FLOAT_REQUEST_STATUS.CANCELLED as never,
      cancelledAt: now,
      cancelledBy: userId,
      cancelReason: 'Shift ended with no till balance. Unused float request cancelled.',
    },
  });

  const io = getIO();
  if (io) {
    for (const id of cancelledIds) {
      io.to(floatRequestRoom(userId)).emit('float-request-update', {
        floatRequestId: id,
        status: FLOAT_REQUEST_STATUS.CANCELLED,
      });
    }
  }

  return { cancelledIds };
}

export type OpenFloatsBlockingShiftEnd = {
  outgoingPending: number
  outgoingAwaitingReceive: number
  incomingPendingApproval: number
  incomingAwaitingReceive: number
}

export async function openFloatsBlockingTotal(blocking: OpenFloatsBlockingShiftEnd): Promise<number> {
  return (
    blocking.outgoingPending +
    blocking.outgoingAwaitingReceive +
    blocking.incomingPendingApproval +
    blocking.incomingAwaitingReceive
  )
}

export async function openFloatsBlockingMessage(
  blocking: OpenFloatsBlockingShiftEnd,
  action: "handover" | "end"
): Promise<string | null> {
  const total = await openFloatsBlockingTotal(blocking)
  if (total === 0) return null
  const parts: string[] = []
  if (blocking.outgoingPending > 0) {
    parts.push(
      `${blocking.outgoingPending} request(s) still waiting for bulk cashier approval (cancel it or wait until it is approved and received)`
    )
  }
  if (blocking.outgoingAwaitingReceive > 0) {
    parts.push(
      `${blocking.outgoingAwaitingReceive} approved float(s) you have not received yet (receive or decline them)`
    )
  }
  if (blocking.incomingPendingApproval > 0) {
    parts.push(
      `${blocking.incomingPendingApproval} request(s) waiting for you to approve or reject`
    )
  }
  if (blocking.incomingAwaitingReceive > 0) {
    parts.push(
      `${blocking.incomingAwaitingReceive} approved float(s) the cashier has not received yet`
    )
  }
  const verb = action === "end" ? "ending your shift" : "handing over"
  return `You have open float request(s): ${parts.join("; ")}. Finish them before ${verb}.`
}

/**
 * Open floats that block ending a shift / handing over:
 * pending approval, or approved but not yet received — as requester or as bulk cashier.
 */
export async function getOpenFloatsBlockingShiftEnd(
  userId: string
): Promise<OpenFloatsBlockingShiftEnd> {
  const rows = await prisma.floatRequest.findMany({
    where: {
      OR: [{ requestedById: userId }, { bulkCashierId: userId }],
      status: {
        notIn: [
          FLOAT_REQUEST_STATUS.RECEIVED,
          FLOAT_REQUEST_STATUS.REJECTED,
          FLOAT_REQUEST_STATUS.CANCELLED,
        ] as never,
      },
    },
    select: { requestedById: true, bulkCashierId: true, status: true },
  })

  const blocking: OpenFloatsBlockingShiftEnd = {
    outgoingPending: 0,
    outgoingAwaitingReceive: 0,
    incomingPendingApproval: 0,
    incomingAwaitingReceive: 0,
  }

  for (const row of rows) {
    const status = Number(row.status)
    const isRequester = row.requestedById === userId
    const isBulk = row.bulkCashierId === userId
    if (isRequester && status === FLOAT_REQUEST_STATUS.PENDING) blocking.outgoingPending += 1
    if (isRequester && status === FLOAT_REQUEST_STATUS.APPROVED) blocking.outgoingAwaitingReceive += 1
    if (isBulk && status === FLOAT_REQUEST_STATUS.PENDING) blocking.incomingPendingApproval += 1
    if (isBulk && status === FLOAT_REQUEST_STATUS.APPROVED) blocking.incomingAwaitingReceive += 1
  }

  return blocking
}

export type HandoverReceivedFloat = {
  id: string
  floatNoString?: string | null
  status: number
  direction: "in" | "out"
  amountRequested: number
  amountReceivedCents: number
  denominationsRequested: DenominationEntry[]
  denominationsApproved: DenominationEntry[] | null
  reasonForLessThanRequested: string | null
  createdAt: Date
  approvedAt: Date | null
  receivedAt: Date | null
  requestedBy: { id: string; name: string } | null
  bulkCashier: { id: string; name: string } | null
  receivedBy: { id: string; name: string } | null
}

/** Floats this cashier received (in) or issued as bulk (out) during the shift being handed over. */
export async function getReceivedFloatsForHandover(params: {
  cashierUserId: string
  shiftId: string
  shiftStartedAt: Date
  windowEnd: Date
}): Promise<HandoverReceivedFloat[]> {
  const inWindow = {
    gte: params.shiftStartedAt,
    lte: params.windowEnd,
  }
  const rows = await prisma.floatRequest.findMany({
    where: {
      OR: [
        { shiftId: params.shiftId },
        {
          requestedById: params.cashierUserId,
          createdAt: inWindow,
        },
        {
          bulkCashierId: params.cashierUserId,
          OR: [
            { createdAt: inWindow },
            { approvedAt: inWindow },
            { receivedAt: inWindow },
          ],
        },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      status: true,
      amountRequested: true,
      denominationsRequested: true,
      denominationsApproved: true,
      reasonForLessThanRequested: true,
      createdAt: true,
      approvedAt: true,
      receivedAt: true,
      floatNoString: true,
      requestedBy: { select: { id: true, name: true } },
      bulkCashier: { select: { id: true, name: true } },
      receivedBy: { select: { id: true, name: true } },
      shift: { select: { locationId: true } },
    },
  })

  const seen = new Set<string>()
  const unique = rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
  return Promise.all(
    unique.map(async (row) => {
      const approved = (row.denominationsApproved as DenominationEntry[] | null) ?? null
      const receivedCents = approved && approved.length > 0
        ? lkrToCents(denominationsTotalLKR(approved))
        : row.amountRequested
      const existingNo = (row as { floatNoString?: string | null }).floatNoString ?? null
      const floatNoString =
        existingNo ||
        (await ensureFloatDocumentNumber(
          row.id,
          (row as { shift?: { locationId?: string | null } | null }).shift?.locationId ?? null
        ))
      const requestedById = row.requestedBy?.id ?? null
      const bulkCashierId = row.bulkCashier?.id ?? null
      const isOut =
        bulkCashierId === params.cashierUserId && requestedById !== params.cashierUserId
      return {
        id: row.id,
        floatNoString,
        status: Number(row.status),
        direction: isOut ? "out" : "in",
        amountRequested: row.amountRequested,
        amountReceivedCents: receivedCents,
        denominationsRequested: (row.denominationsRequested as DenominationEntry[]) ?? [],
        denominationsApproved: approved,
        reasonForLessThanRequested: row.reasonForLessThanRequested ?? null,
        createdAt: row.createdAt,
        approvedAt: row.approvedAt,
        receivedAt: row.receivedAt,
        requestedBy: row.requestedBy ?? null,
        bulkCashier: row.bulkCashier ?? null,
        receivedBy: row.receivedBy ?? null,
      }
    })
  )
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
    shift: { select: { id: true, startedAt: true, locationId: true } },
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
    floatNo?: number | null;
    floatNoString?: string | null;
    requestedBy?: { id: string; name: string; email?: string } | null;
    bulkCashier?: { id: string; name: string; email?: string } | null;
    fromAccount?: { id: string; name: string; code: string | null } | null;
    toAccount?: { id: string; name: string; code: string | null } | null;
    toTill?: { id: string; locationId: string; accountId: string } | null;
    receivedBy?: { id: string; name: string } | null;
    shift?: { id: string; startedAt: Date; locationId?: string | null } | null;
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
    floatNo: row.floatNo ?? null,
    floatNoString: row.floatNoString ?? null,
    requestedBy: row.requestedBy ?? null,
    bulkCashier: row.bulkCashier ?? null,
    fromAccount: row.fromAccount ?? null,
    toAccount: row.toAccount ?? null,
    toTill: row.toTill ?? null,
    receivedBy: row.receivedBy ?? null,
    shift: row.shift ?? null,
  };
}

async function withFloatDocumentNumber(
  row: Parameters<typeof mapFloatRequest>[0]
): Promise<FloatRequestType> {
  const mapped = mapFloatRequest(row);
  if (mapped.floatNoString) return mapped;
  const locationId = row.shift?.locationId ?? row.toTill?.locationId ?? null;
  const no = await ensureFloatDocumentNumber(mapped.id, locationId);
  return no ? { ...mapped, floatNoString: no } : mapped;
}
