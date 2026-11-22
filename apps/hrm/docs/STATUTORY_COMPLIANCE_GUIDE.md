# Statutory Compliance — Explanation & Guidance

How **Staff EPF / ETF numbers**, **HR Admin (HRM Variable + Paysheet Components)**, **Payroll**, and the **Statutory** design mock fit together in `apps/hrm`.

Use with:

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — layered architecture
- `apps/hrm/docs/HR_ADMINISTRATION_GUIDE.md` — Paysheet Components (§36), HRM Variable (§37)
- `apps/hrm/docs/PAYROLL_MANAGER_GUIDE.md` — generation, processing, payslips
- `apps/hrm/docs/PERMISSION_FLOW.md` — Auth User Group grants
- `apps/hrm/docs/STAFF_MANAGER_GUIDE.md` — Staff Employment Reference (EPF / ETF uniqueness; Registration Number open checklist)

**Status:** Upstream masters and payroll statutory *math* are live. The **Statutory Compliance** sidebar group (EPF / ETF / PAYE returns, government submissions, employer contributions dashboard) is **design-only** — no routes or services yet. This document locks the connection model so that module can be built without reinventing rates or IDs.

**Build path (when Statutory ships):** Doc/types → aggregate from `PayrollRunLine` → return drafts → export / submission status UI.  
**Pages must not call Prisma.** Do **not** duplicate EPF/ETF/PAYE rates inside Statutory — always read **HRM Variable**.

---

## Locked product decisions

| # | Decision |
|---|----------|
| 1 | **Membership IDs live on Staff.** `Staff.hrDetails.epfNumber` and `Staff.hrDetails.etfNumber` are the government member account numbers. They identify a person on returns; they do **not** change contribution % or rupee amounts. |
| 2 | **Rates live in HRM Variable (singleton).** `epfEmployee`, `epfCompany`, `etfEmployee`, `etfCompany`, plus PAYE slabs. One hospital-wide set. Statutory cards use the same rates payroll already applied. |
| 3 | **Wage base is defined by Paysheet Components.** `includedForIds` (`epf`, `etf`, `pay_tax`, …) decide which assigned earnings enter each statutory base. |
| 4 | **Rupee amounts are produced by Payroll.** `PayrollRunLine.epf8` / `epf12` / `etf3` / `paye` are the source of truth for period totals. Statutory **sums and files** those lines; it does not re-invent the formula. |
| 5 | **Statutory UI is a reporting + filing layer.** Summary cards, donut, Form C / ETF / PAYE returns, submission workflow. Downstream of approved/processed payroll runs. |
| 6 | **Do not invent parallel masters.** No second rate table, no second EPF number store, no Statutory-only paysheet catalog. |

---

## 1. End-to-end chain

```
┌─────────────────────┐
│ Staff (Employment   │  Who — membership IDs
│ Reference)          │  epfNumber, etfNumber
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ HR Admin            │  How much % / which earnings count
│ • HRM Variable      │  rates + PAYE slabs
│ • Paysheet Component│  includedForIds (epf, etf, pay_tax, …)
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Payroll             │  Assign components → Generate run →
│                     │  Recalculate statutory → Payslips
│                     │  Stores epf8 / epf12 / etf3 / paye per staff
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Statutory (mock)    │  Period totals + government returns
│ Compliance          │  Form C, ETF Return, PAYE, submissions
└─────────────────────┘
```

| Layer | Question it answers | Example |
|-------|---------------------|---------|
| Staff | *Whose account?* | EPF No `EPF/123/456` on Form C |
| HRM Variable | *What % / tax rules?* | Employee 8%, Employer 12%, ETF 3%, PAYE slabs |
| Paysheet Component | *What money counts?* | Housing allowance included for EPF |
| Payroll run line | *How many rupees this month?* | `epf8 = 12,000` for ST-12 |
| Statutory | *What do we file / pay to government?* | Sum all `epf8` → Form C draft |

---

## 2. Staff module — EPF Number & ETF Number

**UI:** Staff → General → **Employment Reference** accordion  
**Field ids:** `epfNumber`, `etfNumber`  
**Storage:** `Staff.hrDetails.epfNumber`, `Staff.hrDetails.etfNumber` (optional strings, max 50)

| Field | Payroll today | Statutory (planned) |
|-------|---------------|---------------------|
| **EPF Number** | Shown on payslips / salary history; filter + denormalized copy on Assign Paysheet | Row key on **EPF Return – Form C** |
| **ETF Number** | Stored on staff only; no payroll consumer yet | Row key on **ETF Return** |

**Rules for implementers:**

- Trim on read for display; empty → show `—` on slips / returns.
- **Uniqueness (enforced):** non-blank `epfNumber` / `etfNumber` must be unique among **active** staff (`status === 1`), same pattern as Finger Print / RFID. Blank is allowed. Trimmed on save.
- Changing the number on Staff updates **live** payslip display (payslips load contact fields from Staff at view time). Historical filed returns should **snapshot** the number onto the return row when the return is generated (planned).

**Not these fields:** Contribution percentages and employer/employee rupee amounts. Those come from Variables + Payroll.

Related UI: `app/(dashboard)/staff/form-general.tsx` (Employment Reference).  
Mapper: `lib/mappers/staff-hr-details.mapper.ts`.

---

## 3. HR Admin — HRM Variable (rates & PAYE)

**Route:** `/hrm-variables`  
**Resource:** `hrm-variables`  
**Guide:** `HR_ADMINISTRATION_GUIDE.md` §37

| Stored field | Meaning | Typical mock label |
|--------------|---------|-------------------|
| `epfEmployee` | Employee EPF rate (%) | EPF (EMPLOYEE 8%) |
| `epfCompany` | Employer EPF rate (%) | EPF (EMPLOYER 12%) |
| `etfEmployee` | Employee ETF rate (%) — reserved | (often 0 in SL practice) |
| `etfCompany` | Employer ETF rate (%) | ETF (3%) |
| PAYE slabs | Progressive bands | PAYE card |

Payroll consumers:

- Generate / line build: employee EPF rate → `PayrollRunLine.epf8`
- Salary Processing **recalculate statutory**: fills `epf12`, `etf3`, refreshes `epf8` / `paye` from current Variable rates + slabs

Statutory consumers (planned):

- Card % labels may be read from Variable for display consistency.
- **Totals on cards must still come from summed payroll lines**, not from “rate × headcount” guesses.

---

## 4. HR Admin — Paysheet Components (templates)

**Route:** `/paysheet-components`  
**Resource:** `paysheet-components`  
**Guide:** `HR_ADMINISTRATION_GUIDE.md` §36  
**Constants:** `types/paysheet-component.ts` → `PAYSHEET_COMPONENT_INCLUDED_FOR`

| `includedForIds` id | Label | Intended effect on wage base |
|---------------------|-------|------------------------------|
| `epf` | Included for EPF | Add component amount into EPF wage base |
| `etf` | Included for ETF | Add into ETF wage base (when engine honors flag) |
| `pay_tax` | Included for Pay Tax | Affect PAYE taxable base (when engine honors flag) |
| `ot` / `no_pay` / `ph` / `allowances_ph_day_off` | Other payroll flags | Outside statutory returns core |

**Current engine behaviour (important):**

- Payroll run build expands the EPF wage base for allowances whose component includes **`epf`** (`payroll-run.service.ts`).
- Flags `etf` and `pay_tax` are stored on the master and toggled in UI; full symmetric use in the calc engine is still incomplete — treat aligning ETF / PAYE bases with these flags as a Payroll hardening item before Statutory filing goes live.

Assign / Bulk Assign copy `epfNumber` onto `PaysheetAssignment` for search/display only.

---

## 5. Payroll — where statutory rupees are created

**Guide:** `PAYROLL_MANAGER_GUIDE.md` (§15 Generation, §16 Processing, §17 Payslips)

### 5.1 Line fields

| Field on `PayrollRunLine` | Meaning | Payslip / Statutory use |
|---------------------------|---------|-------------------------|
| `epf8` | Employee EPF amount | Deduction on slip; Form C employee column; card “EPF employee” |
| `epf12` | Employer EPF amount | Employer section on slip; Form C employer column; card “EPF employer” |
| `etf3` | Employer ETF amount | Employer section on slip; ETF Return; card “ETF” |
| `paye` | PAYE tax | Deduction on slip; PAYE monthly return; card “PAYE” |

Employer amounts (`epf12`, `etf3`) do **not** reduce net salary; they are employer cost / remittance lines.

### 5.2 Processing step

Salary Processing → **recalculate statutory** (`recalculatePayrollStatutory` / `recalculatePayrollStatutoryAction`):

1. Load HRM Variable rates + PAYE slabs.
2. For each line in the run, recompute `epf8` / `epf12` / `etf3` / `paye` / `net`.
3. Roll totals onto the run for the processing workspace.

Until a run has been through this step (or equivalent), employer columns may be `0` even if employee EPF exists from generation.

### 5.3 Payslips

`payslip.service.ts` loads `staff.hrDetails.epfNumber` for the header (“EPF No”).  
ETF number is not printed on the current payslip UI.

---

## 6. Statutory Compliance module (design mock)

**Status:** UI design only (sidebar group **Statutory** with EPF · ETF · PAYE · Government Reports · Employer Contributions).  
**No** `ROUTE_TO_RESOURCE` entries, pages, or Prisma models for returns yet.

### 6.1 Planned surfaces (from mock)

| Surface | Role |
|---------|------|
| **Statutory Compliance hub** | Summary cards + contribution donut + government submissions list |
| **EPF** | EPF-focused register / Form C workflow |
| **ETF** | ETF return workflow |
| **PAYE** | Monthly PAYE return workflow |
| **Government Reports** | Broader filings (e.g. wages register, annual IR) |
| **Employer Contributions** | Employer-side `epf12` + `etf3` (and related) for finance |

Hub mock elements → data mapping:

| Mock element | Source |
|--------------|--------|
| Card EPF employee | `SUM(PayrollRunLine.epf8)` for selected period / runs |
| Card EPF employer | `SUM(epf12)` |
| Card ETF | `SUM(etf3)` |
| Card PAYE | `SUM(paye)` |
| Donut % | Share of those four totals |
| **EPF Return – Form C** | Per staff: code, name, **epfNumber**, wage base, epf8, epf12 |
| **ETF Return** | Per staff: code, name, **etfNumber**, wage base, etf3 |
| **PAYE Monthly Return** | Per staff: taxable income, paye |
| Submission status (Draft / Ready / Submitted) | New return document workflow (not on payroll lines) |
| Generate Return | Export (CSV/Excel/PDF/vendor format) from a frozen return snapshot |

### 6.2 Suggested domain (when implementing)

Keep thin; prefer aggregating live payroll until a return is “frozen”:

| Concept | Purpose |
|---------|---------|
| `StatutoryReturn` (or per-type models) | Period, type (`epf_form_c` \| `etf` \| `paye_monthly` \| …), status, due date, totals snapshot |
| `StatutoryReturnLine` | staffId, membership number snapshot, wage base, amounts |
| Link | Optional `payrollRunId[]` or cycle id that fed the snapshot |

**Do not** recalculate % from Variables at export time if the return is already Approved/Submitted — use the frozen line amounts so filings match the payslips that were paid.

### 6.3 Permissions (planned)

Prefer one Auth resource for the group (same pattern as `payroll` / `attendance`), e.g. `statutory`, **or** split per filing type if product requires separate grants. Lock the choice in `PERMISSION_FLOW.md` before first CRUD PR.

---

## 7. Ops procedure (how HR should use the chain)

| Step | Where | What |
|------|--------|------|
| 1 | Staff → Employment Reference | Enter **EPF Number** (and **ETF Number** when available from fund / HR file) |
| 2 | HR Admin → HRM Variable | Confirm statutory % and PAYE slabs for the hospital |
| 3 | HR Admin → Paysheet Components | Flag earnings that are included for EPF / ETF / Pay Tax |
| 4 | Payroll → Assign / Bulk Assign | Attach components to staff |
| 5 | Payroll → Salary Generation | Create draft run for the salary cycle |
| 6 | Payroll → Salary Processing | Recalculate statutory; review; Approve |
| 7 | Payroll → Payslips | Staff see EPF No + contribution amounts |
| 8 | Statutory (future) | Open period hub → Generate / review Form C, ETF, PAYE → mark Submitted |

If Step 1 EPF Number is blank, payslips and Form C still compute amounts but print `—` for the member ID — filing quality fails, not payroll math.

---

## 8. Gaps & implementation checklist

### Already in place

- [x] Staff form fields + `StaffHrDetails.epfNumber` / `etfNumber`
- [x] HRM Variable rates + PAYE slabs CRUD
- [x] Paysheet Component `includedForIds` master
- [x] Assign Paysheet uses / indexes `epfNumber`
- [x] Payroll line statutory fields + recalculate statutory action
- [x] Payslip / salary history show EPF number + contribution amounts

### Before Statutory filing goes live

- [ ] Honor `includedForIds` for **`etf`** (and **`pay_tax`**) consistently in payroll wage-base build
- [ ] Surface **ETF Number** on payslip / salary history if product requires parity with EPF
- [ ] Decide return snapshot model + status workflow
- [ ] Map routes + `statutory` (or per-screen) permission resource
- [ ] Aggregate API: period totals from processed/paid runs only (product lock)
- [ ] Form C / ETF / PAYE export formats (confirm with finance / auditor)
- [ ] UI hub matching mock (cards, donut, submissions list, Generate Return)

### Optional later

- [x] Active-staff uniqueness for `epfNumber` / `etfNumber`
- [ ] Auto-suggest return draft when a cycle is marked Paid
- [ ] Labour Dept wages register / annual IR from same line store

---

## 9. File map (reference)

| Concern | Location |
|---------|----------|
| Staff Employment Reference UI | `app/(dashboard)/staff/form-general.tsx` |
| Staff HR details types / mapper | `types/staff.ts`, `lib/mappers/staff-hr-details.mapper.ts` |
| Staff persist | `services/staff-services/staff.service.ts` |
| Paysheet included-for constants | `types/paysheet-component.ts` |
| Paysheet CRUD | `services/hr-admin-services/paysheet-component.service.ts` |
| Statutory rates CRUD | `services/hr-admin-services/hrm-variable.service.ts` |
| Rates UI | `app/(dashboard)/(hr-admin)/hrm-variables/` |
| Wage base + epf8 on generate | `services/payroll-services/payroll-run.service.ts` |
| Employer EPF/ETF + PAYE recalc | `services/payroll-services/salary-processing.service.ts` |
| Payslip EPF No | `services/payroll-services/payslip.service.ts` |
| Assign filter by EPF | `services/payroll-services/paysheet-assignment.service.ts` |
| Prisma embeds | `StaffHrDetails` in `prisma/schema.prisma`; `PaysheetAssignment.epfNumber`; `PayrollRunLine` statutory columns |

---

## 10. Acceptance criteria (when Statutory MVP ships)

1. Changing HRM Variable rates and re-running **recalculate statutory** on a draft/on-hold run changes line amounts; Statutory period totals for that run match the new lines after refresh.
2. Staff with a filled **EPF Number** appear on Form C draft with that number; blank IDs show as empty/`—` without blocking amount columns.
3. **ETF Return** uses **ETF Number** from Staff (snapshot at generate).
4. Hub cards equal the sum of included payroll lines for the selected period filter (processed/paid — per product lock).
5. Approving a return freezes line snapshots; later staff EPF edits do not rewrite a Submitted return.
6. No second copy of EPF/ETF % exists under Statutory settings.

---

## 11. Open product decisions

| Topic | Options | Notes |
|-------|---------|-------|
| Which run statuses feed returns? | `processed` only vs `processed` + `paid` | Prefer amounts that match money actually remitted |
| ETF employee rate | Use `etfEmployee` or always 0 | Variable field exists; SL practice is often employer-only |
| Permission model | One `statutory` resource vs per filing type | Match payroll/attendance unless compliance needs split |
| Return code prefix | e.g. `EFC-n`, `ETF-n`, `PAY-n` | Align with `generateRecordCode` style |
| Uniqueness of membership IDs | **Hard block** on Staff create/update among active staff | Done — see §2 |

Update this section when product locks an option; then tick checklist items in §8.
