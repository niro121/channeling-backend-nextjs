import { getAgentBalance } from "./get-agent-balance"

/**
 * Spec §6.7. Agency balance is held in the linked PAYABLE account (updated via journal entries).
 * This returns the current balance in rupees for display (e.g. SMS template); no DB update.
 */
export async function updateAgentBalance(
  agencyId: string,
  _value: number
): Promise<{ balance: number }> {
  const balanceCents = await getAgentBalance(agencyId)
  return { balance: balanceCents / 100 }
}
