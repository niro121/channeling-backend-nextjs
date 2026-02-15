/**
 * Client-side discount computation (mirrors server getRefundFeeTypes + getProcessedDiscount logic).
 * Uses session.fees and discount criteria so no server call is needed.
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

/** Spec §6.4: first = professional, rest = hospital */
export function getRefundFeeTypesClient(
  fees: unknown,
  foriegner: boolean
): { professional_fee: number; hospital_fee: number } {
  const arr = parseFees(fees)
  const professional_fee = arr.length > 0 ? getValue(arr[0], foriegner) : 0
  const hospital_fee = arr.slice(1).reduce((sum, f) => sum + getValue(f, foriegner), 0)
  return { professional_fee, hospital_fee }
}

export type DiscountCriteria = {
  discountType: number // 0 = percentage, 1 = fixed
  applyTo: number // 0 = hospital, 1 = professional
  discountValue: number
  discountValueForeign: number
}

/** Apply one discount (same formula as server getProcessedDiscount). */
export function applyDiscountClient(
  discount: DiscountCriteria,
  professional_fee: number,
  hospital_fee: number,
  foriegner: boolean
): number {
  const value = foriegner ? discount.discountValueForeign : discount.discountValue
  if (discount.discountType === 0) {
    if (discount.applyTo === 0) {
      return Math.round((hospital_fee * value) / 100)
    }
    return Math.round((professional_fee * value) / 100)
  }
  if (discount.applyTo === 0) {
    return Math.min(value, hospital_fee)
  }
  return Math.min(value, professional_fee)
}

/** Total discount from fees + list of discounts to apply. */
export function computeTotalDiscountClient(
  fees: unknown,
  foriegner: boolean,
  discounts: DiscountCriteria[]
): number {
  const { professional_fee, hospital_fee } = getRefundFeeTypesClient(fees, foriegner)
  let total = 0
  for (const d of discounts) {
    total += applyDiscountClient(d, professional_fee, hospital_fee, foriegner)
  }
  return total
}
