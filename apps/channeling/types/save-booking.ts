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

/** Spec: payment_type 0=Cash, 1=Credit Card, 2=Slip, 3=Cheque, 4=Agent, 5=Credit Customer, 6=E-wallet */
export const SAVE_PAYMENT_TYPE_CASH = 0
export const SAVE_PAYMENT_TYPE_CREDIT_CARD = 1
export const SAVE_PAYMENT_TYPE_SLIP = 2
export const SAVE_PAYMENT_TYPE_CHEQUE = 3
export const SAVE_PAYMENT_TYPE_AGENT = 4
export const SAVE_PAYMENT_TYPE_CREDIT = 5
export const SAVE_PAYMENT_TYPE_E_WALLET = 6
export const SAVE_PAYMENT_TYPE_MIXED = 7

/**
 * Maps UI payment dropdown id (PAYMENT_METHODS 0–7: Cash, OnCall, Agent, Staff, Card, Slip, Credit Customer, E-wallet)
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
    6: { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_CREDIT },
    7: { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_E_WALLET },
    8: { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_MIXED },
  }
  return map[uiPaymentId] ?? { payment_method: SAVE_BOOKING_METHOD_POS, payment_type: SAVE_PAYMENT_TYPE_CASH }
}

/** Error codes returned by save-booking action (spec §7). All SCREAMING_SNAKE_CASE. */
export type SaveBookingErrorCode =
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "INVALID_SESSION"
  | "SERVER_ERROR"
  | "PREVIOUS_SESSION_FILL"
  | "DISCOUNT_ERROR"
  | "AMOUNT_ERROR"
  | "LIMIT_EXCEEDED"
  /** Soft limit: booking amount > agency prepaid (PAYABLE balance) + Agency.allowedCreditLimit (agent only). */
  | "AGENCY_CREDIT_EXCEED"
  | "CREDIT_LIMIT_VIOLATION"
  | "AGENCY_REF_ERROR"
  | "AGENCY_NO_LINKED_ACCOUNT"
  | "CASH_BOOK_NOT_FOUND"
  | "CASHIER_ACCOUNT_ERROR"
  | "AGENT_ACCOUNT_NOT_FOUND"
  | "CREDIT_CUSTOMER_ACCOUNT_NOT_FOUND"
  | "DOCTOR_PAYABLE_ACCOUNT_NOT_FOUND"
  /** Hard limit: Account.minBalanceAllowed would be violated when posting the journal (agent or credit customer). */
  | "INSUFFICIENT_BALANCE"

export type SaveBookingAreaRef = { id: string; name: string }
export type SaveBookingSessionRef = { id: string }
export type SaveBookingDoctorRef = { id: string; title?: string; name?: string }
export type SaveBookingAgencyRef = { id: string }
export type SaveBookingCreditCustomerRef = { id: string }
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
  payment_lines?: Array<{
    payment_method: number
    amount: number
    bank?: { id: string; name?: string } | null
    card?: string
    slip_ref?: string
    /** Slip date YYYY-MM-DD when payment_method is Slip */
    slip_date?: string
    ewallet_ref?: string
  }>
  agency?: SaveBookingAgencyRef | null
  agency_book_id?: string
  agency_leaf?: string
  agency_ref?: string
  credit_customer?: SaveBookingCreditCustomerRef | null
  bank?: SaveBookingBankRef | null
  slip_ref?: string
  /** Slip date YYYY-MM-DD when payment_type is Slip */
  slip_date?: string
  card?: string
  ewallet_ref?: string
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
  /**
   * When set, book this exact appointment number. Requires `forceAppointmentNo` when the slot is blocked or below the next auto number.
   * With `forceAppointmentNo`, the server only accepts numbers that are blocked on the session.
   */
  forcedAppointmentNo?: number | null
  /**
   * Must be true when forcing a blocked number or a number below the next auto slot.
   * Server-side: when true, the number must be in the session’s blocked list (forced booking into a blocked slot only).
   */
  forceAppointmentNo?: boolean
  /** HMIS FHIR Patient id when selected via Search Patient. */
  hmisPatientId?: string | null
  /** HMIS MRN when available from FHIR Patient. */
  hmisMrn?: string | null
}

export type SaveBookingResult = {
  success: boolean
  data?: unknown
  errorCode?: SaveBookingErrorCode
  message?: string
}
