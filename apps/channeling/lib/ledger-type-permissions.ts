import type { Permissions } from "@/types/user-group"
import type { LedgerTransactionType } from "@/services/ledger/create-ledger-receipt.service"
import { RECEIPT_METHOD } from "@/types/receipt"

/**
 * One add permission per ledger transaction type.
 * Groups that only have the older blanket `ledger.add` flag keep every type
 * until that type is explicitly turned off.
 */
export const LEDGER_TYPE_ADD_ACTION: Record<LedgerTransactionType, string> = {
  BRANCH_INCOME: "add-branch-income",
  BRANCH_EXPENSE: "add-branch-expense",
  AGENCY_DEBIT_NOTE: "add-agency-debit-note",
  AGENCY_CREDIT_NOTE: "add-agency-credit-note",
  AGENCY_DEPOSIT: "add-agency-deposit",
  AGENCY_WITHDRAW: "add-agency-withdraw",
  BANK_DEPOSIT: "add-bank-deposit",
}

export const LEDGER_TYPE_ADD_ACTIONS = Object.values(LEDGER_TYPE_ADD_ACTION)

const LEDGER_TYPE_ORDER = Object.keys(LEDGER_TYPE_ADD_ACTION) as LedgerTransactionType[]

export function isLedgerTypeAddAction(actionId: string): boolean {
  return (LEDGER_TYPE_ADD_ACTIONS as string[]).includes(actionId)
}

/**
 * True when this group may record the type.
 * Explicit true allows it. Explicit false blocks it, even if blanket Add is on.
 * A missing flag falls back to blanket Add so existing groups keep working.
 */
export function canAddLedgerTransactionType(
  permissions: Permissions | null | undefined,
  type: LedgerTransactionType
): boolean {
  const ledger = permissions?.ledger
  if (!ledger) return false
  const specific = ledger[LEDGER_TYPE_ADD_ACTION[type]]
  if (specific === true) return true
  if (specific === false) return false
  return ledger.add === true
}

export function ledgerTypeAddChecked(
  ledger: Record<string, boolean> | undefined,
  actionId: string
): boolean {
  const specific = ledger?.[actionId]
  if (specific === true) return true
  if (specific === false) return false
  return ledger?.add === true
}

export function allowedLedgerTransactionTypes(
  permissions: Permissions | null | undefined
): LedgerTransactionType[] {
  return LEDGER_TYPE_ORDER.filter((type) => canAddLedgerTransactionType(permissions, type))
}

const LEDGER_TYPE_BY_RECEIPT_METHOD: Partial<Record<number, LedgerTransactionType>> = {
  [RECEIPT_METHOD.BRANCH_INCOME]: "BRANCH_INCOME",
  [RECEIPT_METHOD.BRANCH_EXPENSE]: "BRANCH_EXPENSE",
  [RECEIPT_METHOD.DEBIT_NOTE]: "AGENCY_DEBIT_NOTE",
  [RECEIPT_METHOD.CREDIT_NOTE]: "AGENCY_CREDIT_NOTE",
  [RECEIPT_METHOD.AGENCY_DEPOSIT]: "AGENCY_DEPOSIT",
  [RECEIPT_METHOD.AGENCY_WITHDRAW]: "AGENCY_WITHDRAW",
}

/** Methods a user might be allowed to cancel. Bank withdraw is a reversal and is never canceled. */
export const CANCELABLE_LEDGER_METHODS = [
  RECEIPT_METHOD.BRANCH_INCOME,
  RECEIPT_METHOD.BRANCH_EXPENSE,
  RECEIPT_METHOD.DEBIT_NOTE,
  RECEIPT_METHOD.CREDIT_NOTE,
  RECEIPT_METHOD.AGENCY_DEPOSIT,
  RECEIPT_METHOD.AGENCY_WITHDRAW,
  RECEIPT_METHOD.BANK_DEPOSIT,
] as const

/**
 * Cancel uses the same per-type privilege as add, except bank deposit.
 * Bank deposit cancel stays on Cancel Bank Deposits.
 * A type that was never set still follows the older Add or Cancel entries flags.
 * Turning a type off blocks both recording and canceling it.
 */
export function canCancelLedgerReceiptMethod(
  permissions: Permissions | null | undefined,
  method: number
): boolean {
  const ledger = permissions?.ledger
  if (!ledger) return false
  if (method === RECEIPT_METHOD.BANK_DEPOSIT) {
    return ledger["cancel-bank-deposit"] === true
  }
  const type = LEDGER_TYPE_BY_RECEIPT_METHOD[method]
  if (!type) return false
  const specific = ledger[LEDGER_TYPE_ADD_ACTION[type]]
  if (specific === true) return true
  if (specific === false) return false
  return ledger.cancel === true || ledger.add === true
}

/** Copy blanket Add onto type flags that were never set, so the editor matches runtime. */
export function materializeLegacyLedgerTypePermissions(permissions: Permissions): Permissions {
  const ledger = permissions.ledger
  if (!ledger || ledger.add !== true) return permissions
  let changed = false
  const nextLedger: Record<string, boolean> = { ...ledger }
  for (const action of LEDGER_TYPE_ADD_ACTIONS) {
    if (nextLedger[action] === undefined) {
      nextLedger[action] = true
      changed = true
    }
  }
  if (!changed) return permissions
  return { ...permissions, ledger: nextLedger }
}
