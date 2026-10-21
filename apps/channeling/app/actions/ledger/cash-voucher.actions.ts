"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { assertCanAddLedgerTransactionType } from "@/lib/server-permissions"
import {
  getCashVoucherTypeBalances,
  listReconciledCashAccounts,
  type CashVoucherAccountOption,
  type CashVoucherTypeBalance,
} from "@/services/ledger/cash-voucher.service"

export async function listCashVoucherAccountsAction(): Promise<
  { success: true; accounts: CashVoucherAccountOption[] } | { success: false; message: string }
> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in." }
  }
  const allowed = await assertCanAddLedgerTransactionType("CASH_VOUCHER")
  if (!allowed) {
    return { success: false, message: "You don't have permission to record cash vouchers." }
  }
  const accounts = await listReconciledCashAccounts()
  return { success: true, accounts }
}

export async function getCashVoucherBalancesAction(
  accountId: string
): Promise<{ success: true; balances: CashVoucherTypeBalance[] } | { success: false; message: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in." }
  }
  const allowed = await assertCanAddLedgerTransactionType("CASH_VOUCHER")
  if (!allowed) {
    return { success: false, message: "You don't have permission to record cash vouchers." }
  }
  const result = await getCashVoucherTypeBalances(accountId)
  if (!result.success) return { success: false, message: result.message }
  return { success: true, balances: result.balances }
}
