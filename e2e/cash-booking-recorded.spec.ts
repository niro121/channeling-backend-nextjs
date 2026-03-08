/**
 * Paste your Playwright Codegen recording here.
 *
 * How to use:
 * 1. Run: npx playwright codegen http://localhost:3000
 * 2. In the Inspector, copy the generated code (or "Copy" button).
 * 3. Paste it inside the test below, replacing the placeholder steps.
 * 4. Replace hardcoded credentials with env vars (see cash-booking.spec.ts).
 * 5. Change any page.goto('http://localhost:3000/...') to page.goto('/...') so it works with baseURL.
 * 6. Run: E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- cash-booking-recorded
 */
import { test, expect } from "@playwright/test"

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL ?? ""
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? ""

test.describe("Cash booking (recorded)", () => {
  test.beforeEach(async ({ page }) => {
    if (!E2E_USER_EMAIL || !E2E_USER_PASSWORD) {
      test.skip()
    }
  })

  test("recorded cash booking flow", async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.getByRole('textbox', { name: 'Email or username' }).click();
    await page.getByRole('textbox', { name: 'Email or username' }).click();
    await page.getByRole('textbox', { name: 'Email or username' }).fill('developer@archmage.lk');
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('Arch321#');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.goto('http://localhost:3000/welcome');
    await page.getByRole('complementary').getByRole('link', { name: 'Channel Booking' }).click();
    await page.getByRole('textbox', { name: 'Consultant' }).click();
    await page.getByRole('textbox', { name: 'Consultant' }).fill('Test Doctor');
    await page.getByText('MR. TEST DOCTOR').click();
    await page.getByRole('button', { name: 'Mon Mar/9/26 1:00 PM 200 1(' }).click();
    await page.getByRole('combobox').filter({ hasText: 'Title' }).click();
    await page.getByRole('option', { name: 'MR.' }).click();
    await page.getByRole('textbox', { name: 'PATIENT NAME' }).click();
    await page.getByRole('textbox', { name: 'PATIENT NAME' }).fill('NIROSHa');
    await page.getByRole('textbox', { name: 'Phone Number (07XXXXXXXX)' }).click();
    await page.getByRole('textbox', { name: 'Phone Number (07XXXXXXXX)' }).fill('0772907480');
    await page.getByText('Select Area').click();
    await page.getByRole('option', { name: 'Agalawatta' }).click();
    await page.getByRole('button', { name: 'Book Now ( Rs.110.00 )' }).click();
  
  })
})
