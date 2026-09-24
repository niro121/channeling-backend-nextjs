/**
 * Pure helpers for double-entry accounting (no DB).
 * Amounts in smallest unit (e.g. cents).
 */

import type { AccountType } from '@/types/accounting';
import type { JournalLineInput } from '@/types/accounting';

export type ValidateJournalLinesResult =
  | { valid: true }
  | { valid: false; error: string };

/**
 * Ensures each line has exactly one of debit/credit > 0 and the other 0,
 * and SUM(debits) === SUM(credits).
 */
export function validateJournalLines(
  lines: JournalLineInput[]
): ValidateJournalLinesResult {
  if (!lines.length) {
    return { valid: false, error: 'At least one journal line is required' };
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const debit = Number(line.debitAmount) ?? 0;
    const credit = Number(line.creditAmount) ?? 0;

    if (debit < 0 || credit < 0) {
      return {
        valid: false,
        error: `Line ${i + 1}: amounts must be non-negative`,
      };
    }
    if (debit > 0 && credit > 0) {
      return {
        valid: false,
        error: `Line ${i + 1}: cannot have both debit and credit`,
      };
    }
    if (debit === 0 && credit === 0) {
      return {
        valid: false,
        error: `Line ${i + 1}: cannot have both amounts zero`,
      };
    }

    totalDebits += debit;
    totalCredits += credit;
  }

  if (totalDebits !== totalCredits) {
    return {
      valid: false,
      error: `Debits (${totalDebits}) must equal credits (${totalCredits})`,
    };
  }

  return { valid: true };
}

/** Credit-normal: balance increases with credits (liability, equity-style, income). */
function isCreditNormalAccountType(accountType: AccountType): boolean {
  return accountType === 'PAYABLE' || accountType === 'INCOME';
}

/**
 * Compute balance from lines for a single account.
 * CASH / RECEIVABLE / EXPENSE: debits - credits (debit-normal).
 * PAYABLE / INCOME: credits - debits (credit-normal).
 */
export function computeBalanceFromLines(
  lines: { debitAmount: number; creditAmount: number }[],
  accountType: AccountType
): number {
  let debits = 0;
  let credits = 0;
  for (const line of lines) {
    debits += line.debitAmount ?? 0;
    credits += line.creditAmount ?? 0;
  }
  if (isCreditNormalAccountType(accountType)) {
    return credits - debits;
  }
  return debits - credits;
}

/**
 * Net effect of a single line on an account (signed).
 * Positive = balance increases, negative = balance decreases.
 * Debit-normal (CASH, RECEIVABLE, EXPENSE): debit - credit.
 * Credit-normal (PAYABLE, INCOME): credit - debit.
 */
export function netEffectForAccountType(
  debitAmount: number,
  creditAmount: number,
  accountType: AccountType
): number {
  if (isCreditNormalAccountType(accountType)) {
    return creditAmount - debitAmount;
  }
  return debitAmount - creditAmount;
}
