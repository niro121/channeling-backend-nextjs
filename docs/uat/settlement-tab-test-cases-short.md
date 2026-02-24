# Settlement Tab – Short Test Cases

## 1. Pending vs paid
| # | What | Expect |
|---|------|--------|
| 1 | Select **pending** booking (amber) → Settle tab | Form: Payment method + **Settle Now (Rs. X)**. |
| 2 | Select **paid** booking (green) → Settle tab | **"Booking already paid"** + Settlement details card (Receipt no, amount, method, date). |
| 3 | Select **canceled/refunded** (red) → Settle tab | No settle form; receipt details if any. |

## 2. Doctor on leave
| # | What | Expect |
|---|------|--------|
| 4 | Session **on leave** → select **pending** booking → Settle tab | Message: **"Doctor is on leave for this session. Settlement is not allowed."** No form. |
| 5 | Session **active** → select pending booking → Settle tab | Settle form shown; can settle. |
| 6 | Call settle API for booking in **on-leave** session | Error: *"Doctor is on leave for this session. Settlement is not allowed."* (Zod + service). |

## 3. Payment methods
| # | What | Expect |
|---|------|--------|
| 7 | **Cash** → Settle Now | No extra fields; settle succeeds; booking becomes paid. |
| 8 | **Credit Card** → enter last 4 + Bank → Settle | Receipt has card + bank; booking paid. |
| 9 | **Slip** → Slip ref + Bank → Settle | Receipt has slip + bank; booking paid. |

## 4. After settle
| # | What | Expect |
|---|------|--------|
| 10 | Settle pending with Cash → success | Toast "Settled"; list refreshes; booking shows **Paid** (green). |
| 11 | Reopen same booking → Settle tab | **"Booking already paid"** + new receipt in Settlement details. |

## 5. Errors
| # | What | Expect |
|---|------|--------|
| 12 | Settle tab with no booking selected | "Select a booking". |
| 13 | Submit settle for already-**paid** booking (e.g. race) | Error: *"Booking is not pending payment."* |

---

**Checklist:** Pending → form ✓ | Paid → receipt only ✓ | On leave → blocked (UI + API) ✓ | Cash/Card/Slip ✓ | Post-settle shows receipt ✓
