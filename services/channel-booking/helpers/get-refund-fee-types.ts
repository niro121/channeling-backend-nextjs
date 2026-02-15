/**
 * Spec §6.4. From session.fees array: first = professional, rest = hospital.
 * Fee shape from codebase: { localFee?, foreignFee?, local_value?, foreign_value? }.
 */

type FeeEntry = {
  localFee?: number
  foreignFee?: number
  local_value?: number
  foreign_value?: number
}

function parseFees(fees: unknown): FeeEntry[] {
  if (!Array.isArray(fees)) return []
  return fees as FeeEntry[]
}

function getValue(fee: FeeEntry, foriegner: boolean): number {
  if (foriegner) {
    return (fee.foreignFee ?? fee.foreign_value ?? 0) as number
  }
  return (fee.localFee ?? fee.local_value ?? 0) as number
}

export function getRefundFeeTypes(
  fees: unknown,
  foriegner: boolean
): { professional_fee: number; hospital_fee: number } {
  const arr = parseFees(fees)
  const professional_fee =
    arr.length > 0 ? getValue(arr[0], foriegner) : 0
  const hospital_fee = arr.slice(1).reduce((sum, f) => sum + getValue(f, foriegner), 0)
  return { professional_fee, hospital_fee }
}
