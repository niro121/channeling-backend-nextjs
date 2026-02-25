/**
 * Save booking API types, payment mapping, and error codes.
 * See docs/SAVE_BOOKING_SERVICE_SPECIFICATION.md.
 */

/** Spec: payment_method 0=POS, 1=On-Call, 2=Agent, 3=Staff, 4=API */
export const SAVE_BOOKING_METHOD_POS = 0
export const SAVE_BOOKING_METHOD_ON_CALL = 1
export const SAVE_BOOKING_METHOD_AGENT = 2
export const SAVE_BOOKING_METHOD_STAFF = 3
export const SAVE_BOOKING_METHOD_API = 4

/** Spec: payment_type 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque, 4=Agent */
export const SAVE_PAYMENT_TYPE_CASH = 0
export const SAVE_PAYMENT_TYPE_CREDIT_CARD = 1
export const SAVE_PAYMENT_TYPE_SLIP = 2
export const SAVE_PAYMENT_TYPE_CHEQUE = 3
export const SAVE_PAYMENT_TYPE_AGENT = 4

/**
 * Maps UI payment dropdown id (PAYMENT_METHODS 0–5: Cash, OnCall, Agent, Staff, Card, Slip)
 * to spec payment_method and payment_type.
 */
export function getPaymentMethodAndType(uiPaymentId: number): {
  payment_method: number
  payment_type: number
} {
  const map: Record<number, { payment_method: number; payment_type: number }> = {
    0: { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_CASH },
    1: { payment_method: SAVE_BOOKING_METHOD_ON_CALL, payment_type: SAVE_PAYMENT_TYPE_CASH },
    2: { payment_method: SAVE_BOOKING_METHOD_AGENT, payment_type: SAVE_PAYMENT_TYPE_AGENT },
    3: { payment_method: SAVE_BOOKING_METHOD_STAFF, payment_type: SAVE_PAYMENT_TYPE_CASH },
    4: { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_CREDIT_CARD },
    5: { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_SLIP },
  }
  return map[uiPaymentId] ?? { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_CASH }
}

/** Error codes returned by save-booking action (spec §7). */
export type SaveBookingErrorCode =
  | "forbidden"
  | "invalid_input"
  | "invalid_session"
  | "server_error"
  | "previousessionfill"
  | "discountError"
  | "amountError"
  | "limitexceeded"
  | "agencyCreditExceed"
  | "agencyRefError"

export type SaveBookingAreaRef = { id: string; name: string }
export type SaveBookingSessionRef = { id: string }
export type SaveBookingDoctorRef = { id: string; title?: string; name?: string }
export type SaveBookingAgencyRef = { id: string }
export type SaveBookingBankRef = { id: string; name?: string }
export type SaveBookingStaffRef = { id: string; working_department?: string }
export type SaveBookingReferredRef = { id: string }

/**
 * Input for save-booking. Session and doctor are referenced by id; server loads full session from DB.
 */
export type SaveBookingInput = {
  name: string
  title: string
  sex: string
  phone: string
  area: SaveBookingAreaRef
  remarks?: string
  foriegner: boolean
  payment_method: number
  payment_type: number
  agency?: SaveBookingAgencyRef | null
  agency_ref?: string
  bank?: SaveBookingBankRef | null
  slip_ref?: string
  card?: string
  staff?: SaveBookingStaffRef | null
  session: SaveBookingSessionRef
  doctor: SaveBookingDoctorRef
  amount: number
  auto_discount_type?: string
  discount_type?: string
  /** Required when discount_type is a voucher scheme (isVoucher === 1). */
  voucher_code?: string
  discount: number
  referred_doctor?: SaveBookingReferredRef | null
  referred_agency?: SaveBookingReferredRef | null
  referred_staff?: SaveBookingReferredRef | null
}

export type SaveBookingResult = {
  success: boolean
  data?: unknown
  errorCode?: SaveBookingErrorCode
  message?: string
}
