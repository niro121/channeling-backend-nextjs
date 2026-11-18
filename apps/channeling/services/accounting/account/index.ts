/**
 * Account sub-domain: read, write, get-or-create.
 * Re-exported from account.service.ts for backward compatibility.
 */

export {
  getCashAccountByUserId,
  getMainCashBookAccount,
  getCashBookAccountForBranch,
  getAccountById,
  getAllAccounts,
  getLinkedAccountUserOptions,
  type GetAllAccountsParams,
} from './read.service';

export { createAccount, updateAccount } from './write.service';

export {
  getOrCreateAccount,
  type GetOrCreateAccountParams,
} from './get-or-create.service';
