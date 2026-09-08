/**
 * Public session / booking pricing — same fee set and first auto discount as POS.
 * Used by GET /api/public/sessions and POST /api/public/bookings so listing and save cannot drift.
 */

import {
  FEE_ID,
  getRefundFeeTypes,
  getSessionFeeAmount,
  toBookingFeeContext,
  type BookingFeeContext,
} from "@/lib/booking-fees"
import {
  computeDiscountDivisionClient,
  isDiscountApplicableForBookingType,
} from "@/lib/channel-booking-discount"
import { getDiscountsForBookingService } from "@/services/channel-booking/reference/get-discounts-for-booking.service"
import { computeBookingDiscounts } from "@/services/channel-booking/helpers"
import {
  SAVE_BOOKING_METHOD_AGENT,
  SAVE_BOOKING_METHOD_API,
  SAVE_BOOKING_METHOD_ON_CALL,
  SAVE_PAYMENT_TYPE_AGENT,
  SAVE_PAYMENT_TYPE_CASH,
} from "@/types/save-booking"

export const PUBLIC_PAYMENT_MODES = ["api", "agent", "oncall"] as const
export type PublicPaymentMode = (typeof PUBLIC_PAYMENT_MODES)[number]

export type PublicSessionFeeBreakdown = {
  professionalFee: number
  hospitalFee: number
  discount: number
  /** professionalFee + hospitalFee − discount */
  amount: number
}

export type PublicSessionPricing = {
  local: PublicSessionFeeBreakdown
  foreign: PublicSessionFeeBreakdown
  apiFeeLocal: number
  apiFeeForeign: number
  paymentMode: PublicPaymentMode
  autoDiscountId: string | null
}

export type PublicPaymentMethodPair = {
  payment_method: number
  payment_type: number
}

export type PublicPricingContext = PublicPaymentMethodPair & {
  feeContext: BookingFeeContext
  paymentMode: PublicPaymentMode
  autoDiscountId: string | null
  autoDiscount: {
    discountType: number
    applyTo: number
    discountValue: number
    discountValueForeign: number
  } | null
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export function parsePublicPaymentMode(
  value: unknown
): { ok: true; mode: PublicPaymentMode } | { ok: false; message: string } {
  if (value === undefined || value === null || String(value).trim() === "") {
    return { ok: true, mode: "api" }
  }
  const normalized = String(value).trim().toLowerCase().replace(/[_-]/g, "")
  if (normalized === "api") return { ok: true, mode: "api" }
  if (normalized === "agent") return { ok: true, mode: "agent" }
  if (normalized === "oncall") return { ok: true, mode: "oncall" }
  return {
    ok: false,
    message: "paymentMode must be api, agent, or oncall",
  }
}

export function publicPaymentModeToMethods(
  mode: PublicPaymentMode
): PublicPaymentMethodPair {
  if (mode === "agent") {
    return {
      payment_method: SAVE_BOOKING_METHOD_AGENT,
      payment_type: SAVE_PAYMENT_TYPE_AGENT,
    }
  }
  if (mode === "oncall") {
    return {
      payment_method: SAVE_BOOKING_METHOD_ON_CALL,
      payment_type: SAVE_PAYMENT_TYPE_CASH,
    }
  }
  return {
    payment_method: SAVE_BOOKING_METHOD_API,
    payment_type: SAVE_PAYMENT_TYPE_AGENT,
  }
}

export async function loadPublicPricingContext(
  paymentMode: PublicPaymentMode
): Promise<PublicPricingContext> {
  const { payment_method, payment_type } =
    publicPaymentModeToMethods(paymentMode)
  const feeContext = toBookingFeeContext(payment_method, payment_type)
  const discounts = await getDiscountsForBookingService()
  const firstAuto =
    discounts.auto.find((d) =>
      isDiscountApplicableForBookingType(d, payment_method, payment_type)
    ) ?? null

  return {
    paymentMode,
    payment_method,
    payment_type,
    feeContext,
    autoDiscountId: firstAuto?.id ?? null,
    autoDiscount: firstAuto
      ? {
          discountType: firstAuto.discountType,
          applyTo: firstAuto.applyTo,
          discountValue: firstAuto.discountValue,
          discountValueForeign: firstAuto.discountValueForeign,
        }
      : null,
  }
}

function breakdownForFees(
  fees: unknown,
  foriegner: boolean,
  context: PublicPricingContext
): PublicSessionFeeBreakdown {
  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    fees,
    foriegner,
    context.feeContext
  )
  const discount = context.autoDiscount
    ? computeDiscountDivisionClient(
        fees,
        foriegner,
        [context.autoDiscount],
        context.feeContext
      ).total
    : 0
  return {
    professionalFee: professional_fee,
    hospitalFee: hospital_fee,
    discount,
    amount: roundMoney(professional_fee + hospital_fee - discount),
  }
}

export function pricePublicSessionFees(
  fees: unknown,
  context: PublicPricingContext
): PublicSessionPricing {
  const includeApiFee = context.paymentMode === "api"
  return {
    local: breakdownForFees(fees, false, context),
    foreign: breakdownForFees(fees, true, context),
    apiFeeLocal: includeApiFee
      ? getSessionFeeAmount(fees, FEE_ID.API, false)
      : 0,
    apiFeeForeign: includeApiFee
      ? getSessionFeeAmount(fees, FEE_ID.API, true)
      : 0,
    paymentMode: context.paymentMode,
    autoDiscountId: context.autoDiscountId,
  }
}

/**
 * Single-patient save path: same fees as listing, discount via computeBookingDiscounts
 * so auto_discount_type matches POS / save-booking.
 */
export async function pricePublicBookingFees(
  fees: unknown,
  context: PublicPricingContext,
  foriegner: boolean
): Promise<
  | {
      success: true
      professionalFee: number
      hospitalFee: number
      discount: number
      amount: number
      autoDiscountId: string | null
    }
  | { success: false; message: string }
> {
  const discountResult = await computeBookingDiscounts({
    autoDiscountId: context.autoDiscountId,
    manualDiscountId: null,
    payment_method: context.payment_method,
    payment_type: context.payment_type,
    hasCreditCardLine: context.feeContext.hasCreditCardLine,
    session: { fees },
    foriegner,
    strict: true,
  })
  if (!discountResult.success) {
    return { success: false, message: discountResult.message }
  }
  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    fees,
    foriegner,
    context.feeContext
  )
  return {
    success: true,
    professionalFee: professional_fee,
    hospitalFee: hospital_fee,
    discount: discountResult.discount_value,
    amount: roundMoney(professional_fee + hospital_fee - discountResult.discount_value),
    autoDiscountId: context.autoDiscountId,
  }
}
