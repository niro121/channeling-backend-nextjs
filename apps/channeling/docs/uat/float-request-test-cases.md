# Float Request – Test Cases & Paths

Use this when testing **Request float**, **Approve**, and **Receive** in Channel Booking and Bulk Cashier. Flow: cashier requests float at shift start → bulk cashier approves (or rejects) → cashier receives with 4-digit code (or declines). Double-entry journal is created only on **receive**.

---

## 1. Request float (cashier)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 1.1 | **Success** | Start shift on Channel Booking. Open Request Float. Select bulk cashier. Enter denominations (e.g. 5000 × 2). Submit. | Request created. Status PENDING. Top bar shows "Float request is pending" with dropdown. |
| 1.2 | **Total amount zero** | Open Request Float. Leave denominations at zero or empty. Submit. | Validation: total amount must be greater than zero. Request not created. |
| 1.3 | **Duplicate pending** | With one pending float request already, open Request Float and submit another. | Error: You already have a pending float request. Wait for approval or rejection. |
| 1.4 | **Permission** | User without Float Request permission on Channel Booking. | Request Float button not shown or action denied. |

---

## 2. Approve float (bulk cashier)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 2.1 | **Success – match request** | As bulk cashier go to Bulk Cashier. Open pending request. Click "Match request". Select source cash account. Approve. | Approved. Print slip with 4-digit code and QR. Cashier sees Receive float popup (or can open it). |
| 2.2 | **Success – approve less with reason** | Approve with total less than requested. Enter "Reason for less". Approve. | Approved. Print slip. Cashier can receive the approved (lower) amount. |
| 2.3 | **Not pending** | Try to approve a request already approved / rejected / cancelled. | Error: Request is no longer pending. |
| 2.4 | **Wrong bulk cashier** | As a user who is not the assigned bulk cashier, try to approve. | Error: Only the assigned bulk cashier can approve. |
| 2.5 | **Cannot give more than requested** | As bulk cashier try to approve with denominations totalling more than requested. | Error: Cannot give more than requested. Approved total must not exceed requested amount. |
| 2.6 | **Insufficient balance** | Select a source cash account whose balance is less than the approved amount. Approve. | Error: Insufficient balance in source account. Available X LKR, required Y LKR. |
| 2.7 | **Approve less without reason** | Approve with total less than requested but leave "Reason for less" empty. | Error: Reason for giving less is required when approved amount is below requested. |

---

## 3. Receive float (cashier)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 3.1 | **Success** | Cashier with approved request opens Receive float. Enters correct 4-digit code from slip. Confirms. | Receipt confirmed. Status RECEIVED. Cashier float balance updates. Journal entry created (double-entry). |
| 3.2 | **Wrong code** | Cashier enters incorrect 4-digit code in Receive float popup. | Error: Invalid receive code. |
| 3.3 | **Only requester can receive** | As another user (e.g. different cashier) try to receive an approved request (e.g. via API). | Error: Only the requesting cashier can confirm receipt. |
| 3.4 | **Only approved requests** | Try to receive a request that is PENDING or already RECEIVED / REJECTED / CANCELLED. | Error: Only approved requests can be received. |

---

## 4. Reject float (bulk cashier)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 4.1 | **Success** | As assigned bulk cashier open pending request. Enter reject reason. Reject. | Request status REJECTED. Requester sees update. No journal entry. |
| 4.2 | **Not pending** | Try to reject a request that is already approved / received / cancelled. | Error: Request is no longer pending. |
| 4.3 | **Only assigned bulk cashier** | As user who is not the assigned bulk cashier try to reject. | Error: Only the assigned bulk cashier can reject. |

---

## 5. Cancel float (requester, pending only)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 5.1 | **Success** | As requester with pending request open top bar dropdown. Cancel with reason. | Request status CANCELLED. No journal entry. |
| 5.2 | **Only requester can cancel** | As bulk cashier or other user try to cancel a pending request. | Cancel button not shown on bulk cashier view; or error: Only the requester can cancel their own float request. |

---

## 6. Decline approved float (cashier – reject receive)

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 6.1 | **Success** | Cashier with approved request opens Receive float. Click "Reject (cancel float)". Enter reason. Confirm. | Request status CANCELLED. No journal entry. Bulk cashier sees update. |
| 6.2 | **Only approved** | Try to decline a request that is PENDING or already RECEIVED. | Error: Only an approved (not yet received) request can be declined. |
| 6.3 | **Only requester can decline** | As another user try to decline an approved request. | Error: Only the requesting cashier can decline to receive this float. |

---

## 7. UI and dashboard

| # | Scenario | Steps | Expected |
|---|----------|--------|----------|
| 7.1 | **Top bar – float balance and pending** | With active shift and Float Request permission check top bar. | Shows "Float: LKR X.XX" and if pending "Float request is pending" with dropdown (details and cancel). Manual refresh icon updates balance. |
| 7.2 | **Bulk Cashier – active shifts and balances** | As user with Bulk Cashier Dashboard go to Bulk Cashier page. | Section shows active shifts and real-time float balance per cashier. |
| 7.3 | **Approved request – print slip** | From Bulk Cashier open an approved request. Use print view. | Slip shows 4-digit code, QR, denominations, requested by, approved by, signature lines. |

---

## 8. Quick checklist

- [ ] **Request**: Success with valid denominations; validation for zero total and duplicate pending.
- [ ] **Approve**: Success (match or less with reason); validations for not pending, wrong bulk cashier, more than requested, insufficient balance, less without reason.
- [ ] **Receive**: Success with correct code; invalid code, wrong user, wrong status rejected.
- [ ] **Reject**: Bulk cashier can reject with reason; only assigned bulk cashier; only when pending.
- [ ] **Cancel**: Only requester can cancel pending request with reason.
- [ ] **Decline approved**: Only requester can decline (reject receive) an approved request with reason; no journal entry.
- [ ] **Top bar**: Float balance and pending request status with dropdown and manual refresh.
- [ ] **Bulk Cashier**: Active shifts and real-time float balances; print slip for approved requests.
