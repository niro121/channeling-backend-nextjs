/**
 * Channel booking UI types and constants (e.g. New Booking Details tab).
 */

export type BookingMethodOption = {
  id: number
  name: string
}

export const BOOKING_METHODS: BookingMethodOption[] = [
  { id: 0, name: "POS" },
  { id: 1, name: "On-Call" },
  { id: 2, name: "Agent" },
  { id: 3, name: "Staff" },
  { id: 4, name: "API" },
]

/** Icon key for payment dropdown (maps to Lucide icon in UI). */
export type PaymentMethodIconKey =
  | "Banknote"
  | "Phone"
  | "User"
  | "Users"
  | "CreditCard"
  | "Receipt"
  | "UserCircle"
  | "Wallet"

export type PaymentMethodOption = {
  id: number
  name: string
  /** Icon key for dropdown display (see PAYMENT_ICON_MAP in new-booking-details-tab). */
  icon: PaymentMethodIconKey
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: 0, name: "Cash", icon: "Banknote" },
  { id: 1, name: "OnCall", icon: "Phone" },
  { id: 2, name: "Agent", icon: "User" },
  { id: 3, name: "Staff", icon: "Users" },
  { id: 4, name: "Card", icon: "CreditCard" },
  { id: 5, name: "Slip", icon: "Receipt" },
  { id: 6, name: "Credit Customer", icon: "UserCircle" },
  { id: 7, name: "E-wallet", icon: "Wallet" },
]

/** Title options: use TITLE_OPTIONS from @/types/title (shared with doctor, patient). */

export type SexOption = { id: string; name: string }
export const SEX_OPTIONS: SexOption[] = [
  { id: "male", name: "Male" },
  { id: "female", name: "Female" },
]
