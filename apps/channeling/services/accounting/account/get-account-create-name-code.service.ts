'use server';

/**
 * get-account-create-name-code.service
 * ------------------------------------
 * Returns display name and code for a new Account when creating on demand (getOrCreateAccount).
 * Conventions match seed-accounting-accounts.ts so that accounts created at runtime look the same
 * as seeded ones (e.g. "Cash Book - Colombo", "DOC-DR0478", "Till - John (10001)").
 *
 * Each account type is tied to an entity (location, doctor, agency, etc.). We load that entity
 * and format name/code; if the entity is missing we return a safe default. For till (CASH + userId)
 * we also validate that the user has a linked staff and return an error if not.
 */

import type { PrismaClient } from '@prisma/client';
import { AccountType } from '@prisma/client';

/** Input: account type and whichever entity id applies (location, doctor, agency, credit customer, user). */
export type GetAccountCreateNameCodeParams = {
  type: AccountType;
  locationId?: string | null;
  doctorId?: string | null;
  agencyId?: string | null;
  creditCustomerId?: string | null;
  userId?: string | null;
};

/** Success: name and code to use. Failure: only for till when user has no staff (caller should show error). */
export type GetAccountCreateNameCodeResult =
  | { success: true; name: string; code: string | null }
  | { success: false; error: string };

/** Used when no entity is loaded (e.g. unknown id or type has no entity). */
const DEFAULTS: Record<AccountType, { name: string; code: string | null }> = {
  CASH: { name: 'Cash Book - Branch', code: null },
  PAYABLE: { name: 'Doctor Payable', code: null },
  RECEIVABLE: { name: 'Account', code: null },
  INCOME: { name: 'Income account', code: null },
  EXPENSE: { name: 'Expense account', code: null },
};

/**
 * Resolve name and code for a new account from the linked entity. Order matters: branch CASH
 * (locationId) is checked before till CASH (userId) so branch cash books get "Cash Book - {location}".
 */
export async function getAccountCreateNameAndCode(
  prisma: PrismaClient,
  params: GetAccountCreateNameCodeParams
): Promise<GetAccountCreateNameCodeResult> {
  const { type, locationId, doctorId, agencyId, creditCustomerId, userId } = params;

  // Branch income (P&L): optional per location. "Branch Income - {name}", "BI-{code}".
  if (type === 'INCOME' && locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { name: true, code: true },
    });
    if (location) {
      return {
        success: true,
        name: `Branch Income - ${location.name}`,
        code: location.code ? `BI-${location.code}` : null,
      };
    }
  }

  // Branch expense (P&L): optional per location. "Branch Expense - {name}", "BE-{code}".
  if (type === 'EXPENSE' && locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { name: true, code: true },
    });
    if (location) {
      return {
        success: true,
        name: `Branch Expense - ${location.name}`,
        code: location.code ? `BE-${location.code}` : null,
      };
    }
  }

  // Cashier till: one per user+location. Use location-aware code when available to avoid duplicates.
  // NOTE: this must run BEFORE branch cash-book naming, because till creation passes both userId and locationId.
  if (type === 'CASH' && userId) {
    const userWithStaff = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, staff: { select: { code: true } } },
    });
    const staffCode = userWithStaff?.staff?.code;
    if (!staffCode) {
      return {
        success: false,
        error: 'User must have a linked staff account to create a cashier float account.',
      };
    }
    const location = locationId
      ? await prisma.location.findUnique({
          where: { id: locationId },
          select: { name: true, code: true },
        })
      : null;
    const locationCode = location?.code?.trim() ?? null;
    const locationName = location?.name?.trim() ?? null;
    return {
      success: true,
      name:
        locationCode != null && locationCode.length > 0
          ? `Till - Cashier (${staffCode}) (${locationCode})`
          : `Till - Cashier (${staffCode})`,
      code:
        locationCode != null && locationCode.length > 0
          ? `STF-${staffCode.trim()}-${locationCode}`
          : `STF-${staffCode.trim()}`,
    };
  }

  // Branch cash book: one per location, under main cash book. Seed: "Cash Book - {name}", "CB-{code}".
  if (type === 'CASH' && locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { name: true, code: true },
    });
    if (location) {
      return {
        success: true,
        name: `Cash Book - ${location.name}`,
        code: location.code ? `CB-${location.code}` : null,
      };
    }
  }

  // Doctor payable: one per doctor. Seed: name = doctor.name, code = "DOC-{doctor.code}".
  if (type === 'PAYABLE' && doctorId) {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { name: true, code: true },
    });
    if (doctor) {
      return {
        success: true,
        name: doctor.name,
        code: doctor.code ? `DOC-${doctor.code}` : null,
      };
    }
  }

  // Agency payable (prepaid / liability to agent): one per agency. Seed: "Agent - {name}", "AGT-{code}" or "AGT-{id}" if no code.
  if (type === 'PAYABLE' && agencyId) {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { name: true, code: true, id: true },
    });
    if (agency) {
      const code = agency.code ? `AGT-${agency.code}` : `AGT-${agency.id}`;
      return {
        success: true,
        name: `Agent - ${agency.name}`,
        code,
      };
    }
  }

  // Credit customer receivable: one per credit customer. Seed: "Credit - {name}", code = customer.code or "CC-{id}".
  if (type === 'RECEIVABLE' && creditCustomerId) {
    const cc = await prisma.creditCustomer.findUnique({
      where: { id: creditCustomerId },
      select: { name: true, code: true, id: true },
    });
    if (cc) {
      const code = cc.code ?? `CC-${cc.id}`;
      return {
        success: true,
        name: `Credit - ${cc.name}`,
        code,
      };
    }
  }

  // No matching entity (e.g. type only, or entity not found): use default name/code for the type.
  const fallback = DEFAULTS[type];
  return { success: true, name: fallback.name, code: fallback.code };
}
