import type { Permissions } from "@archmage/shared"
import {
  SAVE_BOOKING_METHOD_AGENT,
  SAVE_BOOKING_METHOD_ON_CALL,
  SAVE_BOOKING_METHOD_POS,
  SAVE_BOOKING_METHOD_STAFF,
  SAVE_PAYMENT_TYPE_AGENT,
  SAVE_PAYMENT_TYPE_CASH,
  SAVE_PAYMENT_TYPE_CREDIT,
  SAVE_PAYMENT_TYPE_CREDIT_CARD,
  SAVE_PAYMENT_TYPE_E_WALLET,
  SAVE_PAYMENT_TYPE_MIXED,
  SAVE_PAYMENT_TYPE_SLIP,
} from "@/types/save-booking"

/** User-group resource that limits payment methods on a new channel booking. */
export const BOOKING_PAYMENT_RESOURCE = "channel-booking-payment"

/**
 * One privilege per new-booking payment dropdown entry.
 * uiId matches PAYMENT_METHODS in types/channel-booking.ts.
 */
export const BOOKING_PAYMENT_METHOD_ACTIONS = [
  { uiId: 0, id: "cash", name: "Cash" },
  { uiId: 1, id: "on-call", name: "On Call" },
  { uiId: 2, id: "agent", name: "Agent" },
  { uiId: 3, id: "staff", name: "Staff" },
  { uiId: 4, id: "card", name: "Card" },
  { uiId: 5, id: "slip", name: "Slip" },
  { uiId: 6, id: "credit-customer", name: "Credit Customer" },
  { uiId: 7, id: "e-wallet", name: "E-wallet" },
  { uiId: 8, id: "mixed", name: "Mixed" },
] as const

export type BookingPaymentMethodActionId = (typeof BOOKING_PAYMENT_METHOD_ACTIONS)[number]["id"]

/** Mixed-payment line types, mapped back to the same privileges as the main dropdown. */
export const MIXED_PAYMENT_LINE_METHODS = [
  { value: SAVE_PAYMENT_TYPE_CASH, uiId: 0, label: "Cash" },
  { value: SAVE_PAYMENT_TYPE_CREDIT_CARD, uiId: 4, label: "Credit Card" },
  { value: SAVE_PAYMENT_TYPE_SLIP, uiId: 5, label: "Slip" },
  { value: SAVE_PAYMENT_TYPE_E_WALLET, uiId: 7, label: "E-Wallet" },
] as const

type PaymentPermissionInput = {
  payment_method: number
  payment_type: number
  payment_lines?: { payment_method: number }[] | null
}

/**
 * Groups saved before this privilege existed have no flags.
 * Those groups keep every method. Once any method is saved as true or false,
 * only the methods explicitly turned on are allowed.
 */
export function bookingPaymentPermissionsAreLegacy(
  permissions: Permissions | null | undefined
): boolean {
  const resource = permissions?.[BOOKING_PAYMENT_RESOURCE]
  if (!resource) return true
  return BOOKING_PAYMENT_METHOD_ACTIONS.every(
    (action) => typeof resource[action.id] !== "boolean"
  )
}

export function canUseBookingPaymentMethod(
  permissions: Permissions | null | undefined,
  uiId: number,
  isAdmin = false
): boolean {
  if (isAdmin) return true
  if (bookingPaymentPermissionsAreLegacy(permissions)) return true
  const action = BOOKING_PAYMENT_METHOD_ACTIONS.find((item) => item.uiId === uiId)
  if (!action) return false
  return permissions?.[BOOKING_PAYMENT_RESOURCE]?.[action.id] === true
}

export function allowedBookingPaymentMethodIds(
  permissions: Permissions | null | undefined,
  isAdmin = false
): number[] {
  return BOOKING_PAYMENT_METHOD_ACTIONS.filter((action) =>
    canUseBookingPaymentMethod(permissions, action.uiId, isAdmin)
  ).map((action) => action.uiId)
}

/** Prefer the user's default method when that method is allowed. */
export function pickAllowedBookingPaymentMethodId(
  preferredId: number | null | undefined,
  allowedIds: readonly number[]
): number | null {
  if (preferredId != null && allowedIds.includes(preferredId)) return preferredId
  return allowedIds[0] ?? null
}

export function allowedMixedPaymentLineMethods(
  permissions: Permissions | null | undefined,
  isAdmin = false
) {
  return MIXED_PAYMENT_LINE_METHODS.filter((line) =>
    canUseBookingPaymentMethod(permissions, line.uiId, isAdmin)
  )
}

/**
 * Copy "allow every method" onto flags that were never set, so the group editor
 * matches what booking already allows.
 */
export function materializeLegacyBookingPaymentPermissions(
  permissions: Permissions
): Permissions {
  if (!bookingPaymentPermissionsAreLegacy(permissions)) return permissions
  return {
    ...permissions,
    [BOOKING_PAYMENT_RESOURCE]: Object.fromEntries(
      BOOKING_PAYMENT_METHOD_ACTIONS.map((action) => [action.id, true])
    ),
  }
}

/** UI dropdown id for a saved booking payment, or null when the pair is not a known method. */
export function uiPaymentIdFromSave(paymentMethod: number, paymentType: number): number | null {
  if (paymentMethod === SAVE_BOOKING_METHOD_ON_CALL && paymentType === SAVE_PAYMENT_TYPE_CASH) return 1
  if (paymentMethod === SAVE_BOOKING_METHOD_AGENT && paymentType === SAVE_PAYMENT_TYPE_AGENT) return 2
  if (paymentMethod === SAVE_BOOKING_METHOD_STAFF && paymentType === SAVE_PAYMENT_TYPE_CASH) return 3
  if (paymentMethod === SAVE_BOOKING_METHOD_POS && paymentType === SAVE_PAYMENT_TYPE_CASH) return 0
  if (paymentMethod === SAVE_BOOKING_METHOD_POS && paymentType === SAVE_PAYMENT_TYPE_CREDIT_CARD) return 4
  if (paymentMethod === SAVE_BOOKING_METHOD_POS && paymentType === SAVE_PAYMENT_TYPE_SLIP) return 5
  if (paymentMethod === SAVE_BOOKING_METHOD_POS && paymentType === SAVE_PAYMENT_TYPE_CREDIT) return 6
  if (paymentMethod === SAVE_BOOKING_METHOD_POS && paymentType === SAVE_PAYMENT_TYPE_E_WALLET) return 7
  if (paymentMethod === SAVE_BOOKING_METHOD_POS && paymentType === SAVE_PAYMENT_TYPE_MIXED) return 8
  return null
}

function mixedLineUiId(paymentType: number): number | null {
  return MIXED_PAYMENT_LINE_METHODS.find((line) => line.value === paymentType)?.uiId ?? null
}

/** Null when the group may use this payment. Otherwise a message for the cashier. */
export function bookingPaymentDenialMessage(
  permissions: Permissions | null | undefined,
  isAdmin: boolean,
  input: PaymentPermissionInput
): string | null {
  const uiId = uiPaymentIdFromSave(input.payment_method, input.payment_type)
  if (uiId == null || !canUseBookingPaymentMethod(permissions, uiId, isAdmin)) {
    const name =
      uiId == null
        ? "this payment method"
        : BOOKING_PAYMENT_METHOD_ACTIONS.find((action) => action.uiId === uiId)?.name ??
          "this payment method"
    return `Your group is not allowed to book with ${name}.`
  }
  if (input.payment_type !== SAVE_PAYMENT_TYPE_MIXED) return null
  for (const line of input.payment_lines ?? []) {
    const lineUiId = mixedLineUiId(line.payment_method)
    if (lineUiId == null || !canUseBookingPaymentMethod(permissions, lineUiId, isAdmin)) {
      const name =
        MIXED_PAYMENT_LINE_METHODS.find((item) => item.uiId === lineUiId)?.label ??
        "one of the payment lines"
      return `Your group is not allowed to use ${name} in a mixed payment.`
    }
  }
  return null
}
