import { randomUUID } from "crypto"
import type { PrismaClient } from "@prisma/client"
import prisma from "@/lib/prisma"
import { formatCents } from "@/lib/format-money"
import { netEffectForAccountType } from "@/lib/accounting/helpers"
import { isBranchReconciledCashAccount } from "@/services/accounting/account/branch-reconciled-account.constants"
import type { AccountingTx } from "@/services/accounting/balance-calc.service"
import {
  APPROVAL_REQUEST_STATUS,
  APPROVAL_REQUEST_TYPE,
  parseCashVoucherSnapshot,
} from "@/types/approval-request"
import { PAYMENT_METHOD_NAMES, RECEIPT_PAYMENT_METHOD } from "@/types/receipt"

const LOCK_TTL_MS = 20_000
const LOCK_WAIT_MS = 8_000

export const CASH_VOUCHER_SOURCE_METHODS = [
  RECEIPT_PAYMENT_METHOD.CREDIT_CARD,
  RECEIPT_PAYMENT_METHOD.SLIP,
  RECEIPT_PAYMENT_METHOD.CHECK,
  RECEIPT_PAYMENT_METHOD.E_WALLET,
] as const

const SOURCE_METHOD_SET = new Set<number>(CASH_VOUCHER_SOURCE_METHODS)

export type CashVoucherLineInput = {
  paymentMethod: number
  amount: number
}

export type CashVoucherCheckedLine = {
  paymentMethod: number
  amountCents: number
}

export type CashVoucherAccountOption = {
  id: string
  name: string
  code: string | null
  locationId: string
  branchName: string
}

export type CashVoucherTypeBalance = {
  paymentMethod: number
  label: string
  postedCents: number
  pendingCents: number
  availableCents: number
}

type BalanceFailure = { success: false; errorCode: string; message: string }
type BalanceOk = { success: true; lines: CashVoucherCheckedLine[]; totalCents: number }

type JournalGroupClient = {
  journalLine: {
    groupBy: PrismaClient["journalLine"]["groupBy"]
  }
}

function methodLabel(paymentMethod: number): string {
  return PAYMENT_METHOD_NAMES[paymentMethod] ?? "payment"
}

function toCents(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Math.round(amount * 100)
}

export function normalizeCashVoucherLines(
  lines: CashVoucherLineInput[]
): { success: true; lines: CashVoucherCheckedLine[]; totalCents: number } | BalanceFailure {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { success: false, errorCode: "VALIDATION", message: "Select at least one type to convert." }
  }
  const seen = new Set<number>()
  const normalized: CashVoucherCheckedLine[] = []
  for (const line of lines) {
    if (!SOURCE_METHOD_SET.has(line.paymentMethod)) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: "Only credit card, slip, cheque, and e-wallet can be converted to cash.",
      }
    }
    if (seen.has(line.paymentMethod)) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: `Enter ${methodLabel(line.paymentMethod)} only once.`,
      }
    }
    seen.add(line.paymentMethod)
    const cents = toCents(line.amount)
    if (cents == null || cents <= 0) {
      return {
        success: false,
        errorCode: "VALIDATION",
        message: `${methodLabel(line.paymentMethod)} amount must be greater than zero.`,
      }
    }
    normalized.push({ paymentMethod: line.paymentMethod, amountCents: cents })
  }
  const totalCents = normalized.reduce((sum, line) => sum + line.amountCents, 0)
  return { success: true, lines: normalized, totalCents }
}

function insufficientMessage(paymentMethod: number, availableCents: number, requestedCents: number): string {
  const label = methodLabel(paymentMethod)
  if (availableCents <= 0) {
    return `${label} has no balance on this reconciliation account.`
  }
  return `Insufficient ${label} balance. Available: ${formatCents(availableCents)} LKR, requested: ${formatCents(requestedCents)} LKR.`
}

export async function postedCentsByMethod(
  client: JournalGroupClient,
  accountId: string
): Promise<Map<number, number>> {
  const result = await client.journalLine.groupBy({
    by: ["paymentMethod"],
    where: { accountId },
    _sum: { debitAmount: true, creditAmount: true },
  })
  const totals = new Map<number, number>()
  for (const row of result) {
    const net = netEffectForAccountType(row._sum?.debitAmount ?? 0, row._sum?.creditAmount ?? 0, "CASH")
    const pm = row.paymentMethod
    const key =
      pm === RECEIPT_PAYMENT_METHOD.CREDIT_CARD ||
      pm === RECEIPT_PAYMENT_METHOD.SLIP ||
      pm === RECEIPT_PAYMENT_METHOD.CHECK ||
      pm === RECEIPT_PAYMENT_METHOD.E_WALLET ||
      pm === RECEIPT_PAYMENT_METHOD.CASH ||
      pm === RECEIPT_PAYMENT_METHOD.CREDIT
        ? pm
        : RECEIPT_PAYMENT_METHOD.CASH
    totals.set(key, (totals.get(key) ?? 0) + net)
  }
  return totals
}

async function pendingCentsByMethod(
  accountId: string,
  excludeRequestId?: string
): Promise<Map<number, number>> {
  const rows = await prisma.approvalRequest.findMany({
    where: {
      type: APPROVAL_REQUEST_TYPE.CASH_VOUCHER,
      status: APPROVAL_REQUEST_STATUS.PENDING,
      ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
    },
    select: { paymentLines: true },
  })
  const totals = new Map<number, number>()
  for (const row of rows) {
    const snap = parseCashVoucherSnapshot(row.paymentLines)
    if (!snap || snap.reconciled_account_id !== accountId) continue
    for (const line of snap.lines) {
      if (!SOURCE_METHOD_SET.has(line.payment_method)) continue
      const cents = toCents(line.amount)
      if (cents == null) continue
      totals.set(line.payment_method, (totals.get(line.payment_method) ?? 0) + cents)
    }
  }
  return totals
}

export async function loadReconciledCashAccount(accountId: string): Promise<
  | {
      id: string
      name: string
      code: string | null
      locationId: string
      branchName: string
    }
  | null
> {
  const account = await prisma.account.findFirst({
    where: { id: accountId, type: "CASH", isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
      userId: true,
      locationId: true,
      location: { select: { name: true } },
    },
  })
  if (!account || !account.locationId || !isBranchReconciledCashAccount(account)) return null
  return {
    id: account.id,
    name: account.name,
    code: account.code,
    locationId: account.locationId,
    branchName: account.location?.name?.trim() || "Branch",
  }
}

export async function listReconciledCashAccounts(): Promise<CashVoucherAccountOption[]> {
  const accounts = await prisma.account.findMany({
    where: { type: "CASH", isActive: true, userId: null },
    select: {
      id: true,
      name: true,
      code: true,
      userId: true,
      locationId: true,
      location: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  })
  return accounts
    .filter((account) => account.locationId && isBranchReconciledCashAccount(account))
    .map((account) => ({
      id: account.id,
      name: account.name,
      code: account.code,
      locationId: account.locationId as string,
      branchName: account.location?.name?.trim() || "Branch",
    }))
}

export async function getCashVoucherTypeBalances(accountId: string): Promise<
  { success: true; balances: CashVoucherTypeBalance[] } | BalanceFailure
> {
  const account = await loadReconciledCashAccount(accountId)
  if (!account) {
    return { success: false, errorCode: "VALIDATION", message: "Select a reconciliation account." }
  }
  const [posted, pending] = await Promise.all([
    postedCentsByMethod(prisma, accountId),
    pendingCentsByMethod(accountId),
  ])
  const balances = CASH_VOUCHER_SOURCE_METHODS.map((paymentMethod) => {
    const postedCents = posted.get(paymentMethod) ?? 0
    const pendingCents = pending.get(paymentMethod) ?? 0
    return {
      paymentMethod,
      label: methodLabel(paymentMethod),
      postedCents,
      pendingCents,
      availableCents: postedCents - pendingCents,
    }
  })
  return { success: true, balances }
}

/**
 * Per-type balance check. Request subtracts other pending vouchers.
 * Approve checks the live posted balance only.
 */
export async function assertCashVoucherSourceBalances(input: {
  accountId: string
  lines: CashVoucherLineInput[]
  mode: "request" | "approve"
  excludeRequestId?: string
}): Promise<BalanceOk | BalanceFailure> {
  const normalized = normalizeCashVoucherLines(input.lines)
  if (!normalized.success) return normalized
  const account = await loadReconciledCashAccount(input.accountId)
  if (!account) {
    return { success: false, errorCode: "VALIDATION", message: "Select a reconciliation account." }
  }
  const posted = await postedCentsByMethod(prisma, input.accountId)
  const pending =
    input.mode === "request"
      ? await pendingCentsByMethod(input.accountId, input.excludeRequestId)
      : new Map<number, number>()
  for (const line of normalized.lines) {
    const available = (posted.get(line.paymentMethod) ?? 0) - (pending.get(line.paymentMethod) ?? 0)
    if (line.amountCents > available) {
      return {
        success: false,
        errorCode: "INSUFFICIENT_BALANCE",
        message: insufficientMessage(line.paymentMethod, available, line.amountCents),
      }
    }
  }
  return normalized
}

export async function assertPostedCashVoucherLinesWithTx(
  tx: AccountingTx,
  accountId: string,
  lines: CashVoucherCheckedLine[]
): Promise<BalanceOk | BalanceFailure> {
  const posted = await postedCentsByMethod(tx, accountId)
  for (const line of lines) {
    const available = posted.get(line.paymentMethod) ?? 0
    if (line.amountCents > available) {
      return {
        success: false,
        errorCode: "INSUFFICIENT_BALANCE",
        message: insufficientMessage(line.paymentMethod, available, line.amountCents),
      }
    }
  }
  return {
    success: true,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.amountCents, 0),
  }
}

export async function assertSourceMethodsNonNegativeWithTx(
  tx: AccountingTx,
  accountId: string,
  paymentMethods: number[]
): Promise<BalanceFailure | { success: true }> {
  const posted = await postedCentsByMethod(tx, accountId)
  for (const paymentMethod of paymentMethods) {
    const available = posted.get(paymentMethod) ?? 0
    if (available < 0) {
      return {
        success: false,
        errorCode: "INSUFFICIENT_BALANCE",
        message: `${methodLabel(paymentMethod)} balance on this reconciliation account would go below zero.`,
      }
    }
  }
  return { success: true }
}

export async function tillCashCentsWithTx(tx: AccountingTx, accountId: string): Promise<number> {
  const posted = await postedCentsByMethod(tx, accountId)
  return posted.get(RECEIPT_PAYMENT_METHOD.CASH) ?? 0
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function claimAccountLock(accountId: string, owner: string): Promise<boolean> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + LOCK_TTL_MS)
  try {
    await prisma.cashVoucherAccountLock.create({
      data: { accountId, owner, expiresAt },
    })
    return true
  } catch {
    const updated = await prisma.cashVoucherAccountLock.updateMany({
      where: { accountId, expiresAt: { lte: now } },
      data: { owner, expiresAt },
    })
    return updated.count === 1
  }
}

export async function withCashVoucherAccountLock<T>(accountId: string, fn: () => Promise<T>): Promise<T> {
  const owner = randomUUID()
  const deadline = Date.now() + LOCK_WAIT_MS
  let claimed = false
  while (!claimed) {
    claimed = await claimAccountLock(accountId, owner)
    if (claimed) break
    if (Date.now() > deadline) {
      throw new Error("This reconciliation account is busy. Try again.")
    }
    await sleep(80)
  }
  try {
    return await fn()
  } finally {
    await prisma.cashVoucherAccountLock.deleteMany({ where: { accountId, owner } })
  }
}

export async function withCashVoucherAccountLocks<T>(accountIds: string[], fn: () => Promise<T>): Promise<T> {
  const ids = [...new Set(accountIds.filter((id) => id.trim()))].sort()
  const run = (index: number): Promise<T> => {
    if (index >= ids.length) return fn()
    return withCashVoucherAccountLock(ids[index], () => run(index + 1))
  }
  return run(0)
}

export type CashVoucherJournalLine = {
  accountId: string
  debitAmount: number
  creditAmount: number
  paymentMethod?: number | null
}

export function buildCashVoucherJournalLines(input: {
  direction: "convert" | "reverse"
  reconciledAccountId: string
  tillAccountId: string
  lines: Array<{ paymentMethod: number; amountCents: number }>
}): CashVoucherJournalLine[] {
  const source = input.lines.map((line) =>
    input.direction === "convert"
      ? {
          accountId: input.reconciledAccountId,
          debitAmount: 0,
          creditAmount: line.amountCents,
          paymentMethod: line.paymentMethod,
        }
      : {
          accountId: input.reconciledAccountId,
          debitAmount: line.amountCents,
          creditAmount: 0,
          paymentMethod: line.paymentMethod,
        }
  )
  const totalCents = input.lines.reduce((sum, line) => sum + line.amountCents, 0)
  const cash =
    input.direction === "convert"
      ? {
          accountId: input.tillAccountId,
          debitAmount: totalCents,
          creditAmount: 0,
          paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
        }
      : {
          accountId: input.tillAccountId,
          debitAmount: 0,
          creditAmount: totalCents,
          paymentMethod: RECEIPT_PAYMENT_METHOD.CASH,
        }
  return [...source, cash]
}

export function cashVoucherLinesFromReceipt(receipt: {
  amount: number
  paymentLines: Array<{ paymentMethod: number; amount: number }>
}): CashVoucherCheckedLine[] {
  const fromLines = receipt.paymentLines
    .filter((line) => SOURCE_METHOD_SET.has(line.paymentMethod))
    .map((line) => ({
      paymentMethod: line.paymentMethod,
      amountCents: Math.round(Math.abs(Number(line.amount) || 0) * 100),
    }))
    .filter((line) => line.amountCents > 0)
  if (fromLines.length > 0) return fromLines
  return []
}
