/**
 * Cash booking E2E: login → channel booking → select doctor → select branch/session → fill patient (cash) → Book Now.
 * Requires E2E_USER_EMAIL and E2E_USER_PASSWORD. Run `npx playwright install` once to install browsers.
 */
import { test, expect } from "@playwright/test"

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? ""
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? ""

test.describe("Cash booking", () => {
  test.beforeEach(async ({ page }) => {
    if (!E2E_USER_EMAIL || !E2E_USER_PASSWORD) {
      test.skip()
    }
  })

  test("login, select test doctor and session, fill patient details, pay cash, submit booking", async ({
    page,
  }) => {
    await page.goto("/login")

    await page.getByLabel(/email or username/i).fill(E2E_USER_EMAIL)
    await page.locator("#password").fill(E2E_USER_PASSWORD)
    await page.getByRole("button", { name: /sign in/i }).click()

    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await expect(page.getByText(/invalid credentials/i)).not.toBeVisible()

    await page.goto("/channel-booking")
    await page.waitForLoadState("networkidle")

    const consultantCard = page.locator('input[placeholder="Consultant"]').locator("../..")
    await expect(consultantCard.getByText("Loading...")).not.toBeVisible({ timeout: 15000 })
    const firstDoctor = consultantCard.locator('div[class*="cursor-pointer"]').first()
    await firstDoctor.click({ timeout: 5000 })

    await page.getByText("Select branch", { exact: true }).click({ timeout: 10000 })
    await page.getByRole("option").first().click()

    await page.waitForTimeout(500)
    const firstSession = page.locator("li button").filter({ hasNot: page.getByText("On leave") }).first()
    await firstSession.click({ timeout: 8000 })

    await expect(page.getByPlaceholder("PATIENT NAME")).toBeVisible({ timeout: 8000 })

    const comboboxes = page.getByRole("combobox")
    await comboboxes.nth(2).click()
    await page.getByRole("option", { name: "MR." }).click()

    await page.getByPlaceholder("PATIENT NAME").fill("E2E TEST PATIENT")
    await comboboxes.nth(3).click()
    await page.getByRole("option", { name: "Male" }).click()
    await page.getByPlaceholder(/phone number/i).fill("0712345678")

    const areaTrigger = page.getByRole("combobox").filter({ hasText: /Select Area/i }).first()
    await areaTrigger.click()
    await page.getByRole("option").first().click()

    await page.getByRole("button", { name: /Book Now/i }).click()

    await expect(page.getByText(/booking saved|saved successfully/i)).toBeVisible({ timeout: 15000 })
  })
})
