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
  type TillBalanceBreakdown,
} from './balance.service';

// Journals
export {
  createJournalEntry,
  createJournalEntryInTransaction,
} from './journal.service';

// Statement
export { getAccountStatement } from './statement.service';
