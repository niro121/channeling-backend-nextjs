/** Per-location EXPENSE account used as the contra on agency debit and credit notes. */

export const EXPENSE_ADJUSTMENT_CODE_PREFIX = 'EA-';

export const EXPENSE_ADJUSTMENT_NAME_PREFIX = 'Expense Adjustment - ';

export function expenseAdjustmentAccountCode(locationCode: string): string {
  return `${EXPENSE_ADJUSTMENT_CODE_PREFIX}${locationCode}`.slice(0, 50);
}

export function expenseAdjustmentAccountName(locationName: string): string {
  return `${EXPENSE_ADJUSTMENT_NAME_PREFIX}${locationName}`.slice(0, 200);
}

export function isExpenseAdjustmentAccount(account: {
  code?: string | null;
  name?: string | null;
}): boolean {
  const code = account.code?.trim() ?? '';
  if (code.startsWith(EXPENSE_ADJUSTMENT_CODE_PREFIX)) return true;
  const name = account.name?.trim() ?? '';
  return name.startsWith(EXPENSE_ADJUSTMENT_NAME_PREFIX);
}
