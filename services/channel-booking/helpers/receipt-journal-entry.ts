/**
 * Build double-entry journal input for a receipt. Used when saving/settling/refunding so that
 * receipt and journal are created in the same transaction (no saved receipt without journal).
 *
 * - Cash payment (RECEIPT_METHOD.PAYMENT, RECEIPT_PAYMENT_METHOD.CASH): increase cashier float — Dr Cashier CASH, Cr Branch Cash Book.
 * - Cash refund (RECEIPT_METHOD.REFUND, RECEIPT_PAYMENT_METHOD.CASH): decrease cashier float — Cr Cashier CASH, Dr Branch Cash Book.
 * - Agent payment (RECEIPT_METHOD.PAYMENT, RECEIPT_PAYMENT_METHOD.AGENT): use agent prepaid (reduce liability) — Dr Agent PAYABLE, Cr Branch Cash Book.
 * - Agent refund (RECEIPT_METHOD.REFUND, RECEIPT_PAYMENT_METHOD.AGENT): reverse — Cr Agent PAYABLE, Dr Branch Cash Book.
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
  /** Agent PAYABLE account (required for agent receipt/refund). */
  agentAccountId?: string | null;
  /** Credit Customer RECEIVABLE account (required for credit customer receipt/refund). */
  creditCustomerAccountId?: string | null;
  /** Doctor PAYABLE account (required for doctor payment method 4). */
  doctorAccountId?: string | null;
};

/** When provided for channel PAYMENT (save/settle booking), journal credits branch with hospital fee and doctor payable with professional fee. */
export type ChannelPaymentFeeSplit = {
  hospitalFeeCents: number;
  professionalFeeCents: number;
};

/** Returned by resolveReceiptJournalAccounts when doctor PAYABLE resolution fails (so the real error from getOrCreateAccount can be shown). */
export type ResolveReceiptJournalAccountsError = { error: string; errorCode: string };

export function isResolveReceiptJournalAccountsError(
  r: ReceiptJournalAccounts | null | ResolveReceiptJournalAccountsError
): r is ResolveReceiptJournalAccountsError {
  return r != null && typeof r === 'object' && 'error' in r && typeof (r as ResolveReceiptJournalAccountsError).error === 'string';
}

/**
 * Build journal entry input for a receipt, or null if no ledger entry is needed
 * (e.g. card/slip only with no cash or agent).
 * For channel PAYMENT (method 1), pass channelPaymentFeeSplit and doctorAccountId so branch is credited only hospital fee and doctor payable is credited professional fee.
 * For channel REFUND (method 0), pass channelPaymentFeeSplit and doctorAccountId so branch is debited hospital fee and doctor payable is debited professional fee (reversing the payment).
 */
export function buildReceiptJournalEntryInput(
  receipt: CreatedReceipt,
  accounts: ReceiptJournalAccounts,
  channelPaymentFeeSplit?: ChannelPaymentFeeSplit
): CreateJournalEntryInput | null {
  const amountCents = Math.round(Math.abs(receipt.amount) * 100);
  if (amountCents <= 0) return null;

  const useFeeSplit =
    channelPaymentFeeSplit &&
    accounts.doctorAccountId &&
    (receipt.method === RECEIPT_METHOD.PAYMENT || receipt.method === RECEIPT_METHOD.REFUND) &&
    channelPaymentFeeSplit.hospitalFeeCents >= 0 &&
    channelPaymentFeeSplit.professionalFeeCents >= 0 &&
    channelPaymentFeeSplit.hospitalFeeCents + channelPaymentFeeSplit.professionalFeeCents === amountCents;
  const hospitalFeeCents = useFeeSplit ? channelPaymentFeeSplit!.hospitalFeeCents : 0;
  const professionalFeeCents = useFeeSplit ? channelPaymentFeeSplit!.professionalFeeCents : 0;

  const descSuffix = receipt.receiptNoString
    ? ` - Receipt ${receipt.receiptNoString}`
    : '';

  const isPayment = receipt.method === RECEIPT_METHOD.PAYMENT;
  const isCash = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH;
  const hasAgent =
    receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.AGENT && Boolean(accounts.agentAccountId);

  // Only channel payment/refund use the till-by-payment-method blocks below; ledger methods are handled later
  const isChannelPaymentOrRefund =
    receipt.method === RECEIPT_METHOD.PAYMENT || receipt.method === RECEIPT_METHOD.REFUND;

  // Till: cash — affect cashier till with paymentMethod 0 (channel payment/refund only)
  if (isCash && accounts.cashierAccountId && isChannelPaymentOrRefund) {
    if (isPayment) {
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (cash)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
          ...creditLines,
        ],
      };
    }
    // Refund (cash): reverse payment — Dr Branch (hospital), Dr Doctor Payable (professional), Cr Cashier
    const refundDebitLines = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (cash)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLines,
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CASH },
      ],
    };
  }

  // Till: card — channel payment/refund only
  const isCard = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT_CARD;
  if (isCard && accounts.cashierAccountId && isChannelPaymentOrRefund) {
    if (isPayment) {
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (card)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CREDIT_CARD },
          ...creditLines,
        ],
      };
    }
    const refundDebitLinesCard = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (card)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLinesCard,
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CREDIT_CARD },
      ],
    };
  }

  // Till: slip — channel payment/refund only
  const isSlip = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.SLIP;
  if (isSlip && accounts.cashierAccountId && isChannelPaymentOrRefund) {
    if (isPayment) {
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (slip)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.SLIP },
          ...creditLines,
        ],
      };
    }
    const refundDebitLinesSlip = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (slip)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLinesSlip,
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.SLIP },
      ],
    };
  }

  // Till: check — channel payment/refund
  const isCheck = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CHECK;
  if (isCheck && accounts.cashierAccountId) {
    if (isPayment) {
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (check)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.CHECK },
          ...creditLines,
        ],
      };
    }
    const refundDebitLinesCheck = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (check)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLinesCheck,
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.CHECK },
      ],
    };
  }

  // Credit Customer (receivable) — channel payment/refund (like Agent; deduct from credit customer balance)
  const hasCreditCustomer =
    receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CREDIT && Boolean(accounts.creditCustomerAccountId);
  if (hasCreditCustomer) {
    if (isPayment) {
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (credit customer)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.creditCustomerAccountId!, debitAmount: amountCents, creditAmount: 0 },
          ...creditLines,
        ],
      };
    }
    const refundDebitLinesCreditCustomer = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (credit customer)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLinesCreditCustomer,
        { accountId: accounts.creditCustomerAccountId!, debitAmount: 0, creditAmount: amountCents },
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
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (e-wallet)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.cashierAccountId, debitAmount: amountCents, creditAmount: 0, paymentMethod: RECEIPT_PAYMENT_METHOD.E_WALLET },
          ...creditLines,
        ],
      };
    }
    const refundDebitLinesEWallet = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (e-wallet)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLinesEWallet,
        { accountId: accounts.cashierAccountId, debitAmount: 0, creditAmount: amountCents, paymentMethod: RECEIPT_PAYMENT_METHOD.E_WALLET },
      ],
    };
  }

  // Agent: one PAYABLE account — debit = use prepaid / reduce liability (booking, withdraw); credit = deposit / refund to agent
  if (hasAgent) {
    if (isPayment) {
      const creditLines = useFeeSplit
        ? [
            ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: hospitalFeeCents }] : []),
            ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: 0, creditAmount: professionalFeeCents }] : []),
          ]
        : [{ accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: amountCents }];
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Channel payment (agent)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.agentAccountId!, debitAmount: amountCents, creditAmount: 0 },
          ...creditLines,
        ],
      };
    }
    // Refund: Dr Branch (hospital), Dr Doctor Payable (professional), Cr Agent
    const refundDebitLinesAgent = useFeeSplit
      ? [
          ...(hospitalFeeCents > 0 ? [{ accountId: accounts.branchAccountId, debitAmount: hospitalFeeCents, creditAmount: 0 }] : []),
          ...(professionalFeeCents > 0 ? [{ accountId: accounts.doctorAccountId!, debitAmount: professionalFeeCents, creditAmount: 0 }] : []),
        ]
      : [{ accountId: accounts.branchAccountId, debitAmount: amountCents, creditAmount: 0 }];
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Channel refund (agent)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        ...refundDebitLinesAgent,
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

  // Ledger: Agency Debit Note (2) — Dr Agent PAYABLE, Cr branch cash (charge agent; credit branch)
  if (receipt.method === RECEIPT_METHOD.DEBIT_NOTE && accounts.agentAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency debit note${descSuffix}`,
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

  // Ledger: Agency Credit Note (3) — Dr branch cash, Cr Agent PAYABLE (reverse of debit note)
  if (receipt.method === RECEIPT_METHOD.CREDIT_NOTE && accounts.agentAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency credit note${descSuffix}`,
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

  // Ledger: Agency Withdraw (7) - agency takes out (reverse of deposit: Dr Agent, Cr Till). Till only; no branch fallback.
  if (receipt.method === RECEIPT_METHOD.AGENCY_WITHDRAW && accounts.agentAccountId && accounts.cashierAccountId) {
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Agency withdraw (cash)${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.agentAccountId, debitAmount: amountCents, creditAmount: 0 },
        {
          accountId: accounts.cashierAccountId,
          debitAmount: 0,
          creditAmount: amountCents,
          paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
        },
      ],
    };
  }

  // Doctor Payment (4): Dr Doctor PAYABLE (reduce liability), Cr Branch/Cashier (cash out). Use net amount (gross - WHT) in cents.
  if (receipt.method === RECEIPT_METHOD.DOCTOR_PAYMENT && accounts.doctorAccountId) {
    const grossCents = Math.round(Math.abs(receipt.amount) * 100);
    const whdCents = Math.round((receipt.whd ?? 0) * 100);
    const netCents = Math.max(0, grossCents - whdCents);
    if (netCents <= 0) return null;
    const isCash = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH;
    if (isCash && accounts.cashierAccountId) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Doctor payment (cash)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.doctorAccountId, debitAmount: netCents, creditAmount: 0 },
          {
            accountId: accounts.cashierAccountId,
            debitAmount: 0,
            creditAmount: netCents,
            paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
          },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Doctor payment${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.doctorAccountId, debitAmount: netCents, creditAmount: 0 },
        { accountId: accounts.branchAccountId, debitAmount: 0, creditAmount: netCents },
      ],
    };
  }

  // Doctor Cancel (5): reversal of doctor payment — Cr Doctor PAYABLE (restore liability), Dr Branch/Cashier.
  if (receipt.method === RECEIPT_METHOD.DOCTOR_CANCEL && accounts.doctorAccountId) {
    const grossCents = Math.round(Math.abs(receipt.amount) * 100);
    const whdCents = Math.round((receipt.whd ?? 0) * 100);
    const netCents = Math.max(0, grossCents - whdCents);
    if (netCents <= 0) return null;
    const isCash = receipt.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH;
    if (isCash && accounts.cashierAccountId) {
      return {
        date: receipt.createdAt ?? new Date(),
        description: `Doctor payment cancel (cash)${descSuffix}`,
        referenceType: REFERENCE_TYPES.Receipt,
        referenceId: receipt.id,
        locationId: receipt.locationId ?? receipt.userLocationId ?? null,
        createdBy: receipt.createdBy ?? null,
        lines: [
          { accountId: accounts.doctorAccountId, debitAmount: 0, creditAmount: netCents },
          {
            accountId: accounts.cashierAccountId,
            debitAmount: netCents,
            creditAmount: 0,
            paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
          },
        ],
      };
    }
    return {
      date: receipt.createdAt ?? new Date(),
      description: `Doctor payment cancel${descSuffix}`,
      referenceType: REFERENCE_TYPES.Receipt,
      referenceId: receipt.id,
      locationId: receipt.locationId ?? receipt.userLocationId ?? null,
      createdBy: receipt.createdBy ?? null,
      lines: [
        { accountId: accounts.doctorAccountId, debitAmount: 0, creditAmount: netCents },
        { accountId: accounts.branchAccountId, debitAmount: netCents, creditAmount: 0 },
      ],
    };
  }

  return null;
  
}

/**
 * Resolve account IDs needed for receipt journal (call before transaction).
 * Returns null if branch cash book not found.
 * Returns { error, errorCode } if doctorId was provided but doctor PAYABLE could not be found/created (so callers can show the real error from getOrCreateAccount).
 */
export async function resolveReceiptJournalAccounts(params: {
  locationId: string | null;
  createdBy: string | null;
  agencyId: string | null;
  creditCustomerId?: string | null;
  /** When provided (e.g. channel payment with booking), resolve doctor PAYABLE for fee-split journal: branch = hospital fee, doctor = professional fee. */
  doctorId?: string | null;
  /** True if receipt hits till (cash, card, or slip); then we need cashier till account. */
  needTill: boolean;
}): Promise<ReceiptJournalAccounts | null | ResolveReceiptJournalAccountsError> {
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
      type: 'PAYABLE',
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

  // Doctor PAYABLE: use the session/booking doctor id so we find the existing seeded account (type=PAYABLE, doctorId, isActive=true).
  let doctorAccountId: string | null = null;
  if (params.doctorId) {
    const res = await getOrCreateAccount({
      type: 'PAYABLE',
      doctorId: params.doctorId,
    });
    if (res.success) {
      doctorAccountId = res.account.id;
    } else {
      // Surface the real error (e.g. duplicate code, validation) so the user sees it instead of a generic message.
      return { error: res.error, errorCode: 'DOCTOR_PAYABLE_ACCOUNT_NOT_FOUND' };
    }
  }

  return {
    branchAccountId: branchAccount.id,
    cashierAccountId: cashierAccountId ?? undefined,
    agentAccountId: agentAccountId ?? undefined,
    creditCustomerAccountId: creditCustomerAccountId ?? undefined,
    doctorAccountId: doctorAccountId ?? undefined,
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
    /** For channel payment fee-split journal (branch = hospital fee, doctor = professional fee). */
    doctorId?: string | null;
    needTill: boolean;
  },
  options: { needTill: boolean; isAgent: boolean; isCreditCustomer?: boolean }
): Promise<RequireReceiptJournalAccountsResult> {
  const result = await resolveReceiptJournalAccounts(params);
  if (result === null) {
    return {
      success: false,
      error:
        'Branch cash book not found for this location. Please set up accounting (cash book) for the location or main cash book.',
      errorCode: 'CASH_BOOK_NOT_FOUND',
    };
  }
  if (isResolveReceiptJournalAccountsError(result)) {
    return { success: false, error: result.error, errorCode: result.errorCode };
  }
  const accounts = result;
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
  // Channel payment fee-split: branch = hospital fee, doctor payable = professional fee. Require doctor PAYABLE when doctorId was provided.
  // (If resolveReceiptJournalAccounts failed for doctor it already returned an error object above, so we only reach here when result was accounts and doctorId was set but doctorAccountId missing from a different code path.)
  if (params.doctorId && !accounts.doctorAccountId) {
    return {
      success: false,
      error:
        'Doctor payable account could not be found or created. Please check Accounting setup. Cannot complete booking with correct double entry (hospital fee → branch, professional fee → doctor).',
      errorCode: 'DOCTOR_PAYABLE_ACCOUNT_NOT_FOUND',
    };
  }
  return { success: true, accounts };
}

/**
 * Resolve accounts for doctor payment (method 4): branch, optional cashier till, and doctor PAYABLE.
 * Returns accounts or an error object with a user-friendly message.
 */
export async function resolveDoctorPaymentAccounts(params: {
  doctorId: string;
  locationId: string | null;
  createdBy: string | null;
  paymentMethod: number;
}): Promise<ReceiptJournalAccounts | { error: string }> {
  const { getOrCreateAccount, getCashBookAccountForBranch, getMainCashBookAccount } = await import(
    '@/services/accounting.service'
  );
  const { RECEIPT_PAYMENT_METHOD } = await import('@/types/receipt');

  const branchAccount = params.locationId
    ? await getCashBookAccountForBranch(params.locationId)
    : await getMainCashBookAccount();
  if (!branchAccount) {
    return { error: 'Branch cash book account not found. Please check Accounting setup.' };
  }

  let cashierAccountId: string | null = null;
  if (params.paymentMethod === RECEIPT_PAYMENT_METHOD.CASH && params.createdBy) {
    const res = await getOrCreateAccount({
      type: 'CASH',
      userId: params.createdBy,
      name: 'Till - Cashier',
    });
    if (!res.success) return { error: res.error };
    cashierAccountId = res.account.id;
  }

  const doctorRes = await getOrCreateAccount({
    type: 'PAYABLE',
    doctorId: params.doctorId,
  });
  if (!doctorRes.success) return { error: doctorRes.error };

  return {
    branchAccountId: branchAccount.id,
    cashierAccountId: cashierAccountId ?? undefined,
    doctorAccountId: doctorRes.account.id,
  };
}
