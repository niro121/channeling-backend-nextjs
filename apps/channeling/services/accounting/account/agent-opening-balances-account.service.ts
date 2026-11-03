'use server';

/**
 * System-wide control account for agency opening-balance migration.
 * Resolved by fixed account code so one GL account is reused across re-runs.
 */

import prisma from '@/lib/prisma';
import type { Account } from '@/types/accounting';
import { mapAccount } from '../map-account';
import {
  AGENT_OPENING_BALANCES_ACCOUNT_CODE,
  AGENT_OPENING_BALANCES_ACCOUNT_NAME,
  AGENT_OPENING_BALANCES_ACCOUNT_TYPE,
} from './agent-opening-balances-account.constants';
import { createAccount } from './write.service';

const include = {
  location: { select: { id: true, name: true } },
  doctor: { select: { id: true, name: true, code: true } },
  agency: { select: { id: true, name: true, code: true } },
  creditCustomer: { select: { id: true, name: true, code: true } },
} as const;

function isCorrectType(type: string): boolean {
  return type === AGENT_OPENING_BALANCES_ACCOUNT_TYPE;
}

export async function getOrCreateAgentOpeningBalancesAccount(): Promise<
  { success: true; account: Account } | { success: false; error: string }
> {
  const byCode = await prisma.account.findUnique({
    where: { code: AGENT_OPENING_BALANCES_ACCOUNT_CODE },
    include,
  });

  if (byCode) {
    if (!isCorrectType(byCode.type)) {
      return {
        success: false,
        error: `Account code ${AGENT_OPENING_BALANCES_ACCOUNT_CODE} exists but is not ${AGENT_OPENING_BALANCES_ACCOUNT_TYPE}. Rename or fix in Accounting.`,
      };
    }
    if (!byCode.isActive) {
      const reactivated = await prisma.account.update({
        where: { id: byCode.id },
        data: { isActive: true, name: AGENT_OPENING_BALANCES_ACCOUNT_NAME },
        include,
      });
      return { success: true, account: mapAccount(reactivated) };
    }
    return { success: true, account: mapAccount(byCode) };
  }

  const byName = await prisma.account.findFirst({
    where: { name: AGENT_OPENING_BALANCES_ACCOUNT_NAME },
    include,
  });
  if (byName) {
    if (!isCorrectType(byName.type)) {
      return {
        success: false,
        error: `Account "${AGENT_OPENING_BALANCES_ACCOUNT_NAME}" exists but is not ${AGENT_OPENING_BALANCES_ACCOUNT_TYPE}. Rename or fix in Accounting.`,
      };
    }
    const updated = await prisma.account.update({
      where: { id: byName.id },
      data: {
        isActive: true,
        code: byName.code ?? AGENT_OPENING_BALANCES_ACCOUNT_CODE,
      },
      include,
    });
    return { success: true, account: mapAccount(updated) };
  }

  const created = await createAccount({
    name: AGENT_OPENING_BALANCES_ACCOUNT_NAME,
    type: AGENT_OPENING_BALANCES_ACCOUNT_TYPE,
    code: AGENT_OPENING_BALANCES_ACCOUNT_CODE,
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
      where: { code: AGENT_OPENING_BALANCES_ACCOUNT_CODE },
      include,
    });
    if (retry && isCorrectType(retry.type)) {
      if (!retry.isActive) {
        const reactivated = await prisma.account.update({
          where: { id: retry.id },
          data: { isActive: true },
          include,
        });
        return { success: true, account: mapAccount(reactivated) };
      }
      return { success: true, account: mapAccount(retry) };
    }
  }

  return {
    success: false,
    error: !created.success
      ? created.error
      : `Could not create ${AGENT_OPENING_BALANCES_ACCOUNT_NAME} account.`,
  };
}
