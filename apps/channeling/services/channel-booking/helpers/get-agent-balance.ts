import prisma from "@/lib/prisma"
import { getAccountBalance } from "@/services/accounting/balance-calc.service"

type GetAgentBalanceOptions = {
  to_date?: string // YYYY-MM-DD
  balance_at_endof_day?: boolean
}

/**
 * Agent balance helper.
 *
 * - If options.to_date is provided, returns balance at the cutoff datetime using Sails-equivalent logic:
 *   balance = (-1 * paidtotal) + (-1 * refundtotal) + deposits
 *
 * - If options.to_date is NOT provided, keeps existing app behavior:
 *   balance is derived from linked PAYABLE account (getAccountBalance), in cents.
 */
export async function getAgentBalance(
  agencyId: string,
  options?: GetAgentBalanceOptions
): Promise<number> {
  // == Date-based (Account statement as-at) ==
  if (options?.to_date) {
    const toDate = options.to_date.trim()
    const cutoff = options.balance_at_endof_day
      ? new Date(`${toDate}T23:59:59.999`)
      : new Date(`${toDate}T00:00:00.000`)

    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: {
        accounts: {
          where: { type: "PAYABLE", isActive: true },
          take: 1,
          select: { id: true },
        },
      },
    })
    if (!agency) return 0
    const account = agency.accounts?.[0]
    if (!account) return 0
    return await getAccountBalance(account.id, cutoff)
  }

  // == Default (no date): PAYABLE account balance (existing behavior) ==
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    select: {
      accounts: {
        where: { type: "PAYABLE", isActive: true },
        take: 1,
        select: { id: true },
      },
    },
  })
  if (!agency) return 0

  const account = agency.accounts?.[0]
  if (!account) return 0

  return await getAccountBalance(account.id)
}
