/** Fixed GL code for the control account used when migrating agency prepaid balances. */

export const AGENT_OPENING_BALANCES_ACCOUNT_CODE = 'AGT-OPEN';

export const AGENT_OPENING_BALANCES_ACCOUNT_NAME = 'Agent Opening Balances';

/** Debit-normal control (same side as cash on an agency credit note). */
export const AGENT_OPENING_BALANCES_ACCOUNT_TYPE = 'RECEIVABLE' as const;
