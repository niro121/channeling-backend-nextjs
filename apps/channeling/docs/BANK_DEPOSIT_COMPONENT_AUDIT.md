# Bank Deposit & Bank Account Component Audit

Audit performed against [`docs/COMPONENT_AUDIT_SKELETON.md`](./COMPONENT_AUDIT_SKELETON.md) for:
- Bank Account CRUD module (`/bank-accounts`)
- Ledger add/list flow changes for new `Bank Deposit` type (`/ledger`)

---

## 1. Normal Structure Overview

| Layer | Status | Notes |
|-------|--------|-------|
| List page | PASS | `bank-accounts/page.tsx` is server component, guarded, URL-param driven. |
| Pagination | PASS | `CustomDataTable` server-driven pagination via URL params in actions/service. |
| Search | PASS | `SearchInput` updates URL (`keyword`), server refetch via action/service. |
| Filters | PASS (minimal) | Bank account list supports URL params for `bankId`/`locationId` in action/service. |
| Add route | PASS | `/bank-accounts/add` uses shared form with `bankAccount={null}`. |
| Edit route | PASS | `/bank-accounts/[id]/edit` loads record via action and reuses same form. |
| Form | PASS | Client form uses Formik + Yup (`bank-account-form.tsx`). |
| Server validation | PASS | Service uses Zod for create/update payloads. |
| Permissions | PASS | Route guard + action-level `requirePermission` in bank-account and ledger actions. |

---

## 2. File / Route Skeleton Mapping

### Bank Accounts
- [`app/(dashboard)/bank-accounts/page.tsx`](../app/(dashboard)/bank-accounts/page.tsx)
- [`app/(dashboard)/bank-accounts/add/page.tsx`](../app/(dashboard)/bank-accounts/add/page.tsx)
- [`app/(dashboard)/bank-accounts/[id]/edit/page.tsx`](../app/(dashboard)/bank-accounts/[id]/edit/page.tsx)
- [`app/(dashboard)/bank-accounts/bank-account-form.tsx`](../app/(dashboard)/bank-accounts/bank-account-form.tsx)
- [`app/actions/bank-account.actions.ts`](../app/actions/bank-account.actions.ts)
- [`services/bank-account.service.ts`](../services/bank-account.service.ts)

### Ledger (Bank Deposit additions)
- [`app/(dashboard)/ledger/ledger-transaction-form.tsx`](../app/(dashboard)/ledger/ledger-transaction-form.tsx)
- [`app/actions/ledger/add-ledger-transaction.action.ts`](../app/actions/ledger/add-ledger-transaction.action.ts)
- [`services/ledger/create-ledger-receipt.service.ts`](../services/ledger/create-ledger-receipt.service.ts)
- [`services/ledger/cancel-ledger-receipt.service.ts`](../services/ledger/cancel-ledger-receipt.service.ts)
- [`services/ledger/list-ledger-receipts.service.ts`](../services/ledger/list-ledger-receipts.service.ts)
- [`app/(dashboard)/ledger/filter-section.tsx`](../app/(dashboard)/ledger/filter-section.tsx)

---

## 3. List View Checklist (Bank Accounts)

- [x] List page is server component.
- [x] Route guard with `checkRouteAccess('/bank-accounts')`.
- [x] Data path is action -> service (`getAllBankAccounts` -> `getAllBankAccountsService`).
- [x] URL `searchParams` used (`page`, `limit`, `keyword`, optional filter ids).
- [x] `CustomDataTable` used with `rowCount`.
- [x] Search via URL-based `SearchInput`.
- [x] Add button links to `/bank-accounts/add`.

---

## 4. Pagination Checklist (Bank Accounts)

- [x] Server-side pagination with URL params.
- [x] No client-side list slicing.
- [x] Action/service called with new `page/limit` after URL update.

---

## 5. Add / Edit Routes Checklist (Bank Accounts)

- [x] Add route exists and uses same form.
- [x] Edit route exists and uses same form.
- [x] Shared form differentiates by `bankAccount` prop (`null` vs loaded record).

---

## 6. Form & Validation Checklist

### Bank Accounts
- [x] Formik + Yup in form component.
- [x] Zod validation in service.
- [x] Server issues are returned in structured format (`error.issues`).

### Ledger Bank Deposit
- [x] Formik + Yup updated for `BANK_DEPOSIT` specific validation (`bankAccountId`, branch required, amount positive).
- [x] Action and service validation enforce cash-only and required bank account mapping.

---

## 7. Permissions Checklist

- [x] Bank account route guard via `checkRouteAccess('/bank-accounts')`.
- [x] Bank account actions guarded with `requirePermission('bank-accounts', action)`.
- [x] Ledger route guard remains in place.
- [x] Ledger add action guarded with `requirePermission('ledger', 'add')`.
- [x] New bank-account option fetch for ledger guarded with `requirePermission('ledger', 'add')`.

---

## 8. Bank Deposit Accounting/Behavior Audit

- [x] Transaction type added: `BANK_DEPOSIT`.
- [x] Posting rule implemented: Dr Bank GL / Cr Till Cash.
- [x] Cash-only enforcement for Bank Deposit.
- [x] Till cash sufficiency check before posting.
- [x] Branch-to-bank-account consistency check (`bankAccount.locationId === branchId`).
- [x] Bank account must be active and linked to GL account (`accountId`).
- [x] Cancel flow supports reversal via `BANK_WITHDRAW`.

---

## 9. Known Deviations / Follow-ups

- BankAccount `accountId` introduced as nullable for rollout safety; business logic enforces mapping for Bank Deposit creation/cancel reversal path.
- Existing bank accounts without GL mapping will be visible but unusable for Bank Deposit until linked.
- Consider adding a dedicated bank-account filter UI (bank/location selectors) on the bank-account list toolbar for full parity with service capabilities.
