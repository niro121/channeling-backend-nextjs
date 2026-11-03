/**
 * Settle flow: common path (login → doctor → session → [create or select] booking).
 * Then Settle tab → payment method (Cash) → submit.
 *
 * Run: npm run test:e2e -- settle-booking
 * Pass doctor → session → booking: E2E_DOCTOR_SEARCH=... E2E_DOCTOR_SELECT=... E2E_SESSION=... (substring) E2E_SESSION_INDEX=... E2E_APPOINTMENT_NO=...
 * Credentials: E2E_USER_EMAIL=... E2E_USER_PASSWORD=...
 */
import { test, expect } from "@playwright/test"
import {
  goToChannelBookingWithBookingSelected,
  getE2ECredentials,
  parseE2ESessionIndexEnv,
} from "./channel-booking-common"

const E2E_DOCTOR_SEARCH = process.env.E2E_DOCTOR_SEARCH ?? ""
const E2E_DOCTOR_SELECT = process.env.E2E_DOCTOR_SELECT ?? ""
const E2E_SESSION = process.env.E2E_SESSION ?? ""
const E2E_SESSION_INDEX = parseE2ESessionIndexEnv()
const E2E_APPOINTMENT_NO = process.env.E2E_APPOINTMENT_NO ?? ""

test.describe("Settle booking", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getE2ECredentials()
    if (!email || !password) test.skip()
  })

  test("settle flow - select pending booking then settle as Cash", async ({ page }) => {
    const hasTarget = !!(E2E_DOCTOR_SEARCH || E2E_SESSION || E2E_SESSION_INDEX != null)
    await goToChannelBookingWithBookingSelected(page, {
      doctorSearch: E2E_DOCTOR_SEARCH || undefined,
      doctorSelect: E2E_DOCTOR_SELECT || undefined,
      sessionIndex: E2E_SESSION_INDEX,
      sessionButtonText: E2E_SESSION || undefined,
      appointmentNo: E2E_APPOINTMENT_NO || undefined,
      bookingSuffix: "Settle",
      selectFirstOnly: hasTarget && !E2E_APPOINTMENT_NO,
    })

    await page.getByRole("tab", { name: "Settle" }).click({ timeout: 5000 })
    await page.waitForTimeout(500)

    // If booking is already paid we see "Booking already paid"; if pending we see Payment Method (Cash) and "Settle Now (Rs. ...)"
    const settleButton = page.getByRole("button", { name: /Settle Now \(Rs\./ })
    await settleButton.waitFor({ state: "visible", timeout: 8000 })
    await settleButton.click({ timeout: 5000 })

    await expect(
      page.getByText(/Settled|Payment recorded|already paid/i)
    ).toBeVisible({ timeout: 15000 })
  })
})
