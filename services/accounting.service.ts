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
  getAccountById,
  getAllAccounts,
  type GetOrCreateAccountParams,
  type GetAllAccountsParams,
  getBranchCashBalance,
  getCashierFloatBalance,
  getFullInstituteCashBalance,
  createJournalEntry,
  createJournalEntryInTransaction,
  getAccountStatement,
} from './accounting';
