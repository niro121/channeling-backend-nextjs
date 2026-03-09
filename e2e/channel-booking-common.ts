/**
 * Shared helpers for channel-booking E2E: login, select doctor/session, create booking, select a booking.
 * Everything up to "having a booking selected" is common; each spec then does its path (refund, cancel, settle, change).
 *
 * Doctor → session → booking are passed in by the spec (spec reads env and passes options, like cash-booking-recorded).
 */

import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

const E2E_USER_EMAIL = "developer@archmage.lk"
const E2E_USER_PASSWORD = "Arch321#"

const DEFAULT_PATIENT_NAME = "TEST USER"
const DEFAULT_PATIENT_PHONE = "0772907480"

export type ChannelBookingTarget = {
  /** Consultant search text (e.g. "test"). Defaults to "Test Doctor" when omitted. */
  doctorSearch?: string
  /** Doctor option to click after search (e.g. "MR. TEST DOCTOR"). Defaults when omitted. */
  doctorSelect?: string
  /** Session button text to click (e.g. "Mon Mar/9/26 1:00 PM 200 29("). When omitted, first non–on-leave session. */
  sessionButtonText?: string
  /** Appointment number to select in bookings table (e.g. "29"). When set, selects that booking (no new booking created). */
  appointmentNo?: string
}

/** Login and navigate to channel-booking. */
export async function loginAndGoToChannelBooking(page: Page): Promise<void> {
  await page.goto("/login", { waitUntil: "domcontentloaded" })
  await page.getByRole("textbox", { name: "Email or username" }).fill(E2E_USER_EMAIL)
  await page.locator("#password").fill(E2E_USER_PASSWORD)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 60000 })
  await page.goto("/channel-booking", { waitUntil: "domcontentloaded" })
  await page.waitForLoadState("networkidle")
}

/**
 * Select consultant (doctor) then session. All values come from the passed options (no env reads).
 */
export async function selectDoctorAndSession(
  page: Page,
  options: ChannelBookingTarget = {}
): Promise<void> {
  const doctorSearch = (options.doctorSearch?.trim() || "Test Doctor")
  const doctorSelect = (options.doctorSelect?.trim() || "MR. TEST DOCTOR")
  const sessionButtonText = options.sessionButtonText?.trim()

  await page.getByRole("textbox", { name: "Consultant" }).click()
  await page.getByRole("textbox", { name: "Consultant" }).fill(doctorSearch)
  await page.getByText(doctorSelect, { exact: false }).click({ timeout: 10000 })
  await page.waitForTimeout(500)

  if (sessionButtonText) {
    await page.getByRole("button", { name: sessionButtonText }).click({ timeout: 10000 })
  } else {
    const sessionButton = page
      .locator("li button")
      .filter({ hasNot: page.getByText("On leave") })
      .first()
    await sessionButton.click({ timeout: 10000 })
  }
  await page.waitForTimeout(500)
  await expect(page.getByPlaceholder("PATIENT NAME")).toBeVisible({ timeout: 10000 })
}

/**
 * Create a single Cash booking for the current session (New Booking Details).
 * Leaves the booking saved and session still selected.
 */
export async function createCashBooking(
  page: Page,
  patientSuffix: string = "E2E"
): Promise<void> {
  const patientName = `${DEFAULT_PATIENT_NAME} ( ${patientSuffix} )`
  await page.getByRole("combobox").filter({ hasText: /Cash|OnCall|Agent|Staff|Card|Slip|Credit|E-wallet/ }).first().click({ timeout: 5000 })
  await page.getByRole("option", { name: "Cash" }).click({ timeout: 5000 })
  await page.getByRole("combobox").filter({ hasText: /Title/i }).first().click()
  await page.getByRole("option", { name: "MR." }).click()
  await page.getByPlaceholder("PATIENT NAME").fill(patientName)
  await page.getByPlaceholder(/phone number/i).fill(DEFAULT_PATIENT_PHONE)
  await page.getByText("Select Area", { exact: true }).click({ timeout: 8000 })
  await page.getByRole("option").first().click()
  await page.getByRole("button", { name: /Book Now/i }).click()
  await expect(page.getByText(/booking saved|saved successfully/i).first()).toBeVisible({ timeout: 15000 })
}

/**
 * Select a booking in the Bookings list (left panel). All values from passed args (no env reads).
 * @param appointmentNo - If set, click the row that contains the cell with this appointment number (e.g. "29"). Otherwise click first row.
 */
export async function selectBooking(
  page: Page,
  appointmentNo?: string
): Promise<void> {
  const no = appointmentNo?.trim()
  if (no) {
    const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: no }) })
    await row.click({ timeout: 5000 })
  } else {
    const firstRow = page.locator("table tbody tr").first()
    await firstRow.click({ timeout: 5000 })
  }
  await page.waitForTimeout(300)
}

/**
 * Select the first booking in the Bookings list. Convenience for selectBooking(page).
 */
export async function selectFirstBooking(page: Page): Promise<void> {
  await selectBooking(page)
}

/**
 * Full common path to "booking selected". All targeting comes from the passed options (no env reads).
 * - If options.appointmentNo is set: login → doctor → session → select that booking by number (no create).
 * - If options.selectFirstOnly is true (e.g. for chained steps: "cancel the booking we just created"): login → doctor → session → select first booking in list (no create). Use same doctor/session as step 1 and leave appointment no empty.
 * - Otherwise: login → doctor → session → create one cash booking → select first booking.
 */
export async function goToChannelBookingWithBookingSelected(
  page: Page,
  options: ChannelBookingTarget & { bookingSuffix?: string; selectFirstOnly?: boolean } = {}
): Promise<void> {
  await loginAndGoToChannelBooking(page)

  await selectDoctorAndSession(page, {
    doctorSearch: options.doctorSearch,
    doctorSelect: options.doctorSelect,
    sessionButtonText: options.sessionButtonText,
  })

  const appointmentNo = options.appointmentNo?.trim()
  if (appointmentNo) {
    await selectBooking(page, appointmentNo)
  } else if (options.selectFirstOnly) {
    await selectFirstBooking(page)
  } else {
    await createCashBooking(page, options.bookingSuffix ?? "E2E")
    await selectFirstBooking(page)
  }
}

/** Get credentials (for specs that only need to assert env). */
export function getE2ECredentials(): { email: string; password: string } {
  return { email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD }
}
