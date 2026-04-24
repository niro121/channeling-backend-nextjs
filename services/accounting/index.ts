// Barrel: re-exports from accounting services. Server directives are in the individual service files.
// Balance calc (core balance by account id)
export {
  getAccountBalance,
  getAccountBalanceWithTx,
  type AccountingTx,
} from './balance-calc.service';

// Accounts
export {
  getMainCashBookAccount,
  getCashBookAccountForBranch,
  getCashAccountByUserId,
  getOrCreateAccount,
  createAccount,
  updateAccount,
  getAccountById,
  getAllAccounts,
  type GetOrCreateAccountParams,
  type GetAllAccountsParams,
} from './account.service';

// Balance (branch / cashier / institute / till)
export {
  getBranchCashBalance,
  getCashierFloatBalance,
  getFullInstituteCashBalance,
  getTillBalanceBreakdown,
  getTillBalanceBreakdownForAccount,
  type TillBalanceBreakdown,
} from './balance.service';
export { getTillBalanceCentsByMethod } from '@/lib/accounting/till-balance-by-method';
export {
  ensureTillForUserLocation,
  resolveActiveTillForUserLocation,
  resolveTillForUserAndLocation,
  listTillsForUser,
  type ResolvedTill,
} from './till.service';

// Journals
export {
  createJournalEntry,
  createJournalEntryInTransaction,
  checkJournalEntryBalance,
} from './journal.service';

// Statement
export { getAccountStatement } from './statement.service';
