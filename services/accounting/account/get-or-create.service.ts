'use server';

/**
 * getOrCreateAccount
 * -----------------
 * Single entry point for "find or create" accounting accounts. Used whenever we need
 * an account that might already exist (e.g. from seed) or must be created on demand.
 *
 * Flow:
 * 1. One account lookup: find active account by (type + entity ids: location, doctor, agency, creditCustomer, userId).
 *    If found → return it. There is no second account lookup later.
 * 2. If not found → build create input (parent for branch CASH, default names/codes). For doctor PAYABLE we
 *    load Doctor to set name/code; for cashier till (userId) we load User+Staff to validate and set STF-{code}.
 *    Then create the account.
 *
 * Typical use:
 * - Doctor PAYABLE: type=PAYABLE, doctorId → used when posting channel booking payments (professional fee).
 * - Branch CASH: type=CASH, locationId → branch cash book (hospital fee).
 * - Cashier till: type=CASH, userId → till for a staff member (float).
 * - Agency PAYABLE: type=PAYABLE, agencyId (prepaid balance / liability to agent).
 * - Credit customer RECEIVABLE: type=RECEIVABLE, creditCustomerId.
 * - Branch INCOME / EXPENSE: type=INCOME|EXPENSE, optional locationId (profit and loss; no parent cash book).
 */

import prisma from '@/lib/prisma';
import type { Account, CreateAccountInput } from '@/types/accounting';
import { AccountType } from '@prisma/client';
import { getAccountCreateNameAndCode } from './get-account-create-name-code.service';
import { getMainCashBookAccount } from './read.service';
import { createAccount } from './write.service';
import { mapAccount } from '../map-account';

/** Till minimum balance allowed (cents). From env TILL_MIN_BALANCE_ALLOWED only. */
function getTillMinBalanceAllowed(): number | null {
  const raw = process.env.TILL_MIN_BALANCE_ALLOWED;
  if (raw === undefined || raw === '') return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

async function ensureTillParentBranchCashBook(locationId: string): Promise<
  { success: true; parentAccountId: string } | { success: false; error: string }
> {
  // Be tolerant to legacy duplicates: pick one active branch CASH account (non-till).
  // This keeps till resolution working while data cleanup can happen separately.
  const existingBranchAccounts = await prisma.account.findMany({
    where: {
      type: 'CASH',
      locationId,
      userId: null,
      isActive: true,
    },
    select: { id: true },
    orderBy: [{ createdAt: 'asc' }],
  });
  if (existingBranchAccounts.length > 0) {
    return { success: true, parentAccountId: existingBranchAccounts[0].id };
  }

  // If missing, create branch cash book using existing account creation path.
  const branchAccount = await getOrCreateAccount({ type: 'CASH', locationId });
  if (!branchAccount.success) {
    // If creation path failed because duplicates were detected concurrently,
    // re-read and pick one active branch account.
    const fallback = await prisma.account.findFirst({
      where: { type: 'CASH', locationId, userId: null, isActive: true },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (fallback) return { success: true, parentAccountId: fallback.id };
    return { success: false, error: branchAccount.error };
  }
  return { success: true, parentAccountId: branchAccount.account.id };
}

/** Parameters for getOrCreateAccount. type is required; entity ids identify which account (e.g. doctorId for doctor payable). */
export type GetOrCreateAccountParams = {
  type: AccountType;
  locationId?: string | null;
  doctorId?: string | null;
  agencyId?: string | null;
  creditCustomerId?: string | null;
  userId?: string | null;
  name?: string;
  code?: string | null;
  minBalanceAllowed?: number | null;
};

/**
 * Find an existing account by (type + entity ids) or create one if none exists.
 * Lookup criteria match seed-accounting-accounts so seeded accounts are reused.
 */
export async function getOrCreateAccount(
  params: GetOrCreateAccountParams
): Promise<{ success: true; account: Account } | { success: false; error: string }> {
  const { type, locationId, doctorId, agencyId, creditCustomerId, userId, name, code, minBalanceAllowed } =
    params;

  // Normalize IDs to string so Prisma/MongoDB matches correctly.
  const doctorIdStr = doctorId == null ? null : String(doctorId).trim() || null;

  // --- Step 1: Single lookup for an existing account (type + entity ids).
  //    Only include non-null entity ids in where. Prisma MongoDB can fail when where has many explicit nulls
  //    (e.g. type + doctorId + isActive works; adding locationId: null, agencyId: null, ... can return 0 rows).
  const where: {
    type: typeof type;
    isActive: boolean;
    locationId?: string | null;
    doctorId?: string | null;
    agencyId?: string | null;
    creditCustomerId?: string | null;
    userId?: string | null;
  } = { type, isActive: true };
  if (locationId != null) where.locationId = locationId;
  if (doctorIdStr != null) where.doctorId = doctorIdStr;
  if (agencyId != null) where.agencyId = agencyId;
  if (creditCustomerId != null) where.creditCustomerId = creditCustomerId;
  if (userId != null) where.userId = userId;

  const include = {
    location: { select: { id: true, name: true } },
    doctor: { select: { id: true, name: true, code: true } },
    agency: { select: { id: true, name: true, code: true } },
    creditCustomer: { select: { id: true, name: true, code: true } },
  };

  const rows = await prisma.account.findMany({
    where,
    take: 2,
    include,
  });

  if (rows.length > 1) {
    const first = rows[0];
    const name = first.name || `${type} account`;
    return {
      success: false,
      error: `More than one active account found for "${name}". A ${type.toLowerCase()} record cannot have more than one active account. Please deactivate duplicates in Accounting.`,
    };
  }

  const existing = rows[0] ?? null;

  if (existing) {
    // Self-heal legacy till accounts linked to Main Cash Book.
    if (type === 'CASH' && locationId && userId) {
      const parent = await ensureTillParentBranchCashBook(locationId);
      if (!parent.success) return parent;
      if ((existing.parentAccountId ?? null) !== parent.parentAccountId) {
        const updated = await prisma.account.update({
          where: { id: existing.id },
          data: { parentAccountId: parent.parentAccountId },
          include,
        });
        return { success: true, account: mapAccount(updated) };
      }
    }
    return { success: true, account: mapAccount(existing) };
  }

  // If only inactive account exists for same identity, reuse by re-activating.
  const inactiveRows = await prisma.account.findMany({
    where: { ...where, isActive: false },
    take: 2,
    include,
  });
  if (inactiveRows.length > 1) {
    return {
      success: false,
      error: `More than one inactive ${type.toLowerCase()} account found for this record. Please clean up duplicates in Accounting.`,
    };
  }
  if (inactiveRows.length === 1) {
    let parentAccountIdToSet: string | null | undefined;
    if (type === 'CASH' && locationId && userId) {
      const parent = await ensureTillParentBranchCashBook(locationId);
      if (!parent.success) return parent;
      parentAccountIdToSet = parent.parentAccountId;
    }
    const reactivated = await prisma.account.update({
      where: { id: inactiveRows[0].id },
      data: {
        isActive: true,
        ...(parentAccountIdToSet !== undefined ? { parentAccountId: parentAccountIdToSet } : {}),
      },
      include,
    });
    return { success: true, account: mapAccount(reactivated) };
  }

  // --- Step 2: Create path only (no account found). Name/code from helper (seed conventions).
  const nameCodeResult = await getAccountCreateNameAndCode(prisma, {
    type,
    locationId: locationId ?? undefined,
    doctorId: doctorIdStr ?? doctorId ?? undefined,
    agencyId: agencyId ?? undefined,
    creditCustomerId: creditCustomerId ?? undefined,
    userId: userId ?? undefined,
  });
  if (!nameCodeResult.success) {
    return { success: false, error: nameCodeResult.error };
  }

  let parentId: string | null = null;
  if (type === 'CASH' && locationId && userId) {
    const parent = await ensureTillParentBranchCashBook(locationId);
    if (!parent.success) return parent;
    parentId = parent.parentAccountId;
  } else if (type === 'CASH' && locationId) {
    const mainCash = await getMainCashBookAccount();
    parentId = mainCash?.id ?? null;
  }

  const createInput: CreateAccountInput = {
    name: name?.trim() || nameCodeResult.name,
    type,
    code: code ?? nameCodeResult.code,
    parentAccountId: parentId ?? null,
    locationId: locationId ?? null,
    doctorId: doctorIdStr ?? doctorId ?? null,
    agencyId: agencyId ?? null,
    creditCustomerId: creditCustomerId ?? null,
    userId: userId ?? null,
    minBalanceAllowed: minBalanceAllowed ?? null,
  };

  if (userId) {
    const tillMin = getTillMinBalanceAllowed();
    if (tillMin !== null) createInput.minBalanceAllowed = tillMin;
  }

  const result = await createAccount(createInput);
  if (!result.success) {
    // Code collision can happen with legacy till codes. Reuse account with same code when entity identity matches.
    if ((result.error ?? '').includes('already exists') && createInput.code) {
      const byCode = await prisma.account.findUnique({
        where: { code: createInput.code },
        include,
      });
      if (
        byCode &&
        byCode.type === type &&
        (byCode.locationId ?? null) === (locationId ?? null) &&
        (byCode.doctorId ?? null) === (doctorIdStr ?? doctorId ?? null) &&
        (byCode.agencyId ?? null) === (agencyId ?? null) &&
        (byCode.creditCustomerId ?? null) === (creditCustomerId ?? null) &&
        (byCode.userId ?? null) === (userId ?? null)
      ) {
        let parentAccountIdToSet: string | null | undefined;
        if (type === 'CASH' && locationId && userId) {
          const parent = await ensureTillParentBranchCashBook(locationId);
          if (!parent.success) return parent;
          parentAccountIdToSet = parent.parentAccountId;
        }
        const ensuredActive =
          byCode.isActive && parentAccountIdToSet === undefined
            ? byCode
            : await prisma.account.update({
                where: { id: byCode.id },
                data: {
                  isActive: true,
                  ...(parentAccountIdToSet !== undefined ? { parentAccountId: parentAccountIdToSet } : {}),
                },
                include,
              });
        return { success: true, account: mapAccount(ensuredActive) };
      }

      // Code is taken by a different record identity; retry with unique fallback code(s).
      const retry = await createAccountWithUniqueCodeRetry(createInput, {
        locationId: locationId ?? null,
        userId: userId ?? null,
        doctorId: doctorIdStr ?? doctorId ?? null,
        agencyId: agencyId ?? null,
        creditCustomerId: creditCustomerId ?? null,
      });
      if (retry.success) {
        return retry;
      }
      return retry;
    }
    return result;
  }
  return { success: true, account: result.account! };
}

function buildUniqueAccountCode(
  baseCode: string,
  ids: {
    locationId: string | null;
    userId: string | null;
    doctorId: string | null;
    agencyId: string | null;
    creditCustomerId: string | null;
  }
): string {
  const source =
    ids.locationId ??
    ids.userId ??
    ids.doctorId ??
    ids.agencyId ??
    ids.creditCustomerId ??
    `${Date.now()}`;
  const compact = source.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'AUTO';
  const normalizedBase = baseCode.trim().slice(0, 40);
  return `${normalizedBase}-${compact}`.slice(0, 50);
}

async function createAccountWithUniqueCodeRetry(
  createInput: CreateAccountInput,
  ids: {
    locationId: string | null;
    userId: string | null;
    doctorId: string | null;
    agencyId: string | null;
    creditCustomerId: string | null;
  }
): Promise<{ success: true; account: Account } | { success: false; error: string }> {
  const baseCode = createInput.code ?? '';
  const seed = Date.now().toString(36).toUpperCase();
  const candidates: string[] = [
    buildUniqueAccountCode(baseCode, ids),
    `${baseCode.slice(0, 38)}-${seed.slice(-4)}`.slice(0, 50),
    `${baseCode.slice(0, 36)}-${seed.slice(-4)}-1`.slice(0, 50),
    `${baseCode.slice(0, 36)}-${seed.slice(-4)}-2`.slice(0, 50),
  ];

  for (const codeCandidate of candidates) {
    const retry = await createAccount({ ...createInput, code: codeCandidate });
    if (retry.success) return retry;
    if (!(retry.error ?? '').includes('already exists')) {
      return retry;
    }
  }
  return {
    success: false,
    error:
      'Could not create till account because generated account codes are colliding. Please contact admin to clean duplicate account codes.',
  };
}
