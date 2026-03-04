/**
 * Build double-entry journal input for a receipt. Used when saving/settling/refunding so that
 * receipt and journal are created in the same transaction (no saved receipt without journal).
 *
 * - Cash payment (method 1, paymentMethod 0): increase cashier float — Dr Cashier CASH, Cr Branch Cash Book.
 * - Cash refund (method 0, paymentMethod 0): decrease cashier float — Cr Cashier CASH, Dr Branch Cash Book.
 * - Agent payment (method 1, agencyId set): deduct agent balance — Dr Branch Cash Book, Cr Agent RECEIVABLE.
 * - Agent refund (method 0, agencyId set): reverse agent balance — Dr Agent RECEIVABLE, Cr Branch Cash Book.
 *
 * Receipt.amount is in rupees; journal lines use cents.
 */

import type { CreateJournalEntryInput } from '@/types/accounting';
import { REFERENCE_TYPES } from '@/types/accounting';
import type { CreatedReceipt } from './create-receipt-for-booking';

const RECEIPT_METHOD_REFUND = 0;
const RECEIPT_METHOD_PAYMENT = 1;
const PAYMENT_METHOD_CASH = 0;

export type ReceiptJournalAccounts = {
  /** Branch/location cash book (required for all receipt journals). */
  branchAccountId: string;
  /** Cashier CASH account (required for cash receipt/refund). */
  cashierAccountId?: string | null;
  /** Agent RECEIVABLE account (required for agent receipt/refund). */
  agentAccountId?: string | null;
};

/**
 * Build journal entry input for a receipt, or null if no ledger entry is needed
 * (e.g. card/slip only with no cash or agent).
 */
export function buildReceiptJournalEntryInput(
  receipt: CreatedReceipt,
  accounts: ReceiptJournalAccounts
): CreateJournalEntryInput | null {
  const amountCents = Math.round(Math.abs(receipt.amount) * 100);
  if (amountCents <= 0) return null;

  const descSuffix = receipt.receiptNoString
    ? ` - Receipt ${receipt.receiptNoString}`
    : '';

  const isPayment = receipt.method === RECEIPT_METHOD_PAYMENT;
  const isCash = receipt.paymentMethod === PAYMENT_METHOD_CASH;
  const hasAgent = Boolean(receipt.agencyId && accounts.agentAccountId);

  // Cash: affect cashier float
  if (isCash && accounts.cashierAccountId) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (cash)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0 },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    // Refund
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (cash)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Agent: affect agent receivable
  if (hasAgent) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (agent)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
          { accountId: accounts.agentAccountId!, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    // Refund
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (agent)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.agentAccountId!, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  return null;
}

/**
 * Resolve account IDs needed for receipt journal (call before transaction).
 * Returns null branchAccountId if locationId is null and no main cash book.
 */
export async function resolveReceiptJournalAccounts(params: {
  locationId: string | null;
  createdBy: string | null;
  agencyId: string | null;
  /** True if receipt is cash (paymentMethod 0); then we need cashier account. */
  isCash: boolean;
}): Promise<ReceiptJournalAccounts | null> {
  const { getOrCreateAccount, getCashBookAccountForBranch, getMainCashBookAccount } = await import(
    '@/services/accounting.service'
  );

  const branchAccount = params.locationId
    ? await getCashBookAccountForBranch(params.locationId)
    : await getMainCashBookAccount();
  if (!branchAccount) return null;

  let cashierAccountId: string | null = null;
  if (params.isCash && params.createdBy) {
    const res = await getOrCreateAccount({
      type: 'CASH',
      userId: params.createdBy,
      name: `Float - Cashier`,
      minBalanceAllowed: 0,
    });
    if (res.success) cashierAccountId = res.account.id;
  }

  let agentAccountId: string | null = null;
  if (params.agencyId) {
    const res = await getOrCreateAccount({
      type: 'RECEIVABLE',
      agencyId: params.agencyId,
    });
    if (res.success) agentAccountId = res.account.id;
  }

  return {
    branchAccountId: branchAccount.id,
    cashierAccountId: cashierAccountId ?? undefined,
    agentAccountId: agentAccountId ?? undefined,
  };
}
