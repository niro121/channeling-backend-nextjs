/**
 * Change (update) flow: common path (login → doctor → session → [create or select] booking),
 * then Change tab → edit title/name/sex/phone/remarks → Update Channel Details.
 *
 * Run: npm run test:e2e -- change-booking
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

test.describe("Change booking", () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = getE2ECredentials()
    if (!email || !password) test.skip()
  })

  test("change flow - select booking then update channel details", async ({ page }) => {
    const hasTarget = !!(E2E_DOCTOR_SEARCH || E2E_SESSION || E2E_SESSION_INDEX != null)
    await goToChannelBookingWithBookingSelected(page, {
      doctorSearch: E2E_DOCTOR_SEARCH || undefined,
      doctorSelect: E2E_DOCTOR_SELECT || undefined,
      sessionIndex: E2E_SESSION_INDEX,
      sessionButtonText: E2E_SESSION || undefined,
      appointmentNo: E2E_APPOINTMENT_NO || undefined,
      bookingSuffix: "Change",
      selectFirstOnly: hasTarget && !E2E_APPOINTMENT_NO,
    })

    await page.getByRole("tab", { name: "Change" }).click({ timeout: 5000 })
    await page.waitForTimeout(500)

    await page.getByPlaceholder("Name").fill("TEST USER ( Changed )")
    await page.getByRole("button", { name: "Update Channel Details" }).click({ timeout: 5000 })

    await expect(page.getByText(/Updated|Channel details have been updated/i)).toBeVisible({
      timeout: 15000,
    })
  })
})
