/**
 * Recorded booking flow. Supports Cash, OnCall, Agent, Staff, Card, Slip, Credit Customer, E-wallet.
 *
 * Run (default: Cash only; credentials default to developer@archmage.lk):
 *   npm run test:e2e -- cash-booking-recorded
 *
 * Run OnCall only:
 *   E2E_PAYMENT_METHOD=ON_CALL npm run test:e2e -- cash-booking-recorded
 *
 * Run Cash and OnCall (or more):
 *   E2E_PAYMENT_METHODS=CASH,ON_CALL npm run test:e2e -- cash-booking-recorded
 *
 * Optional extras (one JSON env var). For Agent, pass agencyName + agencyBook + agencyRef:
 *   agencyName  – option text exactly as in UI (e.g. "Niroma Medilab (320)")
 *   agencyBook   – book label for getByLabel/getByText (e.g. "R0001")
 *   agencyRef    – REF NO. value (e.g. "1")
 *   E2E_BOOKING_EXTRAS='{"agencyName":"Niroma Medilab (320)","agencyBook":"R0001","agencyRef":"1"}'
 *   Credit: creditCustomerName – option name e.g. "(CC-00002)"
 *   E2E_BOOKING_EXTRAS='{"creditCustomerName":"(CC-00002)"}'                     // Credit
 *   Staff: staffName – text as in UI (e.g. "Nirosha Kodituwakku (10001)")
 *   E2E_BOOKING_EXTRAS='{"staffName":"Nirosha Kodituwakku (10001)"}'            // Staff
 *   Card: cardLast4 (e.g. "1234") + bankName exact (e.g. "HNB")
 *   E2E_BOOKING_EXTRAS='{"cardLast4":"1234","bankName":"HNB"}'                  // Card
 *   Slip: slipRef (e.g. "123456") + bankName (e.g. "HSBC")
 *   E2E_BOOKING_EXTRAS='{"slipRef":"123456","bankName":"HSBC"}'                  // Slip
 *
 * Override credentials: E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npm run test:e2e -- cash-booking-recorded
 */
import { test, expect } from "@playwright/test"

const E2E_USER_EMAIL = "developer@archmage.lk"
const E2E_USER_PASSWORD = "Arch321#"
const PATIENT_NAME = "TEST USER"
const PATIENT_PHONE = "0772907480"

/** Parsed from E2E_BOOKING_EXTRAS JSON; keys: agencyName, agencyBook, agencyRef, creditCustomerName, staffName, bankName, cardLast4, slipRef */
function getBookingExtras(): Record<string, string> {
  const raw = process.env.E2E_BOOKING_EXTRAS?.trim()
  if (!raw) return {}
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") out[k] = v.trim()
    }
    return out
  } catch {
    return {}
  }
}

const EXTRAS = getBookingExtras()
const agencyName = EXTRAS.agencyName ?? ""
const agencyBook = EXTRAS.agencyBook ?? ""
const agencyRef = EXTRAS.agencyRef || "01"
const creditCustomerName = EXTRAS.creditCustomerName ?? ""
const staffName = EXTRAS.staffName ?? ""
const bankName = EXTRAS.bankName ?? ""
const cardLast4 = EXTRAS.cardLast4 || "0000"
const slipRef = EXTRAS.slipRef || "E2E-REF"

/** Labels shown in the Payment dropdown (match types/channel-booking.ts PAYMENT_METHODS). */
const UI_PAYMENT_LABELS: Record<number, string> = {
  0: "Cash",
  1: "OnCall",
  2: "Agent",
  3: "Staff",
  4: "Card",
  5: "Slip",
  6: "Credit Customer",
  7: "E-wallet",
}

const NAME_TO_UI_ID: Record<string, number> = {
  CASH: 0,
  ONCALL: 1,
  AGENT: 2,
  STAFF: 3,
  CARD: 4,
  SLIP: 5,
  CREDIT: 6,
  E_WALLET: 7
}

function parsePaymentMethodsFromEnv(): { id: number; label: string }[] {
  const raw =
    process.env.E2E_PAYMENT_METHOD ?? process.env.E2E_PAYMENT_METHODS ?? "0"
  const parts = raw.split(",").map((s) => s.trim().toUpperCase())
  const result: { id: number; label: string }[] = []
  const seen = new Set<number>()
  for (const p of parts) {
    if (!p) continue
    const id: number = /^\d+$/.test(p)
      ? parseInt(p, 10)
      : (NAME_TO_UI_ID[p] ?? NAME_TO_UI_ID[p.replace(/\s+/g, " ")]) ?? -1
    if (id >= 0 && id <= 7 && !seen.has(id)) {
      seen.add(id)
      result.push({ id, label: UI_PAYMENT_LABELS[id] ?? `Payment ${id}` })
    }
  }
  return result.length ? result : [{ id: 0, label: "Cash" }]
}

const PAYMENT_METHODS_TO_TEST = parsePaymentMethodsFromEnv()

/** Regex to find the Payment combobox (it displays one of these labels). */
const PAYMENT_COMBOBOX_LABELS = new RegExp(
  Object.values(UI_PAYMENT_LABELS).join("|")
)

test.describe("Booking by payment method (recorded)", () => {
  test.beforeEach(async ({ page }) => {
    if (!E2E_USER_EMAIL || !E2E_USER_PASSWORD) {
      test.skip()
    }
  })

  for (const method of PAYMENT_METHODS_TO_TEST) {
    test(`recorded booking flow - ${method.label}`, async ({ page }) => {
      await page.goto("/login");
      await page.getByRole("textbox", { name: "Email or username" }).fill(E2E_USER_EMAIL);
      await page.locator("#password").fill(E2E_USER_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
      await page.goto("/channel-booking");
      await page.waitForLoadState("networkidle");

      await page.getByRole("textbox", { name: "Consultant" }).click();
      await page.getByRole("textbox", { name: "Consultant" }).fill("Test Doctor");
      await page.getByText("MR. TEST DOCTOR").click({ timeout: 10000 });
      await page.waitForTimeout(500);
      const sessionButton = page.locator("li button").filter({ hasNot: page.getByText("On leave") }).first();
      await sessionButton.click({ timeout: 10000 });
      await expect(page.getByPlaceholder("PATIENT NAME")).toBeVisible({ timeout: 10000 });

      // Select payment method: open Payment dropdown (shows current option), then choose the one we want
      await page.getByRole("combobox").filter({ hasText: PAYMENT_COMBOBOX_LABELS }).first().click({ timeout: 5000 });
      await page.getByRole("option", { name: method.label }).click({ timeout: 5000 });

      // Payment-type–specific fields. Cash (0), OnCall (1), E-wallet (7): no extra inputs.
      if (method.id === 2) {
        // Agent: Select Agency (recorded: combobox filter Select Agency → option by name)
        await page.getByRole("combobox").filter({ hasText: "Select Agency" }).click({ timeout: 5000 });
        if (agencyName) {
          await page.getByRole("option", { name: agencyName }).click({ timeout: 5000 });
        } else {
          await page.getByRole("option").first().click({ timeout: 5000 });
        }
        await page.waitForTimeout(500);
        // Select a Book (recorded: combobox Select a Book → getByLabel(book).getByText(book) e.g. R0001)
        await page.getByRole("combobox").filter({ hasText: "Select a Book" }).click({ timeout: 10000 });
        if (agencyBook) {
          await page.getByLabel(agencyBook).getByText(agencyBook).click({ timeout: 5000 });
        } else {
          await page.getByRole("option").first().click({ timeout: 5000 });
        }
        // REF NO. (01–99) – pass agencyRef e.g. "1"
        await page.getByRole("textbox", { name: "REF NO. (01–99)" }).click({ timeout: 3000 });
        await page.getByRole("textbox", { name: "REF NO. (01–99)" }).fill(agencyRef);
      } else if (method.id === 6) {
        // Credit Customer (recorded: combobox Select Credit Customer → option by name e.g. "(CC-00002)")
        await page.getByRole("combobox").filter({ hasText: "Select Credit Customer" }).click({ timeout: 5000 });
        if (creditCustomerName) {
          await page.getByRole("option", { name: creditCustomerName }).click({ timeout: 5000 });
        } else {
          await page.getByRole("option").first().click({ timeout: 5000 });
        }
      } else if (method.id === 3) {
        // Staff (recorded: combobox Select Staff Member → getByText(staffName) e.g. "Nirosha Kodituwakku (10001)")
        await page.getByRole("combobox").filter({ hasText: "Select Staff Member" }).click({ timeout: 5000 });
        if (staffName) {
          await page.getByText(staffName).click({ timeout: 5000 });
        } else {
          await page.getByRole("option").first().click({ timeout: 5000 });
        }
      } else if (method.id === 4) {
        // Card (recorded: textbox Last 4 Digits → fill; combobox Select Bank → option by name exact e.g. "HNB")
        await page.getByRole("textbox", { name: "Last 4 Digits" }).click({ timeout: 3000 });
        await page.getByRole("textbox", { name: "Last 4 Digits" }).fill(cardLast4);
        await page.getByRole("combobox").filter({ hasText: "Select Bank" }).click({ timeout: 5000 });
        if (bankName) {
          await page.getByRole("option", { name: bankName, exact: true }).click({ timeout: 5000 });
        } else {
          await page.getByRole("option").first().click({ timeout: 5000 });
        }
      } else if (method.id === 5) {
        // Slip (recorded: textbox Bank Reference → fill; combobox Select Bank → option by name e.g. "HSBC")
        await page.getByRole("textbox", { name: "Bank Reference" }).click({ timeout: 3000 });
        await page.getByRole("textbox", { name: "Bank Reference" }).fill(slipRef);
        await page.getByRole("combobox").filter({ hasText: "Select Bank" }).click({ timeout: 5000 });
        if (bankName) {
          await page.getByRole("option", { name: bankName }).click({ timeout: 5000 });
        } else {
          await page.getByRole("option").first().click({ timeout: 5000 });
        }
      }

      await page.getByRole("combobox").filter({ hasText: /Title/i }).first().click();
      await page.getByRole("option", { name: "MR." }).click();
      await page.getByPlaceholder("PATIENT NAME").fill(`${PATIENT_NAME} ( ${method.label} )`);
      await page.getByPlaceholder(/phone number/i).fill(PATIENT_PHONE);
      await page.getByText("Select Area", { exact: true }).click({ timeout: 8000 });
      await page.getByRole("option").first().click();
      await page.getByRole("button", { name: /Book Now/i }).click();

      await expect(page.getByText(/booking saved|saved successfully/i).first()).toBeVisible({ timeout: 15000 });
    });
  }
});
