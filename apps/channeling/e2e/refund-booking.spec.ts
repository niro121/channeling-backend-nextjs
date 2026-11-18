/**
 * Refund flow: common path (login → doctor → session → [create booking or select existing] → select booking),
 * then Refund tab → select refundable items, remarks, refund method → submit.
 *
 * Run: npm run test:e2e -- refund-booking
 *
 * Pass doctor → session → booking:
 *   By row substring or index: E2E_SESSION="1:00 PM" or E2E_SESSION_INDEX=1 (first bookable session). Full label still works.
 *   By appointment: E2E_DOCTOR_SEARCH=test E2E_DOCTOR_SELECT="MR. TEST DOCTOR" E2E_SESSION="Mon Mar/9/26 1:00 PM 200 29(" E2E_APPOINTMENT_NO=29 npm run test:e2e -- refund-booking
 *   Chained (use first booking in list, e.g. after step 1 created it): set same doctor/session, leave E2E_APPOINTMENT_NO empty.
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

test.describe("Refund booking", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getE2ECredentials()
    if (!email || !password) test.skip()
  })

  test("refund flow - select booking then refund", async ({ page }) => {
    const hasTarget = !!(E2E_DOCTOR_SEARCH || E2E_SESSION || E2E_SESSION_INDEX != null)
    await goToChannelBookingWithBookingSelected(page, {
      doctorSearch: E2E_DOCTOR_SEARCH || undefined,
      doctorSelect: E2E_DOCTOR_SELECT || undefined,
      sessionIndex: E2E_SESSION_INDEX,
      sessionButtonText: E2E_SESSION || undefined,
      appointmentNo: E2E_APPOINTMENT_NO || undefined,
      bookingSuffix: "Refund",
      selectFirstOnly: hasTarget && !E2E_APPOINTMENT_NO,
    })

    // Booking must be paid to refund. If we just created it with Cash it may be paid; if pending, settle first.
    // Go to Refund tab
    await page.getByRole("tab", { name: "Refund" }).click({ timeout: 5000 })
    await page.waitForTimeout(500)

    // If "Booking must be paid before refund" we could settle first in a combined flow; for this spec assume paid.
    // Fill refund: check at least one refundable item, remarks, refund method
    const professionalCheck = page.getByRole("checkbox").first()
    await professionalCheck.waitFor({ state: "visible", timeout: 5000 }).catch(() => null)
    await professionalCheck.check({ force: true }).catch(() => {})

    await page.getByPlaceholder("Reason for refund…").fill("E2E refund test")
    await page.getByRole("button", { name: /Refund Rs\./ }).click({ timeout: 5000 })

    await expect(page.getByText(/Refunded|refund has been recorded/i)).toBeVisible({ timeout: 15000 })
  })
})
