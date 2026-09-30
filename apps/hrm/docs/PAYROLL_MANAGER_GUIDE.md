# Payroll Manager — Development Guide

Guidance for building and extending **Payroll** features in `apps/hrm`.  
Use with:

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — layered architecture, checklists
- `apps/hrm/docs/PERMISSION_FLOW.md` — Auth User Group grants
- `apps/hrm/docs/HR_ADMINISTRATION_GUIDE.md` — Paysheet Components (§36), HRM Variable (§37), Salary Cycle (§38)

**Status:** Phase 0 UI shells shipped for all Payroll sidebar routes (empty lists + “dynamic phase” toasts).  
**Strategy:** Dynamize **module-wise** in dependency order (masters → assignments → engine → outputs).  
**Build path (each module):** Doc/types (done for UI) → Prisma/Zod service → Actions → wire live UI.  
**Pages must not call Prisma.** Business rules live in services.

---

## Coverage in this document

| Module | Route | UI shell | Dynamic | Detail |
|--------|-------|----------|---------|--------|
| Salary Structures | `/salary-structures` | Done | **SS1–SS3 live (M1)** | §8 |
| Allowances | `/allowances` | Done | **AL1–AL3 live (M2)** | §9 |
| Deductions | `/deductions` | Done | **DE1–DE3 live (M3)** | §10 |
| Assign Paysheet Component | `/assign-paysheet-component` | Done | **AP1–AP3 live (M4)** | §11 |
| Bulk Assign Paysheet Component | `/bulk-assign-paysheet-component` | Done | **BA1–BA2 live (M5)** | §12 |
| Performance Allowance | `/performance-allowance` | Done | **PA1–PA3 live (M6)** | §13 |
| Loans & Advances | `/loans-advances` | Done | Pending | §14 |
| Salary Generation | `/salary-generation` | Done | Pending | §15 |
| Salary Processing | `/salary-processing` | Done | Pending | §16 |
| Payslips | `/payslips` | Done | Pending | §17 |
| Bank Transfer File | `/bank-transfer-file` | Done | Pending | §18 |
| Salary History | `/salary-history` | Done | Pending | §19 |
| Dynamization roadmap | — | — | — | §6–7 |
| Open product decisions | — | — | — | §20 |

---

## 1. Product surfaces

| Route | Resource | Role |
|-------|----------|------|
| `/salary-structures` | `payroll` | Structure templates (earnings / deductions / employer lines) |
| `/allowances` | `payroll` | Allowance master catalog |
| `/deductions` | `payroll` | Deduction master catalog |
| `/assign-paysheet-component` | `payroll` | Assign component to one staff + date range |
| `/bulk-assign-paysheet-component` | `payroll` | Multi-staff assign + overlap handling |
| `/performance-allowance` | `payroll` | Period performance amounts |
| `/loans-advances` | `payroll` | Loan / advance register + balances |
| `/salary-generation` | `payroll` | Select cycle + staff; generate draft payroll run |
| `/salary-processing` | `payroll` | Apply statutory math; approve / on-hold |
| `/payslips` | `payroll` | Search / view / download / print / email payslips |
| `/bank-transfer-file` | `payroll` | Bank upload batches; Mark Processed → Paid |
| `/salary-history` | `payroll` | Historical records + staff timeline |

Sidebar: **Payroll** collapsible in `desktop-sidebar.tsx` (order matches setup → run → output).

Shared UI types / workflow constants: `apps/hrm/types/payroll.ts`.

---

## 2. Permissions

| Item | Decision |
|------|----------|
| Resource | Single Auth User Group resource **`payroll`** (display: **Payroll**) |
| Routes | All Payroll screens map to `payroll` in `lib/permissions.ts` |
| Grant | Same pattern as Overtime (`overtime-requests`): one grant covers the group |
| Client gates | `usePermissions().has('payroll', 'view' \| 'add' \| 'edit' \| 'delete')` |
| Server | Page `checkRouteAccess`; mutations `requirePermission('payroll', …)` |

Checklist per new payroll action:

1. `RESOURCES` already has `payroll`
2. `ROUTE_TO_RESOURCE` for the route
3. Sidebar `hasAccess`
4. Page `checkRouteAccess` → `/unauthorized-access`
5. Mutations: `requirePermission`
6. Client buttons: `usePermissions().has(...)`
7. Grant on User Group; user re-logins

See `PERMISSION_FLOW.md`.

---

## 3. Payroll workflow stepper

Shared steps (`PAYROLL_WORKFLOW_STEPS` in `types/payroll.ts`):

| # | Label | Href | Ready (UI) |
|---|-------|------|------------|
| 1 | Salary Structures | `/salary-structures` | true |
| 2 | Allowances | `/allowances` | true |
| 3 | Deductions | `/deductions` | true |
| 4 | Payroll Processing | `/salary-processing` | true |
| 5 | Payslips | `/payslips` | true |
| 6 | Bank Transfer File | `/bank-transfer-file` | true |
| 7 | Salary History | `/salary-history` | true |

**Behaviour:** `ready` steps navigate; not-ready toast *“This step page is not available yet.”*  
Assign / Bulk / Performance / Loans / Generation are **outside** the stepper but in the sidebar (supporting setup & run).

---

## 4. Prerequisites (HR Administration)

These masters are **shipped CRUD**; Payroll consumers are deferred until Wave 0:

| Master | Guide | Deferred consumer | Payroll use |
|--------|-------|-------------------|-------------|
| Paysheet Components | HR Admin §36 | **PC5** | Options for Assign / Bulk / structure lines |
| HRM Variable (EPF/ETF/PAYE) | HR Admin §37 | **HV5** | Processing & payslip statutory math |
| Salary Cycle | HR Admin §38 | **SC5** | Generation cycle windows / period filters |

**Do not** invent parallel rate/cycle/component masters inside Payroll.

---

## 5. Architecture

```
UI (workspace / sheets / FilterWrapper / CommonDataTable)
  → Server Actions  (permissions, activity log, revalidate)
    → Services      (Zod, Prisma, code generation, calc)
      → HRM MongoDB
```

| Layer | Path (planned) |
|-------|----------------|
| UI | `app/(dashboard)/(payroll)/<module>/` |
| Actions | `app/actions/payroll-actions/*.actions.ts` |
| Services | `services/payroll-services/*.service.ts` |
| Mappers | `lib/mappers/*-form.mapper.ts` |
| Types | `types/payroll.ts` (+ module-specific types if needed) |

Phase 0 rule: empty `useState([])` / `EMPTY_*_SUMMARY`; mutating actions toast *“Will be wired in the dynamic phase.”*

---

## 6. Dynamization roadmap (module order)

Follow **dependency order**, not sidebar order alone.

### Wave 0 — Foundation (once)

| ID | Deliverable | Status |
|----|-------------|--------|
| **W0.1 PC5** | `getPaysheetComponentOptions` for Assign / Bulk / Structure sheets (`typeId`, `percentage`) | **Done** |
| **W0.2 SC5** | Salary Cycle options (`getSalaryCycleOptionsAction`); wire Generation later | Action ready |
| **W0.3 HV5** | Live EPF/ETF/PAYE for Processing / Payslips | Later (M9) |
| **W0.4 Shared loaders** | Staff, department, designation, institution, bank option APIs | Partial |

### Wave A — Masters

| ID | Module | Goal | Status |
|----|--------|------|--------|
| **M1** | Salary Structures | CRUD templates + line items | **Done (SS1–SS3)** |
| **M2** | Allowances | CRUD over PaysheetComponent (`fixed_allowance` / `percentage_allowance`) | **Done (AL1–AL3)** |
| **M3** | Deductions | CRUD over PaysheetComponent (`fixed_deduction` / `loan` / `advance`) | **Done (DE1–DE3)** |

### Wave B — Assignments & money-in

| ID | Module | Goal | Status |
|----|--------|------|--------|
| **M4** | Assign Paysheet Component | Per-staff assignments + history | **Done (AP1–AP3)** |
| **M5** | Bulk Assign | Multi-staff + overlap detection | **Done (BA1–BA2)** |
| **M6** | Performance Allowance | Period performance amounts | **Done (PA1–PA3)** |
| **M7** | Loans & Advances | Loans/advances + balances | Pending |

### Wave C — Engine

| ID | Module | Goal |
|----|--------|------|
| **M8** | Salary Generation | Draft payroll run from cycle + staff + assignments |
| **M9** | Salary Processing | Statutory calc; approve / on-hold; payment status owner |

### Wave D — Outputs & history

| ID | Module | Goal |
|----|--------|------|
| **M10** | Payslips | Read processed runs; view / export / print / email |
| **M11** | Bank Transfer File | Batches + file + Mark Processed → Paid |
| **M12** | Salary History | Read models + timeline events |

### Suggested cadence

| Sprint | Focus |
|--------|--------|
| A | Wave 0 + M1–M3 |
| B | M4–M7 |
| C | M8–M9 |
| D | M10–M12 |

---

## 7. Planned domain (Prisma — draft)

No Payroll-run models exist yet in `schema.prisma` (only PaysheetComponent / HrmVariable / SalaryCycle). Draft entities for design lock before M1:

```
SalaryStructure 1──* SalaryStructureLine (embedded)
PaysheetComponent          ← Allowances / Deductions are filtered UIs over this (see §20 #1)
PerformanceAllowance *── Staff, period   ← **M6 live (separate collection)**
PaysheetAssignment *── Staff, PaysheetComponent   ← **M4 live**
LoanAdvance *── Staff (+ schedule / balance)
PayrollRun 1──* PayrollRunLine   (Generation → Processing statuses)
Payslip                          (view of approved line / snapshot)
BankTransferBatch 1──* BankTransferBatchLine
SalaryTimelineEvent              (history feed)
```

Exact field lists land in each module phase (schema & service). Prefer denormalized display labels on run/payslip snapshots so history stays readable if masters rename.

### Payment status ownership

| Status | Owner |
|--------|--------|
| Draft / generated | Salary Generation |
| Processed / on hold | Salary Processing |
| Paid | Bank Transfer **Mark Processed** (closes loop) |
| Payslips UI | **Read-only** display / filter of payment status |

---

## 8. Salary Structures

| Item | Decision |
|------|----------|
| Route | `/salary-structures` |
| Resource | `payroll` |
| UI | Workflow stepper + summary + filters + register + Add/Edit sheet |
| Codes | Auto-generated (disabled field in form) |
| Phase 0 | Empty list; save/delete toast stubs |

### UI map

```
CommonManagerHeader: Salary Structures
[ Payroll Workflow stepper ]
[ Summary cards ]
[ Filters ] → [ CommonDataTable + export ]
[ Sheet: Add / Edit Structure ]
```

### Key files

```
app/(dashboard)/(payroll)/salary-structures/
  page.tsx
  salary-structures-workspace.tsx
  salary-structures-ui-context.tsx
  header-actions.tsx
  section-workflow-steps.tsx
  section-summary.tsx
  section-filters.tsx
  section-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-structure-form.tsx
```

### Dynamic phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **SS0** | Doc + types + UI shell | **Done** |
| **SS1** | Prisma `SalaryStructure` + lines; Zod service; `SST-n` codes | **Done** |
| **SS2** | Actions (CRUD, duplicate, status, activity, revalidate) | **Done** |
| **SS3** | Wire list / filters / summary / sheet + PC5 component picker | **Done** |
| **SS4** | Export + live designation/department masters | Later |

---

## 9. Allowances

| Item | Decision |
|------|----------|
| Route | `/allowances` |
| Storage | **No separate collection** — filtered CRUD over `PaysheetComponent` where `typeId` ∈ `fixed_allowance`, `percentage_allowance` |
| UI | Stepper, summary (total / fixed / % / custom), filters (search, type, kind), register, form sheet |
| Codes | Same as PC (`PSC-n` via `generateRecordCode`) |
| Permission | `payroll` (view / add / edit / delete) |
| Amounts | Fixed amounts live on Assign / Structure lines; % stored on PC when type is `percentage_allowance` |

### Dynamic phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **AL0** | UI shell | **Done** |
| **AL1** | Service wrapper (`allowance.service.ts`) over PaysheetComponent | **Done** |
| **AL2** | Actions (`allowance.actions.ts`) | **Done** |
| **AL3** | Wire UI (list, summary, sheet, delete, export) | **Done** |

---

## 10. Deductions

| Item | Decision |
|------|----------|
| Route | `/deductions` |
| Storage | **No separate collection** — filtered CRUD over `PaysheetComponent` where `typeId` ∈ `fixed_deduction`, `loan`, `advance` |
| UI | Stepper, summary (total / fixed / loan / advance), filters (search, type, kind), register, form sheet |
| Codes | Same as PC (`PSC-n`) |
| Permission | `payroll` |
| Note | Loan/advance *balances & schedules* remain on Loans & Advances (M7); this page manages component definitions only |

### Dynamic phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **DE0** | UI shell | **Done** |
| **DE1** | Service wrapper (`deduction.service.ts`) | **Done** |
| **DE2** | Actions (`deduction.actions.ts`) | **Done** |
| **DE3** | Wire UI (list, summary, sheet, delete, export) | **Done** |

---

## 11. Assign Paysheet Component

| Item | Decision |
|------|----------|
| Route | `/assign-paysheet-component` |
| Storage | `PaysheetAssignment` (codes `PSA-n`) |
| UI | Filters + register; sheet form; history sheet (ActivityLog); view dialog |
| Depends on | **PC5** component options; payroll staff options |
| Overlap | Same `staffId` + `componentId` with intersecting date ranges blocked on create/update |
| Status | Derived: `active` / `expiring` (≤30 days to end) / `ended` |

### Dynamic phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **AP0** | UI shell | **Done** |
| **AP1** | `PaysheetAssignment` model + overlap rules | **Done** |
| **AP2** | Actions + history events (ActivityLog) | **Done** |
| **AP3** | Wire UI; consume PC5 + staff options | **Done** |

---

## 12. Bulk Assign Paysheet Component

| Item | Decision |
|------|----------|
| Route | `/bulk-assign-paysheet-component` |
| UI | Staff multi-select + assign form + recent register + overlap dialog |
| Service | Reuses `PaysheetAssignment` create; `bulkCreatePaysheetAssignments` with modes `create` / `skip` / `overwrite` |
| Staff list | Institution **required**; filters on employment composite fields |

### Dynamic phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **BA0** | UI shell | **Done** |
| **BA1** | Bulk create + real overlap query | **Done** |
| **BA2** | Wire UI | **Done** |

---

## 13. Performance Allowance

| Item | Decision |
|------|----------|
| Route | `/performance-allowance` |
| Storage | **Separate** `PerformanceAllowance` collection (`PFA-n`) — not typed `PaysheetAssignment` |
| Modes | `percentage` \| `fixed` (`PerformanceAllowanceMode`) |
| Overlap | Same staff + mode cannot overlap on effective dates |
| UI | Summary + filters + register + form / view; tabs sync `?mode=` |
| Bulk Update | Deferred (button stub only) |

### Dynamic phases

| Phase | Deliverable | Status |
|-------|-------------|--------|
| **PA0** | UI shell | **Done** |
| **PA1** | Prisma model + Zod service CRUD + summary/export | **Done** |
| **PA2** | Actions + ActivityLog | **Done** |
| **PA3** | Wire live UI | **Done** |
| Later | Generation reads active lines; bulk percentage update | Pending |

---

## 14. Loans & Advances

| Item | Decision |
|------|----------|
| Route | `/loans-advances` |
| Status | `active` \| `ongoing` \| `completed` |
| UI | Summary + filters + register + form / view |

### Dynamic phases

| Phase | Deliverable |
|-------|-------------|
| **LA0** | UI shell | **Done** |
| **LA1** | Model + balance / installment rules |
| **LA2–LA3** | Actions → wire; Generation/Processing consume balances |

---

## 15. Salary Generation

| Item | Decision |
|------|----------|
| Route | `/salary-generation` |
| Tabs | Cycle · Staff list · Staff salary preview |
| Depends on | **SC5** cycles; assignments from M4–M7; structures |

### Dynamic phases

| Phase | Deliverable |
|-------|-------------|
| **SG0** | UI shell | **Done** |
| **SG1** | `PayrollRun` draft model + line snapshot builder |
| **SG2** | Actions: generate / clear / export preview |
| **SG3** | Wire cycle options (SC5) + staff selection |

---

## 16. Salary Processing

| Item | Decision |
|------|----------|
| Route | `/salary-processing` |
| Role | Apply **HV5** rates; approve / hold; set payment status toward bank |
| UI | Wizard / summary / staff table / payslip dialog |

### Dynamic phases

| Phase | Deliverable |
|-------|-------------|
| **SP0** | UI shell | **Done** |
| **SP1** | Calc engine (EPF/ETF/PAYE) using HV5 |
| **SP2** | Approve / on-hold / batch actions |
| **SP3** | Wire UI |

---

## 17. Payslips

| Item | Decision |
|------|----------|
| Route | `/payslips` |
| Payment status | Read-only (`paid` \| `processed` \| `pending` \| `on_hold`) |
| Staff filter | Combobox (`staffId`) + Staff Code text |
| Sheet | View payslip; Print / Download / Email toast until file pipeline |

### Dynamic phases

| Phase | Deliverable |
|-------|-------------|
| **PS0** | UI shell | **Done** |
| **PS1** | Read from processed runs / payslip snapshots |
| **PS2** | View sheet live |
| **PS3** | PDF / print / email / export |

---

## 18. Bank Transfer File

| Item | Decision |
|------|----------|
| Route | `/bank-transfer-file` |
| Batch status | `pending` \| `generated` \| `processed` |
| Actions (gated) | Generate (pending) · Download (generated/processed) · Mark Processed · Regenerate (generated) |
| Mark Processed | Confirms bank acceptance; **payslips → Paid** |
| File format | Existing bank upload format (unchanged) |
| Table | Includes Created / Updated columns |
| Header | Link **View Payslips** |

### Dynamic phases

| Phase | Deliverable |
|-------|-------------|
| **BT0** | UI shell | **Done** |
| **BT1** | Batch + line models; generate from approved nets |
| **BT2** | File bytes (bank format) + download |
| **BT3** | Mark Processed status cascade; regenerate rules |

---

## 19. Salary History

| Item | Decision |
|------|----------|
| Route | `/salary-history` |
| Layout | Summary → **filters (~75%) + timeline (~25%)** → **full-width** register |
| Timeline | Staff-scoped; empty state until Staff / Staff Code focus |
| Timeline footer | Net 6 mo avg · Change % (shell placeholders until data) |
| Table | Mock columns; no Created/Updated (audit in History sheet) |
| Sheets | Salary Details · Payslip · Components · History |
| Row actions | View · Payslip · Components · History |
| Header | **View Payslips** |
| Staff filter | Combobox (`staffId`) |

### Dynamic phases

| Phase | Deliverable |
|-------|-------------|
| **SH0** | UI shell | **Done** |
| **SH1** | Read API over runs / payslips / components |
| **SH2** | Timeline events + footer stats |
| **SH3** | Wire all four sheets |

---

## 20. Open product decisions (lock before schema)

Resolve these before or during Wave A / C:

| # | Topic | Options / recommendation |
|---|--------|---------------------------|
| 1 | Allowances & Deductions vs Paysheet Components | **Locked (M2/M3):** thin payroll UI over `PaysheetComponent` — no separate Allowance/Deduction masters. |
| 2 | Salary Structure scope | Template-only vs also staff assignment (assignment may stay on Assign Paysheet) |
| 3 | Generation vs Processing storage | Prefer **one `PayrollRun`** with status machine (`draft` → `processed` → …) |
| 4 | Bank file format | Confirm byte-level format against current bank upload before BT2 |
| 5 | Departments master | Soft string / placeholder ids until Departments ship |
| 6 | Performance vs Assign | **Locked (M6):** separate `PerformanceAllowance` collection (`PFA-n`), not typed `PaysheetAssignment`. |

---

## 21. Activity log keys (planned)

Pattern: `<route-slug>.<event>`

| Event | Examples |
|-------|----------|
| Visit | `salary-structures.visited`, `payslips.visited`, … |
| CRUD | `*.created`, `*.updated`, `*.deleted` |
| Engine | `salary-generation.generated`, `salary-processing.approved` |
| Bank | `bank-transfer-file.generated`, `bank-transfer-file.processed` |

Use `logActivityNonBlocking` from actions (same as HR Admin / Leave).

---

## 22. File layout (target)

```
apps/hrm/
  app/(dashboard)/(payroll)/
    salary-structures/
    allowances/
    deductions/
    assign-paysheet-component/
    bulk-assign-paysheet-component/
    performance-allowance/
    loans-advances/
    salary-generation/
    salary-processing/
    payslips/
    bank-transfer-file/
    salary-history/
  types/payroll.ts
  # dynamic phase:
  app/actions/payroll-actions/
    salary-structure.actions.ts
    allowance.actions.ts
    …
  services/payroll-services/
    salary-structure.service.ts
    …
  lib/mappers/
    salary-structure-form.mapper.ts
    …
```

---

## 23. Per-module dynamic checklist

Copy when starting a module:

- [ ] Product decisions in §20 locked for this module
- [ ] Prisma model(s) + indexes + codes
- [ ] Zod service (no Prisma in UI)
- [ ] Server actions (permissions, activity, revalidate)
- [ ] Mappers → UI records
- [ ] Page loads list + filter options
- [ ] Sheets / dialogs call actions (remove LATER toasts)
- [ ] Summary cards from service aggregates
- [ ] Export wired or explicitly deferred
- [ ] Manual smoke: create → edit → list filter → delete/end
- [ ] Update this guide phase status to **Done**

---

## 24. Definition of done (Payroll dynamic PR)

- [ ] Matches layered architecture (§5)
- [ ] `payroll` permission on route + mutations
- [ ] Yup (client) + Zod (service) where forms exist
- [ ] Activity log for meaningful events
- [ ] List/search/pagination via URL params where other modules do
- [ ] Audit fields set server-side
- [ ] No Prisma / secrets in client components
- [ ] Downstream consumers (PC5/HV5/SC5) not bypassed with hardcoded rates/options
- [ ] Guide phase table updated

---

*Last updated: Sep 2026 — M1 Salary Structures CRUD live (SS1–SS3); Phase 0 UI complete for remaining Payroll modules.*
