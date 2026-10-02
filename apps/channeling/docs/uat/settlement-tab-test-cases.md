# Settlement Tab – Test Cases & Paths

Use this when testing the **Settle** tab in Channel Booking. Only **pending** bookings can be settled; paid bookings show receipt details; doctor-on-leave sessions cannot be settled.

---

## 1. Only pending bookings can be settled

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 1.1 | **Pending booking (status 0)** | Select a session → Select a **pending** booking (amber dot) → Open **Settle** tab | Settlement form is shown: Payment Method (Cash / Credit Card / Slip), optional Card/Slip/Bank fields, **Settle Now (Rs. X)** button. |
| 1.2 | **Paid booking (status 1)** | Select a **paid** booking (green dot) → Open **Settle** tab | No settle form. Message: **"Booking already paid"** and **Settlement details** card with Receipt No, Settled at, Payment method, Amount paid, Bank/Card/Slip if applicable. |
| 1.3 | **Canceled/refunded booking** | Select a canceled or refunded booking (red dot) → Open **Settle** tab | Same as paid: **"Booking already paid"** (or no settle). No settle form; if there was a receipt, details are shown. |

**Backend:** Submitting settle for a non-pending booking returns error: *"Booking is not pending payment."*

---

## 2. If already paid – show receipt details

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 2.1 | Paid booking with receipt | Select paid booking → Settle tab | **"Booking already paid"** and **Settlement details** card with: Receipt No, Settled at, Payment method, Amount paid, and Bank / Card (last 4) / Slip reference when applicable. |
| 2.2 | Paid booking, no receipt (edge case) | If such a state exists | **"Booking already paid"** and message: *"No receipt details available."* |

---

## 3. Doctor on leave – cannot settle even if pending

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 3.1 | Pending booking, session **on leave** (status 0) | Create or pick a session that is **on leave** → Select a **pending** booking in that session → Open **Settle** tab | No settle form. Message: **"Doctor is on leave for this session. Settlement is not allowed."** (amber-style notice). |
| 3.2 | Pending booking, session **active** (status 1) | Select a session that is **active** → Select a pending booking → Open **Settle** tab | Settlement form is shown; user can settle. |
| 3.3 | API: settle when session on leave | Call settle action for a pending booking whose session is on leave | Response: error code `session_on_leave`, message *"Doctor is on leave for this session. Settlement is not allowed."* |

---

## 4. Settle in Cash or other payment methods

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 4.1 | **Cash** | Pending booking → Settle tab → Payment Method: **Cash** → Settle Now | Only **Settle Now** is required. No Bank/Card/Slip. Settlement succeeds; receipt created; booking becomes paid. |
| 4.2 | **Credit Card** | Payment Method: **Credit Card** | Fields: **Card Details** (Last 4 digits), **Bank** (dropdown). Both required for card. Settle creates receipt with card + bank. |
| 4.3 | **Slip** | Payment Method: **Slip** | Fields: **Slip Details** (Slip Reference), **Bank** (dropdown). Settle creates receipt with slip ref + bank. |
| 4.4 | **Bank required for Card/Slip** | Select Credit Card or Slip but leave Bank empty → Settle Now | Validation: user must select a bank (or backend returns error). |
| 4.5 | **Card last 4** | Credit Card → enter only digits, e.g. 1234 | Input limited to 4 digits; saved on receipt as card reference. |

---

## 5. Success path and data updates

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 5.1 | Successful settlement | Pending booking → Choose method (e.g. Cash) → **Settle Now** | Toast: *"Settled – Payment recorded successfully."* Booking list refreshes; booking shows as **Paid** (green). Tab switches back to Booking (if `onSettleSuccess` does so). |
| 5.2 | Receipt created | After settle → Open same booking → **Settle** tab | **"Booking already paid"** and **Settlement details** with the new receipt (Receipt No, amount, method, time). |
| 5.3 | Booking tab after settle | After settle → **Booking** tab | Booking shows as paid; billing/receipt info consistent with settlement. |

---

## 6. Error and validation paths

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 6.1 | No booking selected | Open Settle tab without selecting a booking | Message: *"Select a booking"*. |
| 6.2 | Booking not found / load error | Select a booking that fails to load (e.g. invalid id) | Error message: *"Failed to load booking"* or similar. |
| 6.3 | Server: not pending | (e.g. race: another user settled) Submit settle for a booking that is already paid | Error toast; message like *"Booking is not pending payment."* |
| 6.4 | Server: session on leave | Submit settle for a pending booking whose session is on leave | Error toast; message *"Doctor is on leave for this session. Settlement is not allowed."* |

---

## 7. Quick checklist

- [ ] **Only pending** bookings show the settle form.
- [ ] **Paid** bookings show **"Booking already paid"** and receipt details (when available).
- [ ] **Doctor on leave**: pending bookings in that session show **"Settlement is not allowed"** and no form; API returns `session_on_leave`.
- [ ] **Cash**: no extra fields; settle works.
- [ ] **Credit Card**: Card (last 4) + Bank required; receipt has card + bank.
- [ ] **Slip**: Slip reference + Bank required; receipt has slip + bank.
- [ ] After **successful settle**, booking becomes paid and Settle tab shows receipt details on next open.
