import {
  getProcessedDiscount,
  type SessionForDiscount,
} from "./get-processed-discount"
import { getRefundFeeTypes } from "./get-refund-fee-types"

export type BookingDiscountDivision = {
  hospital_fee_discount: number
  professionsal_fee_discount: number
  other_discount: number
}

export type ComputeBookingDiscountsResult =
  | {
      success: true
      discount_value: number
      hospital_fee_discount: number
      professionsal_fee_discount: number
      other_discount: number
      discountDivision: BookingDiscountDivision
    }
  | { success: false; message: string }

function checkDivisionExceedsFees(
  division: BookingDiscountDivision,
  professional_fee: number,
  hospital_fee: number
): string | null {
  if (division.hospital_fee_discount > hospital_fee) {
    return `Combined hospital discounts exceed the hospital fee (Rs. ${hospital_fee.toFixed(2)}). Remove or change a discount scheme.`
  }
  if (division.professionsal_fee_discount > professional_fee) {
    return `Combined doctor fee discounts exceed the doctor fee (Rs. ${professional_fee.toFixed(2)}). Remove or change a discount scheme.`
  }
  return null
}

function capDivisionToFees(
  division: BookingDiscountDivision,
  professional_fee: number,
  hospital_fee: number
): BookingDiscountDivision {
  const hospital_fee_discount = Math.min(
    division.hospital_fee_discount,
    hospital_fee
  )
  const professionsal_fee_discount = Math.min(
    division.professionsal_fee_discount,
    professional_fee
  )
  return {
    hospital_fee_discount,
    professionsal_fee_discount,
    other_discount: division.other_discount,
  }
}

function addDivision(
  acc: BookingDiscountDivision,
  next: BookingDiscountDivision
): BookingDiscountDivision {
  return {
    hospital_fee_discount: acc.hospital_fee_discount + next.hospital_fee_discount,
    professionsal_fee_discount:
      acc.professionsal_fee_discount + next.professionsal_fee_discount,
    other_discount: acc.other_discount + next.other_discount,
  }
}

/**
 * Apply auto then manual discounts for a booking method + payment type.
 * Cumulative hospital/professional discounts never exceed respective fee totals.
 * Inapplicable schemes are skipped (no error) so settlement can reflect payment-type rules.
 */
export async function computeBookingDiscounts(params: {
  autoDiscountId?: string | null
  manualDiscountId?: string | null
  payment_method: number
  payment_type: number
  session: SessionForDiscount
  foriegner: boolean
  /**
   * When true, inapplicable schemes return an error (save-booking).
   * When false, they are skipped (settle when payment type changes).
   */
  strict?: boolean
  /**
   * When true, combined discounts over a fee category return an error.
   * Defaults to the same value as `strict` when omitted.
   */
  rejectExceedsFeeCap?: boolean
}): Promise<ComputeBookingDiscountsResult> {
  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    params.session.fees,
    params.foriegner
  )
  const failInapplicable = params.strict === true
  const rejectCap = params.rejectExceedsFeeCap ?? failInapplicable

  let division: BookingDiscountDivision = {
    hospital_fee_discount: 0,
    professionsal_fee_discount: 0,
    other_discount: 0,
  }

  if (params.autoDiscountId) {
    const result = await getProcessedDiscount(
      params.autoDiscountId,
      params.payment_method,
      params.payment_type,
      params.session,
      params.foriegner
    )
    if (!result.status) {
      if (failInapplicable) {
        return {
          success: false,
          message: result.message ?? "Auto discount error.",
        }
      }
    } else {
      division = addDivision(division, {
        hospital_fee_discount: result.hospital_fee_discount,
        professionsal_fee_discount: result.professionsal_fee_discount,
        other_discount: result.other_discount,
      })
      const exceedMsg = checkDivisionExceedsFees(
        division,
        professional_fee,
        hospital_fee
      )
      if (exceedMsg && rejectCap) {
        return { success: false, message: exceedMsg }
      }
      division = capDivisionToFees(division, professional_fee, hospital_fee)
    }
  }

  if (params.manualDiscountId) {
    const result = await getProcessedDiscount(
      params.manualDiscountId,
      params.payment_method,
      params.payment_type,
      params.session,
      params.foriegner
    )
    if (!result.status) {
      if (failInapplicable) {
        return {
          success: false,
          message: result.message ?? "Discount error.",
        }
      }
    } else {
      division = addDivision(division, {
        hospital_fee_discount: result.hospital_fee_discount,
        professionsal_fee_discount: result.professionsal_fee_discount,
        other_discount: result.other_discount,
      })
      const exceedMsg = checkDivisionExceedsFees(
        division,
        professional_fee,
        hospital_fee
      )
      if (exceedMsg && rejectCap) {
        return { success: false, message: exceedMsg }
      }
      division = capDivisionToFees(division, professional_fee, hospital_fee)
    }
  }

  const discount_value =
    division.hospital_fee_discount +
    division.professionsal_fee_discount +
    division.other_discount

  return {
    success: true,
    discount_value,
    hospital_fee_discount: division.hospital_fee_discount,
    professionsal_fee_discount: division.professionsal_fee_discount,
    other_discount: division.other_discount,
    discountDivision: division,
  }
}
