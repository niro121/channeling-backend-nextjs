/**
 * Single-scenario E2E: one browser run = login → go to channel booking once → run each step in order (no restart).
 * Use for flows like: Step 1 Booking (create cash) → Step 2 Cancel it.
 *
 * Invoked by /admin/run-e2e with E2E_STEPS='[{"type":"booking","config":{...}},{"type":"cancel","config":{...}}]'
 * Credentials: E2E_USER_EMAIL, E2E_USER_PASSWORD.
 */
import { test, expect } from "@playwright/test"
import {
  loginAndGoToChannelBooking,
  selectDoctorAndSession,
  createCashBooking,
  selectBooking,
  getE2ECredentials,
} from "./channel-booking-common"

type StepConfig = {
  paymentMethods?: string[]
  bookingExtras?: Record<string, string>
  doctorSearch?: string
  doctorSelect?: string
  sessionButtonText?: string
  appointmentNo?: string
}
type ScenarioStep = { type: string; config: StepConfig }

function getSteps(): ScenarioStep[] {
  const raw = process.env.E2E_STEPS?.trim()
  if (!raw) return []
  try {
    const arr = JSON.parse(raw) as unknown[]
    return (Array.isArray(arr) ? arr : []).map((s) => ({
      type: typeof (s as { type?: string }).type === "string" ? (s as { type: string }).type : "booking",
      config: (typeof (s as { config?: StepConfig }).config === "object" && (s as { config: StepConfig }).config) || {},
    }))
  } catch {
    return []
  }
}

test.describe("Channel booking scenario (single run)", () => {
  test("login → channel booking → run steps in order", async ({ page }) => {
    const { email, password } = getE2ECredentials()
    if (!email || !password) test.skip()

    const steps = getSteps()
    if (steps.length === 0) {
      test.skip()
      return
    }

    await loginAndGoToChannelBooking(page)

    const first = steps[0]
    const doctorSearch = first.config.doctorSearch?.trim() || "Test Doctor"
    const doctorSelect = first.config.doctorSelect?.trim() || "MR. TEST DOCTOR"
    const sessionButtonText = first.config.sessionButtonText?.trim()

    await selectDoctorAndSession(page, {
      doctorSearch,
      doctorSelect,
      sessionButtonText: sessionButtonText || undefined,
    })

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const c = step.config

      if (step.type === "booking") {
        await createCashBooking(page, `Step${i + 1}`)
        await page.waitForTimeout(1000)
        continue
      }

      if (step.type === "cancel" || step.type === "refund" || step.type === "settle" || step.type === "change") {
        const prevStep = i > 0 ? steps[i - 1] : null
        const alreadySelected = prevStep?.type === "booking"
        if (!alreadySelected) {
          const appointmentNo = c.appointmentNo?.trim()
          await selectBooking(page, appointmentNo || undefined)
          await page.waitForTimeout(800)
        }

        if (step.type === "cancel") {
          await page.getByRole("tab", { name: "Cancel" }).click({ timeout: 5000 })
          const reasonField = page.getByPlaceholder("Reason for cancellation…")
          await reasonField.waitFor({ state: "visible", timeout: 15000 })
          await reasonField.fill("E2E cancel test")
          await page.getByRole("button", { name: /Cancel Booking/ }).click({ timeout: 5000 })
          await expect(page.getByText(/Canceled|booking has been canceled/i)).toBeVisible({ timeout: 15000 })
        } else if (step.type === "refund") {
          await page.getByRole("tab", { name: "Refund" }).click({ timeout: 5000 })
          await page.waitForTimeout(500)
          const professionalCheck = page.getByRole("checkbox").first()
          await professionalCheck.waitFor({ state: "visible", timeout: 5000 }).catch(() => null)
          await professionalCheck.check({ force: true }).catch(() => {})
          await page.getByPlaceholder("Reason for refund…").fill("E2E refund test")
          await page.getByRole("button", { name: /Refund Rs\./ }).click({ timeout: 5000 })
          await expect(page.getByText(/Refunded|refund has been recorded/i)).toBeVisible({ timeout: 15000 })
        } else if (step.type === "settle") {
          await page.getByRole("tab", { name: "Settle" }).click({ timeout: 5000 })
          await page.waitForTimeout(500)
          const settleButton = page.getByRole("button", { name: /Settle Now \(Rs\./ })
          await settleButton.waitFor({ state: "visible", timeout: 8000 })
          await settleButton.click({ timeout: 5000 })
          await expect(page.getByText(/Settled|Payment recorded|already paid/i)).toBeVisible({ timeout: 15000 })
        } else if (step.type === "change") {
          await page.getByRole("tab", { name: "Change" }).click({ timeout: 5000 })
          await page.waitForTimeout(500)
          await page.getByPlaceholder("Name").fill("TEST USER ( Changed )")
          await page.getByRole("button", { name: "Update Channel Details" }).click({ timeout: 5000 })
          await expect(page.getByText(/Updated|Channel details have been updated/i)).toBeVisible({ timeout: 15000 })
        }
        continue
      }

      throw new Error(`Unknown step type: ${step.type}`)
    }
  })
})
