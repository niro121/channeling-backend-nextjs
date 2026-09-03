# Shift Handover & Reconciliation – Test Cases

Use this when testing **Shift Handover** (End shift, Handed over to me) and **Reconciliation** in Channel Booking. Flow: cashier ends shift and hands over to bulk cashier → recipient approves and can send to reconciliation → on Reconciliation page bulk cashier ticks receipts and submits (or rejects). Journal entries: handover approval credits recipient till; reconciliation deducts from recipient till and credits branch Reconciled account.

---

## 1. Submit handover (sender / cashier)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 1.1 | **Success** | Start shift. Open End shift → Current till balance. Proceed. Enter amounts per method. Select recipient. Confirm handover. | Handover submitted. Shift status Handover pending. Recipient sees it in Handed over to me. |
| 1.2 | **Cannot hand over to self** | Open handover. Select yourself as recipient. Submit. | Validation: Handover cannot be to yourself. |
| 1.3 | **Pending handovers block end shift** | As user who has at least one handover sent to them (pending) open End shift. | Alert: handover(s) pending your acceptance. Proceed disabled. Link to Handovers page. |
| 1.4 | **Pending handovers block submit** | As user with pending handover(s) to them complete End shift steps and try to Confirm handover. | Validation: Accept or reject pending handovers from Handovers page before submitting. |
| 1.5 | **Pending float request blocks** | With active shift create a float request (pending). Open End shift. | Alert: pending float request. Proceed disabled. |
| 1.6 | **Include previous handovers – step 1 note** | As user who received approved handover(s) open End shift. On step 1 wait for load. | Blue note: handovers from X (code) will be included. Button stays disabled until data loaded. |
| 1.7 | **Include previous handovers – confirm step** | Complete steps to Confirm. If you have includable handovers see "Include previous handovers". | Read-only list of handovers that will be included (no checkboxes). Same handovers as step 1 note. |
| 1.8 | **Submit with chain** | Submit handover when you have includable handovers. | Handover created. Chain stored (includedHandoverIds / forwardedToHandoverId). Reconciliation doc shows full chain. |

---

## 2. Handed over to me (recipient)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 2.1 | **List and view** | Go to Handed over to me. Open a pending handover (View). | List shows From (name/code). Detail shows handover from, shift/handover dates, method breakdown, entries to tick. |
| 2.2 | **Approve and Receive** | Tick all entries. Approve and Receive. Optional comments. Confirm. | Handover approved. Journal to recipient till. Shift ended. Redirect to list. |
| 2.3 | **Approve – Send to reconciliation** | On Approve dialog tick "Send to reconciliation" (if permission). Approve. | Handover approved. Appears on Reconciliation page (Reconciliation tab). Reconciliation requested by = recipient. |
| 2.4 | **Reject** | Reject with required reason. | Handover rejected. Shift returns to Active. No journal. |
| 2.5 | **Only recipient** | As non-recipient try to approve or reject. | Error or action not available. |
| 2.6 | **Cancel (sender)** | As sender with pending handover cancel from shift bar. | Handover cancelled. Shift Active. Recipient no longer sees it. |

---

## 3. Reconciliation list

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 3.1 | **Tabs** | Go to Reconciliation. | Tabs: **Reconciliation** (in progress), **Approved**, **Rejected**. Subheading describes current tab. |
| 3.2 | **Reconciliation tab** | Stay on Reconciliation tab. | Only handovers in reconciliation (sent to reconciliation, not yet submitted or rejected). No PENDING (not sent). |
| 3.3 | **Approved tab** | Switch to Approved. | Handovers that were submitted as reconciled. Sorted by reconciled date. |
| 3.4 | **Rejected tab** | Switch to Rejected. | Handovers whose reconciliation was rejected. Reason visible. |
| 3.5 | **Filters** | Use date range and From/To user filters. | List and count filter correctly. |
| 3.6 | **Permission** | User without reconciliation view open Reconciliation. | No nav link or access denied. |

---

## 4. Reconciliation document – layout and method tabs

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 4.1 | **Open document** | From Reconciliation tab open a row (e.g. View or click). | Reconcile handover page. Title "Reconcile handover", Back right. Handover documents summary table. |
| 4.2 | **Method tabs** | Check tabs (Credit Card, Slip, Cheque, E-Wallet). | One tab per method. Tab shows icon and label. Green check when ticked total = target; amber when no match. |
| 4.3 | **Per-tab content** | Select a method tab (e.g. Credit Card). | Target and Ticked summary. Handover references (to match). Single table: Tick, Shift, Receipt #, Date, Amount, Reference. Only that method's receipts. |
| 4.4 | **Match state** | Tick receipts so ticked total equals target. | Summary shows "Match" and green. Tab trigger shows green and check icon. |
| 4.5 | **Handover chain** | Open document for handover that included previous handovers. | Handover documents summary shows top-level and linked handovers. References merged from chain. Receipts by shift include all shifts in chain. |

---

## 5. Reconciliation – tick and submit

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 5.1 | **Tick receipts** | On a method tab tick receipts so total ticked equals target. | Ticked total updates. When all methods matched (or intended) Submit as reconciled enabled (if at least one receipt ticked). |
| 5.2 | **Submit as reconciled** | Tick receipts. Click Submit as reconciled. | Success. Handover moves to Approved tab. Receipts marked reconciled. |
| 5.3 | **Journal entry** | After submit open journal for that handover. | Entry description includes main shift ID, started time, till owner (bulk cashier), from handover, amounts, "branch Reconciled account". Till (reconciliation requested user) credited; Reconciled account debited. |
| 5.4 | **Reconciliation requested user till** | Submit reconciliation for handover sent to reconciliation by user A. | Deduction from user A's till (not another user). Credit to branch Reconciled account. |
| 5.5 | **No receipts ticked** | Try Submit as reconciled without ticking any receipts. | Button disabled or validation: Select at least one receipt. |
| 5.6 | **Already reconciled** | Open a handover already in Approved. Try to submit again. | No duplicate submit. Document read-only or Submit not available. |

---

## 6. Reject reconciliation

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 6.1 | **Reject with reason** | On document click Reject reconciliation. Enter reason (required). Submit. | Handover moves to Rejected tab. Reason stored. No journal. Till unchanged. |
| 6.2 | **Reject – reason required** | Click Reject. Leave reason empty. Submit. | Validation: reason required. |

---

## 7. Permissions and UI

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 7.1 | **Reconciliation approve permission** | User with view but without approve-reconciliation open document. | Submit as reconciled and Reject not shown or disabled. Message about permission. |
| 7.2 | **Submit for reconciliation permission** | User without "Submit For Reconciliation" approve a handover. | "Send to reconciliation" option not shown or disabled. |
| 7.3 | **Date/time display** | On reconciliation document check shift and receipt dates. | Format with AM/PM and seconds (e.g. 17/03/2026, 12:11:00 pm). |
| 7.4 | **Top section matches detail pages** | Compare Reconcile handover page header with e.g. Shift details. | Title left, Back right. Same padding and heading style. |

---

## 8. End-to-end flow (smoke)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 8.1 | **Full flow** | Cashier A: start shift, add non-cash receipt, end shift handover to B. B: approve, Send to reconciliation. B: go to Reconciliation, open document, tick receipts to match, Submit as reconciled. | Handover created → approved → in reconciliation → reconciled. Journal on approve (to B till) and on reconcile (from B till to Reconciled). Approved and Rejected tabs show correct state. |
| 8.2 | **Chain flow** | A hands over to B. B approves. B ends shift and hands over to C; confirm step shows B's received handover included. C approves and sends to reconciliation. C opens Reconciliation document. | Document shows top-level (B→C) and linked (A→B). References merged. Receipts from both shifts. Submit deducts from C's till. |

---

*Use with `uat-test-cases.csv` (Shift Handover HOV-xx and Reconciliation REC-xx) for sign-off.*
