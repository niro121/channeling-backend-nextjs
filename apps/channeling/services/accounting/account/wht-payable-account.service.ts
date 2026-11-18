'use server';

/**
 * System-wide PAYABLE for withholding tax withheld on doctor payments (remittance liability).
 * Resolved by fixed account code so one GL account is reused across the institute.
 */

import prisma from '@/lib/prisma';
import type { Account } from '@/types/accounting';
import { mapAccount } from '../map-account';
import { WHT_PAYABLE_ACCOUNT_CODE, WHT_PAYABLE_NAME } from './wht-payable-account.constants';
import { createAccount } from './write.service';

export async function getOrCreateWhtPayableAccount(): Promise<
  { success: true; account: Account } | { success: false; error: string }
> {
  const byCode = await prisma.account.findUnique({
    where: { code: WHT_PAYABLE_ACCOUNT_CODE },
    include: {
      location: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true, code: true } },
      agency: { select: { id: true, name: true, code: true } },
      creditCustomer: { select: { id: true, name: true, code: true } },
    },
  });

  if (byCode) {
    if (byCode.type !== 'PAYABLE') {
      return {
        success: false,
        error: `Account code ${WHT_PAYABLE_ACCOUNT_CODE} exists but is not PAYABLE. Rename or fix in Accounting.`,
      };
    }
    if (!byCode.isActive) {
      const reactivated = await prisma.account.update({
        where: { id: byCode.id },
        data: { isActive: true },
        include: {
          location: { select: { id: true, name: true } },
          doctor: { select: { id: true, name: true, code: true } },
          agency: { select: { id: true, name: true, code: true } },
          creditCustomer: { select: { id: true, name: true, code: true } },
        },
      });
      return { success: true, account: mapAccount(reactivated) };
    }
    return { success: true, account: mapAccount(byCode) };
  }

  const created = await createAccount({
    name: WHT_PAYABLE_NAME,
    type: 'PAYABLE',
    code: WHT_PAYABLE_ACCOUNT_CODE,
    parentAccountId: null,
    locationId: null,
    doctorId: null,
    agencyId: null,
    creditCustomerId: null,
    userId: null,
    minBalanceAllowed: null,
  });

  if (created.success && created.account) {
    return { success: true, account: created.account };
  }

  if (!created.success && (created.error ?? '').includes('already exists')) {
    const retry = await prisma.account.findUnique({
      where: { code: WHT_PAYABLE_ACCOUNT_CODE },
      include: {
        location: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true, code: true } },
        agency: { select: { id: true, name: true, code: true } },
        creditCustomer: { select: { id: true, name: true, code: true } },
      },
    });
    if (retry && retry.type === 'PAYABLE') {
      if (!retry.isActive) {
        const reactivated = await prisma.account.update({
          where: { id: retry.id },
          data: { isActive: true },
          include: {
            location: { select: { id: true, name: true } },
            doctor: { select: { id: true, name: true, code: true } },
            agency: { select: { id: true, name: true, code: true } },
            creditCustomer: { select: { id: true, name: true, code: true } },
          },
        });
        return { success: true, account: mapAccount(reactivated) };
      }
      return { success: true, account: mapAccount(retry) };
    }
  }

  return {
    success: false,
    error: !created.success ? created.error : 'Could not create Withholding Tax Payable account.',
  };
}
