/**
 * Client-side discount computation (mirrors server getRefundFeeTypes + getProcessedDiscount logic).
 * Uses session.fees and discount criteria so no server call is needed.
 */

import {
  getRefundFeeTypes,
  type BookingFeeContext,
} from "@/lib/booking-fees"

export type { BookingFeeContext }

/** Spec payment_method → Prisma DiscountMethod (matches server get-processed-discount). */
export const PAYMENT_METHOD_TO_ENUM: Record<number, string> = {
  0: "POS",
  1: "ON_CALL",
  2: "AGENT",
  3: "STAFF",
  4: "API",
}

/** Spec payment_type → Prisma PaymentType (matches server get-processed-discount). */
export const PAYMENT_TYPE_TO_ENUM: Record<number, string> = {
  0: "CASH",
  1: "CREDIT_CARD",
  2: "SLIP",
  3: "CHEQUE",
  4: "CASH", // Agent
  5: "CASH", // Credit Customer
  6: "E_WALLET",
  7: "MIXED",
}

export type DiscountEligibility = {
  discountMethod: string[]
  paymentType: string[]
}

export function isDiscountApplicableForBookingType(
  discount: DiscountEligibility,
  payment_method: number,
  payment_type: number
): boolean {
  const methodEnum = PAYMENT_METHOD_TO_ENUM[payment_method]
  const typeEnum = PAYMENT_TYPE_TO_ENUM[payment_type]
  const okMethod =
    methodEnum == null || discount.discountMethod.includes(methodEnum)
  const okType = typeEnum == null || discount.paymentType.includes(typeEnum)
  return okMethod && okType
}

/** Spec §6.4: payment-aware professional / hospital split. */
export function getRefundFeeTypesClient(
  fees: unknown,
  foriegner: boolean,
  context?: BookingFeeContext
): { professional_fee: number; hospital_fee: number } {
  return getRefundFeeTypes(fees, foriegner, context)
}

export type DiscountCriteria = {
  discountType: number // 0 = percentage, 1 = fixed
  applyTo: number // 0 = hospital, 1 = professional
  discountValue: number
  discountValueForeign: number
}

export type DiscountDivisionClient = {
  total: number
  hospitalFeeDiscount: number
  professionalFeeDiscount: number
  otherDiscount: number
}

function applyDiscountSplit(
  discount: DiscountCriteria,
  professional_fee: number,
  hospital_fee: number,
  foriegner: boolean
): { hospital: number; professional: number } {
  const value = foriegner ? discount.discountValueForeign : discount.discountValue
  if (discount.discountType === 0) {
    if (discount.applyTo === 0) {
      // Percent of fee → round to cents (2dp), do not drop to whole rupees
      const hospital = Math.round(((hospital_fee * value) / 100) * 100) / 100
      return { hospital, professional: 0 }
    }
    const professional = Math.round(((professional_fee * value) / 100) * 100) / 100
    return { hospital: 0, professional }
  }
  if (discount.applyTo === 0) {
    return { hospital: Math.min(value, hospital_fee), professional: 0 }
  }
  return { hospital: 0, professional: Math.min(value, professional_fee) }
}

/** Apply one discount (same formula as server getProcessedDiscount). */
export function applyDiscountClient(
  discount: DiscountCriteria,
  professional_fee: number,
  hospital_fee: number,
  foriegner: boolean
): number {
  const split = applyDiscountSplit(discount, professional_fee, hospital_fee, foriegner)
  return split.hospital + split.professional
}

function accumulateDiscountDivision(
  fees: unknown,
  foriegner: boolean,
  discounts: DiscountCriteria[],
  capToFees: boolean,
  context?: BookingFeeContext
): DiscountDivisionClient {
  const { professional_fee, hospital_fee } = getRefundFeeTypesClient(
    fees,
    foriegner,
    context
  )
  let hospitalFeeDiscount = 0
  let professionalFeeDiscount = 0
  const otherDiscount = 0

  for (const d of discounts) {
    const split = applyDiscountSplit(d, professional_fee, hospital_fee, foriegner)
    hospitalFeeDiscount += split.hospital
    professionalFeeDiscount += split.professional
    if (capToFees) {
      hospitalFeeDiscount = Math.min(hospitalFeeDiscount, hospital_fee)
      professionalFeeDiscount = Math.min(professionalFeeDiscount, professional_fee)
    }
  }

  const total = hospitalFeeDiscount + professionalFeeDiscount + otherDiscount
  return { total, hospitalFeeDiscount, professionalFeeDiscount, otherDiscount }
}

/**
 * Returns an error message when combined discounts exceed a fee category (before capping).
 * Used to block bookings that stack incompatible schemes (e.g. Rs 90 + 100% on same hospital fee).
 */
export function getDiscountCapExceededMessage(
  fees: unknown,
  foriegner: boolean,
  discounts: DiscountCriteria[],
  context?: BookingFeeContext
): string | null {
  if (discounts.length === 0) return null
  const { professional_fee, hospital_fee } = getRefundFeeTypesClient(
    fees,
    foriegner,
    context
  )
  const uncapped = accumulateDiscountDivision(fees, foriegner, discounts, false, context)

  if (uncapped.hospitalFeeDiscount > hospital_fee) {
    return `Combined hospital discounts (${formatRs(uncapped.hospitalFeeDiscount)}) exceed the hospital fee (${formatRs(hospital_fee)}). Remove or change a discount scheme.`
  }
  if (uncapped.professionalFeeDiscount > professional_fee) {
    return `Combined doctor fee discounts (${formatRs(uncapped.professionalFeeDiscount)}) exceed the doctor fee (${formatRs(professional_fee)}). Remove or change a discount scheme.`
  }
  return null
}

function formatRs(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Total discount from fees + list of discounts to apply (capped per fee category). */
export function computeDiscountDivisionClient(
  fees: unknown,
  foriegner: boolean,
  discounts: DiscountCriteria[],
  context?: BookingFeeContext
): DiscountDivisionClient {
  return accumulateDiscountDivision(fees, foriegner, discounts, true, context)
}

/** e.g. "Discount : 100.00 (Hospital Fee Discount)" */
export function formatCategoryDiscountLabel(
  category: "hospital" | "doctor",
  amount: number,
  formatAmount: (value: number) => string
): string {
  const feeDiscountName =
    category === "hospital" ? "Hospital Fee Discount" : "Doctor Fee Discount"
  return `Discount : ${formatAmount(amount)} (${feeDiscountName})`
}

/** Total discount from fees + list of discounts to apply. */
export function computeTotalDiscountClient(
  fees: unknown,
  foriegner: boolean,
  discounts: DiscountCriteria[],
  context?: BookingFeeContext
): number {
  return computeDiscountDivisionClient(fees, foriegner, discounts, context).total
}
