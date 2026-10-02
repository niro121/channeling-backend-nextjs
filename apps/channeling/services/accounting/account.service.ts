/**
 * Account service – re-exports from account/ subfolder for backward compatibility.
 * No 'use server' here so we can re-export types; the account/*.service.ts files define the server actions.
 * - account/read.service: getCashAccountByUserId, getMainCashBookAccount, getCashBookAccountForBranch, getAccountById, getAllAccounts
 * - account/write.service: createAccount, updateAccount
 * - account/get-or-create.service: getOrCreateAccount
 */

export {
  getCashAccountByUserId,
  getMainCashBookAccount,
  getCashBookAccountForBranch,
  getAccountById,
  getAllAccounts,
  getLinkedAccountUserOptions,
  type GetAllAccountsParams,
} from './account/read.service';

export { createAccount, updateAccount } from './account/write.service';

export {
  getOrCreateAccount,
  type GetOrCreateAccountParams,
} from './account/get-or-create.service';

export { getOrCreateWhtPayableAccount } from './account/wht-payable-account.service';
export { WHT_PAYABLE_ACCOUNT_CODE, WHT_PAYABLE_NAME } from './account/wht-payable-account.constants';

export { getOrCreateAgentOpeningBalancesAccount } from './account/agent-opening-balances-account.service';
export {
  AGENT_OPENING_BALANCES_ACCOUNT_CODE,
  AGENT_OPENING_BALANCES_ACCOUNT_NAME,
  AGENT_OPENING_BALANCES_ACCOUNT_TYPE,
} from './account/agent-opening-balances-account.constants';
