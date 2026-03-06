/**
 * Build double-entry journal input for a receipt. Used when saving/settling/refunding so that
 * receipt and journal are created in the same transaction (no saved receipt without journal).
 *
 * - Cash payment (RECEIPT_METHOD.PAYMENT, RECEIPT_PAYMENT_METHOD.CASH): increase cashier float — Dr Cashier CASH, Cr Branch Cash Book.
 * - Cash refund (RECEIPT_METHOD.REFUND, RECEIPT_PAYMENT_METHOD.CASH): decrease cashier float — Cr Cashier CASH, Dr Branch Cash Book.
 * - Agent payment (RECEIPT_METHOD.PAYMENT, RECEIPT_PAYMENT_METHOD.AGENT): increase receivable (agency owes us) — Dr Agent RECEIVABLE, Cr Branch Cash Book.
 * - Agent refund (RECEIPT_METHOD.REFUND, RECEIPT_PAYMENT_METHOD.AGENT): reverse — Cr Agent RECEIVABLE, Dr Branch Cash Book.
 *
 * Receipt.amount is in rupees; journal lines use cents.
 */

import type { CreateJournalEntryInput } from '@/types/accounting';
import { REFERENCE_TYPES } from '@/types/accounting';
import { RECEIPT_METHOD, RECEIPT_PAYMENT_METHOD } from '@/types/receipt';
import type { CreatedReceipt } from './create-receipt-for-booking';

export type ReceiptJournalAccounts = {
  /** Branch/location cash book (required for all receipt journals). */
  branchAccountId: string;
  /** Cashier CASH account (required for cash receipt/refund). */
  cashierAccountId?: string | null;
  /** Agent RECEIVABLE account (required for agent receipt/refund). */
  agentAccountId?: string | null;
  /** Credit Customer RECEIVABLE account (required for credit customer receipt/refund). */
  creditCustomerAccountId?: string | null;
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

  const isPayment = receipt.method === RECEIPT_METHOD.PAYMENT;
  const isCash = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH;
  const hasAgent =
    receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.AGENT && Boolean(accounts.agentAccountId);

  // Till: cash — affect cashier till with paymentMethod 0
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
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (cash)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
      ],
    };
  }

  // Till: card — channel payment/refund
  const isCard = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD;
  if (isCard && accounts.cashierAccountId) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (card)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CREDIT_CARD },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (card)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CREDIT_CARD },
      ],
    };
  }

  // Till: slip — channel payment/refund
  const isSlip = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP;
  if (isSlip && accounts.cashierAccountId) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (slip)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.SLIP },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (slip)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.SLIP },
      ],
    };
  }

  // Till: check — channel payment/refund
  const isCheck = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CHECK;
  if (isCheck && accounts.cashierAccountId) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (check)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CHECK },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (check)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CHECK },
      ],
    };
  }

  // Credit Customer (receivable) — channel payment/refund (like Agent; deduct from credit customer balance)
  const hasCreditCustomer =
    receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT && Boolean(accounts.creditCustomerAccountId);
  if (hasCreditCustomer) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (credit customer)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
          { accountId: accounts.creditCustomerAccountId!, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (credit customer)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.creditCustomerAccountId!, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Till: credit (generic) — channel payment/refund when no credit customer account
  const isCredit = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT;
  if (isCredit && accounts.cashierAccountId) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (credit)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CREDIT },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (credit)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CREDIT },
      ],
    };
  }

  // Till: e-wallet — channel payment/refund
  const isEWallet = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.E_WALLET;
  if (isEWallet && accounts.cashierAccountId) {
    if (isPayment) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (e-wallet)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.E_WALLET },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (e-wallet)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.E_WALLET },
      ],
    };
  }

  // Agent: one RECEIVABLE account — debit = they owe more (booking), credit = they owe less (deposit/refund)
  if (hasAgent) {
    if (isPayment) {
      // Channel booking made with agent: increase receivable (agency owes us)
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (agent)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.agentAccountId!, debitAmount: amountCents, creditAmount: 0 },
          { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    // Refund: decrease receivable (reverse the booking)
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (agent)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.agentAccountId!, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Ledger: Branch Income (8) - cash in (till)
  if (receipt.method === RECEIPT_METHOD.BRANCH_INCOME && accounts.cashierAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Branch income (cash)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
        { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Ledger: Branch Expense (9) - cash out (till)
  if (receipt.method === RECEIPT_METHOD.BRANCH_EXPENSE && accounts.cashierAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Branch expense (cash)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
      ],
    };
  }

  // Ledger: Agency Debit Note (2) - increase agency liability
  if (receipt.method === RECEIPT_METHOD.DEBIT_NOTE && accounts.agentAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency debit note${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.agentAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Ledger: Agency Credit Note (3) - decrease agency liability
  if (receipt.method === RECEIPT_METHOD.CREDIT_NOTE && accounts.agentAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency credit note${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.agentAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Ledger: Agency Deposit (6) - agency pays in (cash: use cashier; card/slip: branch only)
  if (receipt.method === RECEIPT_METHOD.AGENCY_DEPOSIT && accounts.agentAccountId) {
    const isAgencyDepositCash = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH
    if (isAgencyDepositCash && accounts.cashierAccountId) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Agency deposit (cash)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
          { accountId: accounts.agentAccountId, debitAmount: 0, creditAmount: amountCents },
        ],
      };
    }
    // Card/slip: Dr Branch, Cr Agent (no cashier float)
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency deposit${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.agentAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  // Ledger: Agency Withdraw (7) - agency takes out
  if (receipt.method === RECEIPT_METHOD.AGENCY_WITHDRAW && accounts.agentAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency withdraw${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.agentAccountId, debitAmount: amountCents, creditAmount: 0 },
        { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents },
      ],
    };
  }

  return null;
  
}

/**
 * Resolve account IDs needed for receipt journal (call before transaction).
 * Returns null if branch cash book not found (locationId present but no branch cash book, or no main cash book).
 */
export async function resolveReceiptJournalAccounts(params: {
  locationId: string | null;
  createdBy: string | null;
  agencyId: string | null;
  creditCustomerId?: string | null;
  /** True if receipt hits till (cash, card, or slip); then we need cashier till account. */
  needTill: boolean;
}): Promise<ReceiptJournalAccounts | null> {
  const { getOrCreateAccount, getCashBookAccountForBranch, getMainCashBookAccount } = await import(
    '@/services/accounting.service'
  );

  const branchAccount = params.locationId
    ? await getCashBookAccountForBranch(params.locationId)
    : await getMainCashBookAccount();
  if (!branchAccount) return null;

  let cashierAccountId: string | null = null;
  if (params.needTill && params.createdBy) {
    const res = await getOrCreateAccount({
      type: 'CASH',
      userId: params.createdBy,
      name: `Till - Cashier`,
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

  let creditCustomerAccountId: string | null = null;
  if (params.creditCustomerId) {
    const res = await getOrCreateAccount({
      type: 'RECEIVABLE',
      creditCustomerId: params.creditCustomerId,
    });
    if (res.success) creditCustomerAccountId = res.account.id;
  }

  return {
    branchAccountId: branchAccount.id,
    cashierAccountId: cashierAccountId ?? undefined,
    agentAccountId: agentAccountId ?? undefined,
    creditCustomerAccountId: creditCustomerAccountId ?? undefined,
  };
}

export type RequireReceiptJournalAccountsResult =
  | { success: true; accounts: ReceiptJournalAccounts }
  | { success: false; error: string; errorCode: string };

/**
 * When the receipt will require a journal (till/cash/card/slip, agent, or credit customer), resolve accounts and validate.
 * Call before starting the transaction. If validation fails, return error so booking/settlement/refund is not completed.
 */
export async function requireReceiptJournalAccounts(
  params: {
    locationId: string | null;
    createdBy: string | null;
    agencyId: string | null;
    creditCustomerId?: string | null;
    needTill: boolean;
  },
  options: { needTill: boolean; isAgent: boolean; isCreditCustomer?: boolean }
): Promise<RequireReceiptJournalAccountsResult> {
  const accounts = await resolveReceiptJournalAccounts(params);
  if (!accounts) {
    return {
      success: false,
      error:
        'Branch cash book not found for this location. Please set up accounting (cash book) for the location or main cash book.',
      errorCode: 'CASH_BOOK_NOT_FOUND',
    };
  }
  if (options.needTill && !accounts.cashierAccountId) {
    return {
      success: false,
      error: 'Till account could not be created. Cannot complete payment or refund.',
      errorCode: 'CASHIER_ACCOUNT_ERROR',
    };
  }
  if (options.isAgent && !accounts.agentAccountId) {
    return {
      success: false,
      error: 'Agent account could not be found or created. Cannot complete agent payment or refund.',
      errorCode: 'AGENT_ACCOUNT_NOT_FOUND',
    };
  }
  if (options.isCreditCustomer && !accounts.creditCustomerAccountId) {
    return {
      success: false,
      error: 'Credit customer account could not be found or created. Cannot complete credit customer payment or refund.',
      errorCode: 'CREDIT_CUSTOMER_ACCOUNT_NOT_FOUND',
    };
  }
  return { success: true, accounts };
}
