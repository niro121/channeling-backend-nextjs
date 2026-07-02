/**
 * Shared helpers for channel-booking E2E: login, select doctor/session, create booking, select a booking.
 * Everything up to "having a booking selected" is common; each spec then does its path (refund, cancel, settle, change).
 *
 * Doctor → session → booking are passed in by the spec (spec reads env and passes options, like cash-booking-recorded).
 *
 * **Chaining a second run** after a scenario booking step: set `E2E_CAPTURE_OUT=/path/to/capture.json` and/or
 * `E2E_CAPTURE_STDOUT=1` on the channel-booking-scenario run. Then use `readE2EBookingCapture` /
 * `channelBookingTargetFromCaptureFile` in another spec, or copy `suggestedEnv` from stdout into your shell / Admin scenario.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { dirname } from "path"
import { expect } from "@playwright/test"
import type { Page } from "@playwright/test"

const E2E_USER_EMAIL = "developer@archmage.lk"
const E2E_USER_PASSWORD = "Arch321#"

const DEFAULT_PATIENT_NAME = "TEST USER"
const DEFAULT_PATIENT_PHONE = "0772907480"

/** Payment dropdown labels (match `cash-booking-recorded.spec.ts` / channel-booking UI). */
const E2E_UI_PAYMENT_LABELS: Record<number, string> = {
  0: "Cash",
  1: "OnCall",
  2: "Agent",
  3: "Staff",
  4: "Card",
  5: "Slip",
  6: "Credit Customer",
  7: "E-wallet",
}

const E2E_PAYMENT_CODE_TO_ID: Record<string, number> = {
  CASH: 0,
  ON_CALL: 1,
  ONCALL: 1,
  AGENT: 2,
  STAFF: 3,
  CARD: 4,
  SLIP: 5,
  CREDIT: 6,
  E_WALLET: 7,
  EWALLET: 7,
}

const E2E_PAYMENT_COMBOBOX_REGEX = /Cash|OnCall|Agent|Staff|Card|Slip|Credit|E-wallet/

function resolveE2EPrimaryPaymentMethod(codes?: string[]): { id: number; label: string } {
  const cleaned = (codes ?? []).map((c) => String(c).trim()).filter(Boolean)
  const list = cleaned.length ? cleaned : ["CASH"]
  const raw = list[0].toUpperCase().replace(/-/g, "_")
  const id = E2E_PAYMENT_CODE_TO_ID[raw] ?? E2E_PAYMENT_CODE_TO_ID[raw.replace(/_/g, "")] ?? 0
  return { id, label: E2E_UI_PAYMENT_LABELS[id] ?? "Cash" }
}

async function fillE2EPaymentMethodExtras(
  page: Page,
  methodId: number,
  extras: Record<string, string>
): Promise<void> {
  const agencyName = extras.agencyName ?? ""
  const agencyBook = extras.agencyBook ?? ""
  const agencyRef = extras.agencyRef || "01"
  const creditCustomerName = extras.creditCustomerName ?? ""
  const staffName = extras.staffName ?? ""
  const bankName = extras.bankName ?? ""
  const cardLast4 = extras.cardLast4 || "0000"
  const slipRef = extras.slipRef || "E2E-REF"

  if (methodId === 2) {
    await page.getByRole("combobox").filter({ hasText: "Select Agency" }).click({ timeout: 5000 })
    if (agencyName) {
      await page.getByRole("option", { name: agencyName }).click({ timeout: 5000 })
    } else {
      await page.getByRole("option").first().click({ timeout: 5000 })
    }
    await page.waitForTimeout(500)
    await page.getByRole("combobox").filter({ hasText: "Select a Book" }).click({ timeout: 10000 })
    if (agencyBook) {
      await page.getByLabel(agencyBook).getByText(agencyBook).click({ timeout: 5000 })
    } else {
      await page.getByRole("option").first().click({ timeout: 5000 })
    }
    await page.getByRole("textbox", { name: "REF NO. (01–99)" }).click({ timeout: 3000 })
    await page.getByRole("textbox", { name: "REF NO. (01–99)" }).fill(agencyRef)
  } else if (methodId === 6) {
    await page.getByRole("combobox").filter({ hasText: "Select Credit Customer" }).click({ timeout: 5000 })
    if (creditCustomerName) {
      await page.getByRole("option", { name: creditCustomerName }).click({ timeout: 5000 })
    } else {
      await page.getByRole("option").first().click({ timeout: 5000 })
    }
  } else if (methodId === 3) {
    await page.getByRole("combobox").filter({ hasText: "Select Staff Member" }).click({ timeout: 5000 })
    if (staffName) {
      await page.getByText(staffName).click({ timeout: 5000 })
    } else {
      await page.getByRole("option").first().click({ timeout: 5000 })
    }
  } else if (methodId === 4) {
    await page.getByRole("textbox", { name: "Last 4 Digits" }).click({ timeout: 3000 })
    await page.getByRole("textbox", { name: "Last 4 Digits" }).fill(cardLast4)
    await page.getByRole("combobox").filter({ hasText: "Select Bank" }).click({ timeout: 5000 })
    if (bankName) {
      await page.getByRole("option", { name: bankName, exact: true }).click({ timeout: 5000 })
    } else {
      await page.getByRole("option").first().click({ timeout: 5000 })
    }
  } else if (methodId === 5) {
    await page.getByRole("textbox", { name: "Bank Reference" }).click({ timeout: 3000 })
    await page.getByRole("textbox", { name: "Bank Reference" }).fill(slipRef)
    await page.getByRole("combobox").filter({ hasText: "Select Bank" }).click({ timeout: 5000 })
    if (bankName) {
      await page.getByRole("option", { name: bankName }).click({ timeout: 5000 })
    } else {
      await page.getByRole("option").first().click({ timeout: 5000 })
    }
  }
}

export type CreateCashBookingOptions = {
  /** Text before ` ( Method ) `. Defaults to `TEST USER` when using object form without `patientBaseName`. */
  patientBaseName?: string
  /** First code wins (e.g. `CASH`, `ON_CALL`). Same as Admin scenario checkboxes. */
  paymentMethods?: string[]
  /** Agent / Card / … extras; see `cash-booking-recorded.spec.ts`. */
  bookingExtras?: Record<string, string>
}

export type ChannelBookingTarget = {
  /**
   * Consultant field text. Defaults to "TEST DOCTOR" when omitted.
   * Admin Run E2E: same **Doctor** combobox as reports (`formatDoctorName` list); choosing **TEST DOCTOR** leaves config empty so these code defaults apply; any other doctor saves the same label for search and click.
   */
  doctorSearch?: string
  /**
   * Doctor row to click after search. Defaults to "MR. TEST DOCTOR" when omitted.
   * Admin UI sets this equal to `doctorSearch` for non–TEST DOCTOR picks.
   */
  doctorSelect?: string
  /**
   * 1-based index among **bookable** session rows for that doctor (not on leave), in list order.
   * The channel-booking UI loads sessions for the selected **date** (defaults to **today**) and branch.
   * If set (≥ 1), takes precedence over `sessionButtonText`.
   */
  sessionIndex?: number
  /**
   * Substring match (case-insensitive) against the session row button’s accessible name — same text you see on the row (day, date, time, fee, counts, next #, etc.).
   * When omitted and `sessionIndex` is omitted, the first bookable session is used.
   */
  sessionButtonText?: string
  /** Appointment number to select in bookings table (e.g. "29"). When set, selects that booking (no new booking created). */
  appointmentNo?: string
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Session list buttons that are not marked on leave (bookable rows). */
function bookableSessionButtons(page: Page) {
  return page.locator("li button").filter({ hasNot: page.getByText("On leave") })
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
  const doctorSearch = (options.doctorSearch?.trim() || "TEST DOCTOR")
  const doctorSelect = (options.doctorSelect?.trim() || "MR. TEST DOCTOR")
  const sessionButtonText = options.sessionButtonText?.trim()
  const sessionIndex = options.sessionIndex

  await page.getByRole("textbox", { name: "Consultant" }).click()
  await page.getByRole("textbox", { name: "Consultant" }).fill(doctorSearch)
  await page.getByText(doctorSelect, { exact: false }).click({ timeout: 10000 })
  await page.waitForTimeout(500)

  await page.getByRole("status", { name: "Loading sessions" }).waitFor({ state: "hidden", timeout: 20000 }).catch(() => {})

  const idx = typeof sessionIndex === "number" && Number.isFinite(sessionIndex) ? Math.floor(sessionIndex) : NaN
  if (!Number.isNaN(idx) && idx >= 1) {
    await bookableSessionButtons(page).nth(idx - 1).click({ timeout: 10000 })
  } else if (sessionButtonText) {
    await bookableSessionButtons(page)
      .filter({ hasText: new RegExp(escapeRegExp(sessionButtonText), "i") })
      .first()
      .click({ timeout: 10000 })
  } else {
    await bookableSessionButtons(page).first().click({ timeout: 10000 })
  }
  await page.waitForTimeout(500)
  await expect(page.getByPlaceholder("PATIENT NAME")).toBeVisible({ timeout: 10000 })
}

/**
 * Create one booking for the current session (New Booking Details).
 * Patient field is always `{base} ( {payment method label} )` — same pattern as `cash-booking-recorded.spec.ts`.
 *
 * - `createCashBooking(page)` → base `TEST USER E2E`, Cash.
 * - `createCashBooking(page, "Step1")` → base `TEST USER Step1`, Cash.
 * - `createCashBooking(page, { patientBaseName: "ACME", paymentMethods: ["ON_CALL"] })` → `ACME ( OnCall )`.
 */
export async function createCashBooking(
  page: Page,
  legacySuffixOrOptions?: string | CreateCashBookingOptions
): Promise<void> {
  let opts: CreateCashBookingOptions
  if (legacySuffixOrOptions === undefined) {
    opts = {
      patientBaseName: `${DEFAULT_PATIENT_NAME} E2E`,
      paymentMethods: ["CASH"],
      bookingExtras: {},
    }
  } else if (typeof legacySuffixOrOptions === "string") {
    const s = legacySuffixOrOptions.trim()
    opts = {
      patientBaseName: s ? `${DEFAULT_PATIENT_NAME} ${s}`.trim() : `${DEFAULT_PATIENT_NAME} E2E`,
      paymentMethods: ["CASH"],
      bookingExtras: {},
    }
  } else {
    opts = {
      paymentMethods: ["CASH"],
      bookingExtras: {},
      ...legacySuffixOrOptions,
    }
    if (!opts.patientBaseName?.trim()) {
      opts.patientBaseName = DEFAULT_PATIENT_NAME
    }
  }

  const method = resolveE2EPrimaryPaymentMethod(opts.paymentMethods)
  const base = opts.patientBaseName!.trim()
  const patientName = `${base} ( ${method.label} )`

  await page.getByRole("combobox").filter({ hasText: E2E_PAYMENT_COMBOBOX_REGEX }).first().click({ timeout: 5000 })
  await page.getByRole("option", { name: method.label }).click({ timeout: 5000 })
  await fillE2EPaymentMethodExtras(page, method.id, opts.bookingExtras ?? {})

  await page.getByRole("combobox").filter({ hasText: /Title/i }).first().click()
  await page.getByRole("option", { name: "MR." }).click()
  await page.getByPlaceholder("PATIENT NAME").fill(patientName)
  await page.getByPlaceholder(/phone number/i).fill(DEFAULT_PATIENT_PHONE)
  await page.getByText("Select Area", { exact: true }).click({ timeout: 8000 })
  await page.getByRole("option").first().click()
  await page.getByRole("button", { name: /Book Now/i }).click()
  await expect(page.getByText(/booking saved|saved successfully/i).first()).toBeVisible({ timeout: 15000 })
}

/** Values read from the Information → Booking tab after a successful create (that booking stays selected). */
export type E2ECapturedBookingDetails = {
  /** Consultant combobox value (search text). */
  consultantSearch: string
  /** Consultant label from booking details (use as `doctorSelect` when re-running). */
  consultantDisplay: string
  /** Appointment number as shown in details (zero-padded). */
  appointmentNo: string
  appointmentDate: string
  appointmentTime: string
}

/**
 * Read doctor + appointment fields from the Booking tab (bottom panel).
 * After `createCashBooking`, the app selects the new booking and opens this tab — details load asynchronously.
 */
export async function captureCreatedBookingDetails(page: Page): Promise<E2ECapturedBookingDetails> {
  const tabPanel = page
    .getByRole("tabpanel")
    .filter({ visible: true })
    .filter({ has: page.getByText("Appo. No", { exact: true }) })
    .first()
  await expect(tabPanel.getByText("Appo. No", { exact: true })).toBeVisible({ timeout: 20000 })

  const readRow = async (label: string) => {
    const row = tabPanel
      .locator("div.flex.justify-between.gap-2")
      .filter({ has: tabPanel.getByText(label, { exact: true }) })
      .first()
    await expect(row).toBeVisible({ timeout: 10000 })
    return (await row.locator("> span").nth(1).innerText()).trim()
  }

  await expect(async () => {
    const no = await readRow("Appo. No")
    expect(no.length).toBeGreaterThan(0)
    expect(no).not.toBe("—")
  }).toPass({ timeout: 20000 })

  const consultantSearch = (await page.getByRole("textbox", { name: "Consultant" }).inputValue()).trim()
  const [consultantDisplay, appointmentNo, appointmentDate, appointmentTime] = await Promise.all([
    readRow("Consultant"),
    readRow("Appo. No"),
    readRow("Date"),
    readRow("Time"),
  ])

  return {
    consultantSearch,
    consultantDisplay,
    appointmentNo,
    appointmentDate,
    appointmentTime,
  }
}

/** Suggested `sessionButtonText` substring for the same session row (either date or time usually matches the list). */
export function sessionButtonTextHintFromCapture(c: E2ECapturedBookingDetails): string {
  const t = c.appointmentTime?.trim()
  if (t) return t
  return c.appointmentDate?.trim() || ""
}

export function writeE2EBookingCapture(filePath: string, data: E2ECapturedBookingDetails): void {
  const dir = dirname(filePath)
  if (dir && dir !== ".") mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8")
}

export function readE2EBookingCapture(filePath: string): E2ECapturedBookingDetails | null {
  if (!existsSync(filePath)) return null
  return JSON.parse(readFileSync(filePath, "utf8")) as E2ECapturedBookingDetails
}

/** Build `ChannelBookingTarget` fields from a capture file (for a follow-up Playwright run). */
export function channelBookingTargetFromCaptureFile(
  filePath: string
): Pick<ChannelBookingTarget, "doctorSearch" | "doctorSelect" | "sessionButtonText" | "appointmentNo"> | null {
  const c = readE2EBookingCapture(filePath)
  if (!c) return null
  const raw = c.appointmentNo.trim()
  const n = parseInt(raw, 10)
  const appointmentNo = Number.isFinite(n) ? String(n) : raw
  return {
    doctorSearch: c.consultantSearch || undefined,
    doctorSelect: c.consultantDisplay || undefined,
    sessionButtonText: sessionButtonTextHintFromCapture(c) || undefined,
    appointmentNo,
  }
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
  options: ChannelBookingTarget & {
    bookingSuffix?: string
    selectFirstOnly?: boolean
    /** Base patient name; final name will be `{patientBaseName} ( Cash )` (Cash is used for this helper). */
    patientBaseName?: string
  } = {}
): Promise<void> {
  await loginAndGoToChannelBooking(page)

  await selectDoctorAndSession(page, {
    doctorSearch: options.doctorSearch,
    doctorSelect: options.doctorSelect,
    sessionIndex: options.sessionIndex,
    sessionButtonText: options.sessionButtonText,
  })

  const appointmentNo = options.appointmentNo?.trim()
  if (appointmentNo) {
    await selectBooking(page, appointmentNo)
  } else if (options.selectFirstOnly) {
    await selectFirstBooking(page)
  } else {
    if (options.patientBaseName?.trim()) {
      await createCashBooking(page, {
        patientBaseName: options.patientBaseName.trim(),
        paymentMethods: ["CASH"],
        bookingExtras: {},
      })
    } else {
      await createCashBooking(page, options.bookingSuffix ?? "E2E")
    }
    await selectFirstBooking(page)
  }
}

/** Get credentials (for specs that only need to assert env). */
export function getE2ECredentials(): { email: string; password: string } {
  return { email: E2E_USER_EMAIL, password: E2E_USER_PASSWORD }
}

/** `E2E_SESSION_INDEX=1` → first bookable session; `2` → second, etc. */
export function parseE2ESessionIndexEnv(): number | undefined {
  const raw = process.env.E2E_SESSION_INDEX?.trim()
  if (!raw) return undefined
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 1 ? n : undefined
}
