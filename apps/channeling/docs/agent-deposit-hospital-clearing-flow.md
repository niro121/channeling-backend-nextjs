# Agent Cheque → Ruhunu → Back to Channel

**Example amounts:** Agent deposits **LKR 10,000** cheque. Books one session for **LKR 3,000** (hospital 2,000 + doctor 1,000). Ruhunu banks the cheque and later returns **all 10,000** to Channel. Doctor is paid **1,000** cash.

**Remember:** Do **not** use Branch Income when money goes to or comes back from Ruhunu. Agent prepaid is recorded once at deposit. Revenue is recorded at booking.

---

## Step 1 — Agent gives cheque to till

**Agency Deposit**

Dr Till (cheque) 10,000  
Cr Agent PAYABLE 10,000

Agent can now book up to 10,000 using prepaid.

---

## Step 2 — Cheque verified in reonciliation

**Reconciliation** (tick receipt on Cheque tab)

Dr Reconciled 10,000  
Cr Till (cheque) 10,000

Cheque moves from till owner → verified Reconciled float.

---

## Step 3 — Agent books a session (3,000)

**Channel booking** (payment method: Agent)

Dr Agent PAYABLE 3,000  
Cr Branch INCOME 2,000  
Cr Doctor PAYABLE 1,000

Agent prepaid left: **7,000**. Till is not touched.

---

## Step 4 — Cheque banked at Ruhunu

**Manual journal**

Dr Hospital Clearing 10,000  
Cr Reconciled 10,000

Money is now “at Ruhunu” on your books. Agent prepaid still **7,000**.

---

## Step 5 — Ruhunu returns all 10,000

**Manual journal (ACTUAL INCOME ENTERY)**

Dr Till (cash) 10,000  
Cr Hospital Clearing 10,000

Hospital Clearing is now **0**. Cash is back in Channel. This is **not** income.

---

## Step 6 — Pay doctor (1,000 cash)

**Doctor Payment**

Dr Doctor PAYABLE 1,000  
Cr Till (cash) 1,000

---

## Step 7 — Optional: put cash in your bank

**Bank Deposit**

Dr Bank 9,000  
Cr Till (cash) 9,000

---

## Where things stand at the end

| What | Balance | Meaning |
|------|---------|---------|
| Till cash | 9,000 | Cash in Channel (or 0 if step 7 done) |
| Agent PAYABLE | 7,000 | Agent still has prepaid for more bookings |
| Branch INCOME | 2,000 | Hospital fee earned |
| Doctor PAYABLE | 0 | Doctor paid |
| Hospital Clearing | 0 | Nothing left at Ruhunu |
| Reconciled / Till cheque | 0 | Cheque fully cleared |

The **9,000** cash is roughly **7,000** agent prepaid + **2,000** hospital share (already counted as income at step 3).

---

## Quick reference

| When | What to post |
|------|----------------|
| Cheque arrives at till | Agency Deposit |
| Cheque verified | Reconciliation |
| Agent books | Agent booking (uses Agent PAYABLE) |
| Cheque banked at Ruhunu | Manual: Dr Hospital Clearing, Cr Reconciled |
| Money comes back from Ruhunu | Manual: Dr Till cash, Cr Hospital Clearing |
| Pay doctor | Doctor Payment |
| Move cash to bank | Bank Deposit |
