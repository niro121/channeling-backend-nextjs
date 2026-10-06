'use server';

/**
 * One EXPENSE account per location for agency debit/credit note contra entries.
 * Looked up by code EA-{locationCode} so it stays distinct from Branch Expense (BE-).
 */

import prisma from '@/lib/prisma';
import type { Account } from '@/types/accounting';
import { mapAccount } from '../map-account';
import {
  expenseAdjustmentAccountCode,
  expenseAdjustmentAccountName,
  isExpenseAdjustmentAccount,
} from './expense-adjustment-account.constants';
import { createAccount } from './write.service';

const include = {
  location: { select: { id: true, name: true } },
  doctor: { select: { id: true, name: true, code: true } },
  agency: { select: { id: true, name: true, code: true } },
  creditCustomer: { select: { id: true, name: true, code: true } },
} as const;

export async function getOrCreateExpenseAdjustmentAccount(
  locationId: string
): Promise<{ success: true; account: Account } | { success: false; error: string }> {
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, name: true, code: true },
  });
  if (!location) {
    return { success: false, error: 'Location not found for expense adjustment account.' };
  }
  if (!location.code?.trim()) {
    return { success: false, error: 'Location code is required to create an expense adjustment account.' };
  }

  const code = expenseAdjustmentAccountCode(location.code);
  const name = expenseAdjustmentAccountName(location.name);

  const byCode = await prisma.account.findUnique({
    where: { code },
    include,
  });
  if (byCode) {
    if (byCode.type !== 'EXPENSE' || (byCode.locationId ?? null) !== location.id) {
      return {
        success: false,
        error: `Account code ${code} exists but is not this location's expense adjustment account. Rename or fix it in Accounting.`,
      };
    }
    if (!byCode.isActive) {
      const updated = await prisma.account.update({
        where: { id: byCode.id },
        data: { isActive: true },
        include,
      });
      return { success: true, account: mapAccount(updated) };
    }
    return { success: true, account: mapAccount(byCode) };
  }

  const forLocation = await prisma.account.findMany({
    where: { type: 'EXPENSE', locationId: location.id },
    include,
  });
  const match = forLocation.find((row) => isExpenseAdjustmentAccount(row));
  if (match) {
    const needsCode = !match.code;
    if (!match.isActive || needsCode) {
      const updated = await prisma.account.update({
        where: { id: match.id },
        data: {
          isActive: true,
          ...(needsCode ? { code } : {}),
        },
        include,
      });
      return { success: true, account: mapAccount(updated) };
    }
    return { success: true, account: mapAccount(match) };
  }

  const created = await createAccount({
    name,
    type: 'EXPENSE',
    code,
    parentAccountId: null,
    locationId: location.id,
    doctorId: null,
    agencyId: null,
    creditCustomerId: null,
    userId: null,
    minBalanceAllowed: null,
  });
  if (!created.success) return created;
  return { success: true, account: created.account };
}
