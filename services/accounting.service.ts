/**
 * Accounting service – barrel re-export.
 * Implementation lives in services/accounting/ (account, balance-calc, balance, journal, statement).
 */
export {
  getAccountBalance,
  getAccountBalanceWithTx,
  type AccountingTx,
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
  getBranchCashBalance,
  getCashierFloatBalance,
  getFullInstituteCashBalance,
  getTillBalanceBreakdown,
  type TillBalanceBreakdown,
  createJournalEntry,
  createJournalEntryInTransaction,
  checkJournalEntryBalance,
  getAccountStatement,
} from './accounting';
