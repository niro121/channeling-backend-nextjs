/** Per-branch CASH account that holds verified non-cash after reconciliation. */

export const BRANCH_RECONCILED_CODE_PREFIX = 'REC-';

export const BRANCH_RECONCILED_LEGACY_NAME = 'Reconciled';

export const BRANCH_RECONCILED_NAME_PREFIX = 'Reconciled - ';

export function branchReconciledAccountCode(locationCode: string): string {
  return `${BRANCH_RECONCILED_CODE_PREFIX}${locationCode.trim()}`.slice(0, 50);
}

export function branchReconciledAccountName(locationName: string): string {
  return `${BRANCH_RECONCILED_NAME_PREFIX}${locationName.trim()}`.slice(0, 200);
}

/** Previous code before branch codes were used: REC-{locationId}. */
export function legacyBranchReconciledAccountCode(locationId: string): string {
  return `${BRANCH_RECONCILED_CODE_PREFIX}${locationId}`.slice(0, 50);
}

export function isBranchReconciledCashAccount(account: {
  name?: string | null;
  code?: string | null;
  userId?: string | null;
}): boolean {
  if (account.userId) return false;
  const name = account.name?.trim() ?? '';
  if (name === BRANCH_RECONCILED_LEGACY_NAME) return true;
  if (name.startsWith(BRANCH_RECONCILED_NAME_PREFIX)) return true;
  const code = account.code?.trim() ?? '';
  return code.startsWith(BRANCH_RECONCILED_CODE_PREFIX);
}
