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
    return { success: true, account: mapAccount(existing) };
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

  const mainCash = type === 'CASH' && !locationId ? null : await getMainCashBookAccount();
  const parentId =
    type === 'CASH' && locationId && mainCash ? mainCash.id : null;

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
  if (!result.success) return result;
  return { success: true, account: result.account! };
}
