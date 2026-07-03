import prisma from "@/lib/prisma"
import { DiscountMethod, PaymentType } from "@prisma/client"
import { getRefundFeeTypes } from "./get-refund-fee-types"

/** Only session.fees is used (for professional/hospital fee split). */
export type SessionForDiscount = { fees: unknown }

/** Spec payment_method 0=POS, 1=On-Call, 2=Agent, 3=Staff, 4=API -> Prisma DiscountMethod */
const PAYMENT_METHOD_TO_ENUM: Record<number, DiscountMethod> = {
  0: DiscountMethod.POS,
  1: DiscountMethod.ON_CALL,
  2: DiscountMethod.AGENT,
  3: DiscountMethod.STAFF,
  4: DiscountMethod.API,
}

/** Spec payment_type 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque, 4=Agent, 5=Credit Customer, 6=E-wallet -> Prisma PaymentType (Agent/Credit/E-wallet use CASH for discount) */
const PAYMENT_TYPE_TO_ENUM: Record<number, PaymentType> = {
  0: PaymentType.CASH,
  1: PaymentType.CREDIT_CARD,
  2: PaymentType.SLIP,
  3: PaymentType.CHEQUE,
  4: PaymentType.CASH,
  5: PaymentType.CASH,
  6: PaymentType.CASH,
}

export type ProcessedDiscountResult = {
  status: boolean
  message?: string
  discount_value: number
  other_discount: number
  professionsal_fee_discount: number
  hospital_fee_discount: number
}

/**
 * Spec §6.3. Load discount, validate date range and payment method/type, apply and return split.
 */
export async function getProcessedDiscount(
  discountId: string,
  payment_method: number,
  payment_type: number,
  session: SessionForDiscount,
  foriegner: boolean
): Promise<ProcessedDiscountResult> {
  const zeroAmounts = {
    discount_value: 0,
    other_discount: 0,
    professionsal_fee_discount: 0,
    hospital_fee_discount: 0,
  }

  const discount = await prisma.discount.findUnique({
    where: { id: discountId },
  })

  if (!discount || discount.status !== 1) {
    return {
      status: false,
      message: "Discount has Expired or Inactive.",
      ...zeroAmounts,
    }
  }

  const now = new Date()
  if (now < discount.fromDate || now > discount.toDate) {
    return {
      status: false,
      message: "Discount has Expired or Inactive.",
      ...zeroAmounts,
    }
  }

  const methodEnum = PAYMENT_METHOD_TO_ENUM[payment_method]
  const typeEnum = PAYMENT_TYPE_TO_ENUM[payment_type]
  if (
    methodEnum != null &&
    !discount.discountMethod.includes(methodEnum)
  ) {
    return { status: false, message: "Discount not applicable for this booking method.", ...zeroAmounts }
  }
  if (typeEnum != null && !discount.paymentType.includes(typeEnum)) {
    return { status: false, message: "Discount not applicable for this payment type.", ...zeroAmounts }
  }

  const { professional_fee, hospital_fee } = getRefundFeeTypes(
    session.fees,
    foriegner
  )
  const value = foriegner ? discount.discountValueForeign : discount.discountValue

  let discount_value = 0
  let professionsal_fee_discount = 0
  let hospital_fee_discount = 0

  if (discount.discountType === 0) {
    if (discount.applyTo === 0) {
      hospital_fee_discount = Math.round((hospital_fee * value) / 100)
      discount_value = hospital_fee_discount
    } else {
      professionsal_fee_discount = Math.round((professional_fee * value) / 100)
      discount_value = professionsal_fee_discount
    }
  } else {
    if (discount.applyTo === 0) {
      hospital_fee_discount = Math.min(value, hospital_fee)
      discount_value = hospital_fee_discount
    } else {
      professionsal_fee_discount = Math.min(value, professional_fee)
      discount_value = professionsal_fee_discount
    }
  }

  return {
    status: true,
    discount_value,
    other_discount: 0,
    professionsal_fee_discount,
    hospital_fee_discount,
  }
}
