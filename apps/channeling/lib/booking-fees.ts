/**
 * Payment-aware session fee selection.
 * Session.fees is a catalog of every component; booking totals include a subset.
 *
 * Fee IDs match FEE_TYPES in types/doctor.session.ts:
 * 0 Doctor, 1 Hospital, 2 Agency, 3 Scan, 4 On-Call, 5 Credit Card Commission.
 */

import {
  SAVE_BOOKING_METHOD_AGENT,
  SAVE_BOOKING_METHOD_ON_CALL,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_MIXED,
} from "@/types/save-booking"

export const FEE_ID = {
  DOCTOR: 0,
  HOSPITAL: 1,
  AGENCY: 2,
  SCAN: 3,
  ON_CALL: 4,
  CREDIT_CARD: 5,
} as const

export type BookingFeeContext = {
  payment_method: number
  payment_type: number
  hasCreditCardLine?: boolean
}

type FeeEntry = {
  id?: string | number
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

function resolveFeeId(fee: FeeEntry, index: number): number {
  if (fee.id != null && fee.id !== "") {
    const n = Number(fee.id)
    if (!Number.isNaN(n)) return n
  }
  return index
}

/** True when paying by Card, or Mixed with a Credit Card line. */
export function hasCreditCardPayment(
  payment_type: number,
  paymentLines?: Array<{ payment_method: number }> | null
): boolean {
  if (payment_type === SAVE_PAYMENT_TYPE_CREDIT_CARD) return true
  if (payment_type !== SAVE_PAYMENT_TYPE_MIXED) return false
  return (paymentLines ?? []).some(
    (line) => line.payment_method === SAVE_PAYMENT_TYPE_CREDIT_CARD
  )
}

/**
 * Booking-type fee set, then Credit Card Commission (id 5) is unioned when
 * hasCreditCardLine is true (Card pay, Mixed with a Card line, or settle by Card).
 *
 * Agent, On-Call, Cash / Staff / Slip / Credit Customer / E-wallet always include
 * Credit Card Commission so a settlement-method discount can offset it.
 * Doctor + Hospital + Scan is the base set for every booking type.
 */
export function getApplicableFeeIds(
  payment_method: number,
  payment_type: number,
  hasCreditCardLine = false
): number[] {
  let ids: number[]
  if (payment_method === SAVE_BOOKING_METHOD_AGENT) {
    ids = [FEE_ID.DOCTOR, FEE_ID.HOSPITAL, FEE_ID.SCAN, FEE_ID.AGENCY, FEE_ID.CREDIT_CARD]
  } else if (payment_method === SAVE_BOOKING_METHOD_ON_CALL) {
    ids = [FEE_ID.DOCTOR, FEE_ID.HOSPITAL, FEE_ID.SCAN, FEE_ID.ON_CALL, FEE_ID.CREDIT_CARD]
  } else if (payment_type === SAVE_PAYMENT_TYPE_CREDIT_CARD) {
    ids = [FEE_ID.DOCTOR, FEE_ID.HOSPITAL, FEE_ID.SCAN, FEE_ID.CREDIT_CARD]
  } else if (payment_type === SAVE_PAYMENT_TYPE_MIXED && hasCreditCardLine) {
    ids = [FEE_ID.DOCTOR, FEE_ID.HOSPITAL, FEE_ID.SCAN, FEE_ID.CREDIT_CARD]
  } else {
    ids = [FEE_ID.DOCTOR, FEE_ID.HOSPITAL, FEE_ID.SCAN, FEE_ID.CREDIT_CARD]
  }
  if (hasCreditCardLine && !ids.includes(FEE_ID.CREDIT_CARD)) {
    ids = [...ids, FEE_ID.CREDIT_CARD]
  }
  return ids
}

/**
 * Split session fees into professional (Doctor) vs hospital (selected others).
 * When context is omitted, sums every row after Doctor (full catalog).
 */
export function getRefundFeeTypes(
  fees: unknown,
  foriegner: boolean,
  context?: BookingFeeContext
): { professional_fee: number; hospital_fee: number } {
  const arr = parseFees(fees)
  if (!context) {
    const professional_fee = arr.length > 0 ? getValue(arr[0], foriegner) : 0
    const hospital_fee = arr.slice(1).reduce((sum, f) => sum + getValue(f, foriegner), 0)
    return { professional_fee, hospital_fee }
  }

  const allowed = new Set(
    getApplicableFeeIds(
      context.payment_method,
      context.payment_type,
      context.hasCreditCardLine === true
    )
  )
  let professional_fee = 0
  let hospital_fee = 0
  arr.forEach((fee, index) => {
    const id = resolveFeeId(fee, index)
    if (!allowed.has(id)) return
    const value = getValue(fee, foriegner)
    if (id === FEE_ID.DOCTOR) professional_fee += value
    else hospital_fee += value
  })
  return { professional_fee, hospital_fee }
}

export function computeBookingBaseAmount(
  fees: unknown,
  foriegner: boolean,
  context?: BookingFeeContext
): number {
  const { professional_fee, hospital_fee } = getRefundFeeTypes(fees, foriegner, context)
  return professional_fee + hospital_fee
}

export function toBookingFeeContext(
  payment_method: number,
  payment_type: number,
  paymentLines?: Array<{ payment_method: number }> | null
): BookingFeeContext {
  return {
    payment_method,
    payment_type,
    hasCreditCardLine: hasCreditCardPayment(payment_type, paymentLines),
  }
}
