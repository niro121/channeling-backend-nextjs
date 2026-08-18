# Roster & Shifts Manager — Development Guide

Guidance for building roster and shift features in `apps/hrm`.
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).
Leave / Overtime are the process references — see `LEAVE_MANAGER_GUIDE.md` and `OVERTIME_MANAGER_GUIDE.md`.

**Status:** Phase 0 layouts complete for all eight screens (minor style / component polish allowed).  
**Domain (Phase 1 map):** locked in this doc (17 Aug 2026).  
**D1:** Six collections in `schema.prisma` + `types/roster.ts`; `prisma db push` applied locally.  
**Build path:** UI first (done), then **Types/Zod → Service → Actions → wire UI**. Vertical slices, one collection or read/write path at a time.  
Pages must not call Prisma. No business rules in components. Next: **D2 Shift Types CRUD**.

**Locked product decisions (Roster & Shifts group):**
- Sidebar group: **Roster & Shifts**
- **One permission resource** `shift-roster` for the whole group (`/shift-roster`, `/shift-types`, `/shift-assignment`, `/duty-roster`, `/roster-amendments`, `/night-shifts`, `/overnight-shifts`, `/public-holiday-shifts`, …)
- Shift Types codes: **`SHF-n`** via `generateRecordCode` (not fixed `D`/`E`/`N` system IDs) — auto on create/duplicate
- Shift Types Add / Edit / Duplicate / History: **right-side Sheets** on `/shift-types` (no separate add/edit routes)
- Shift Types: Total Working Hours **auto** from start / end / break; History sheet **Cancel only**
- Shift Types Duplicate: toolbar requires **exactly one** selected row (else toast)
- Shift Types **categories** (locked): General, Nursing, Emergency, Rotational, Night, Overnight, Holiday. Category is a filter label only — it does **not** set Night / Overnight / Public Holiday Eligible rules.
- Shift Assignment: **`CommonDataTable`** register; Assign / Bulk / Edit / History sheets; no header Save / Remove Assignment
- Shift Assignment Bulk Assign: requires **≥1** selected row; History timeline + **Cancel only** (same as Shift Types)
- Shift Assignment / Duty Roster / Roster Amendments / Night Shifts / Overnight Shifts / Public Holiday Shifts sidebar: **leave expanded** (register pages, not focus calendar)
- Duty Roster: Daily view only in Phase 0; Weekly/Monthly toast; Print/PDF/Excel on table only
- Duty Roster status: Draft / Pending Approval / Published / Amended; History Cancel-only timeline
- Roster Amendments: **`CommonDataTable`**; header New / Approve / Reject; table-only Print/PDF/Excel
- Roster Amendments Approve / Reject: **≥1** selected row; skip already Approved/Rejected
- Roster Amendments status: Draft / Pending Approval / Approved / Rejected; History Cancel-only timeline
- Night Shifts: **`CommonDataTable`**; header Add only; table-only Print/PDF/Excel; consecutive nights **> 3** red badge
- Night Shifts status: Draft / Pending Approval / Approved / Rejected; new defaults to Pending Approval
- Night Shifts Overnight / Public Holiday: sibling routes, not tabs on this page
- Overnight Shifts: **`CommonDataTable`**; header Add + Recalculate Splits (toast); table-only Print/PDF/Excel
- Overnight Shifts: Auto Split at midnight; attendance allocation Start/End date; Status includes Amended
- Public Holiday Shifts: **`CommonDataTable`**; header Add + Bulk Assign Holiday Duty (≥1 selected); table-only Print/PDF/Excel
- Public Holiday Shifts: Phase 0 used **sample** holidays; v1 persist uses Roster `HolidayCalendar` stub. Holiday → Type + Duty Date; Shift → Worked Hours; Staff → Duty Location
- Public Holiday Shifts: Pay Rate badges 1.50x / 2.00x / 2.50x; Lieu Leave Yes/No; Send to Payroll on form only
- Public Holiday Shifts status: Draft / Pending Approval / Approved / Rejected / Amended; new defaults to Pending Approval
- Shift Roster sample week: **current calendar week** (Sun–Sat)
- Shift Roster Hide / Visible: local toggle for Department / Unit / Designation
- `/shift-roster` auto-collapses the desktop sidebar (Channeling focus-page pattern)
- Shift Types register: **`CommonDataTable`** (flat CRUD). Roster grid stays module-specific.
- **Phase 0 layouts accepted for dynamic work** — do not reopen screen structure; minor style / component polish is allowed

**Locked domain (dynamic — 17 Aug 2026):**
- **One allocation store:** Shift Roster (week grid) and Duty Roster (daily list) are two views of `RosterAllocation` (staff × calendar date). Do not persist Duty as a second copy.
- **Shift Assignment** is its own collection (`StaffShiftAssignment`) — standing rule / rotation over a date range. It feeds Fill / Auto Assign; it is not a calendar cell.
- Duty-only facts (location, supervisor, attendance, comments) live **on the allocation**.
- After **Publish**, cells are immutable except via **Roster Amendments** (apply on Approve). Draft periods stay editable.
- **Statuses:** period header Draft → Published; each cell follows the period, **Amended** after an approved amendment; Assignment Active / Pending / Inactive; Night / Overnight / Holiday **do not** get a second independent workflow — they show the allocation (and payroll flags).
- Night / Overnight / Holiday are **registers of allocations** (shift-type flags or holiday date). **Add** only if that staff + date has no cell. Phase 0 status dropdowns stay until wiring; they **map to the cell/period**, they are not a second approval engine.
- Holiday dates in v1: **`HolidayCalendar` stub** inside Roster (not waiting on HR Administration).
- Grant Lieu Leave / Send to Payroll: **flags only** in v1 (no Leave Entitlement write, no payroll engine).
- Duty attendance: store Present / Late / Absent. No RFID engine in v1.
- Overnight: **store** Day 1 / Day 2 / Total hours + attendance allocation date; service still computes from start/end.
- **Uniqueness:** one shift per staff per calendar date (hospital-wide).
- Permissions: keep **one** `shift-roster` resource. `edit` = allocate / save draft / swap. `add` or `edit` = publish and amendment approve. View-only cannot publish.
- **Defer:** Weekly/Monthly Duty views, drag-and-drop persist, Create Fixed Roster, OT Process Staff Shift, Leave Application overlap, real Holiday Date master.

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/shift-roster` | `shift-roster` | Week/month grid **view** of allocations (plan, draft, publish, copy) |
| `/shift-types` | `shift-roster` | Shift master (timings, night/overnight/holiday flags) — own collection |
| `/shift-assignment` | `shift-roster` | Standing staff ↔ shift / rotation **rule** — own collection; feeds Fill / Auto Assign |
| `/duty-roster` | `shift-roster` | Daily **view** of the same allocations (assign, swap, replace, attendance) |
| `/roster-amendments` | `shift-roster` | Overlay on **published** allocations; apply on Approve |
| `/night-shifts` | `shift-roster` | Register: allocations whose shift type is night (hours, consecutive-night alerts) |
| `/overnight-shifts` | `shift-roster` | Register: allocations whose shift type is overnight (stored midnight split) |
| `/public-holiday-shifts` | `shift-roster` | Register: allocations on `HolidayCalendar` dates (pay rate, lieu, payroll flags) |

**Permission:** one Auth User Group grant — resource id `shift-roster`, display name **Roster & Shifts** — covers every route in this group (same pattern as OT → `overtime-requests`).

Sidebar: **Roster & Shifts** collapsible → Shift Roster, Shift Types, Shift Assignment, Duty Roster, Roster Amendments, Night Shifts, Overnight Shifts, Public Holiday Shifts.

Shift Roster v1 is **one screen** for calendar planning. Header actions stay on that page as dialogs / toasts until later phases split them.

Overtime **Process Staff Shift** stays sample/toast until the roster **read** service exists (dynamic slice D4+).

**Source of truth:**

```
ShiftType  (master)
    │
    ▼
StaffShiftAssignment  (standing rule: Fernando → 3-shift from 1 Jan)
    │  Fill / Auto Assign
    ▼
RosterAllocation  (actual day: Fernando + 11 Aug + Day)
    │
    ├── Shift Roster     week grid
    ├── Duty Roster      one day’s list (same rows)
    ├── RosterAmendment  change a published cell
    └── Night / Overnight / Holiday registers (filter + extra fields on the allocation)
HolidayCalendar  (v1 stub dates; Public Holiday Shifts joins allocations to these dates)
```

**Module build order (dynamic):** shared Phase 1 types + schema → Shift Types CRUD → Shift Assignment CRUD → Roster **read** → Roster **draft write** (sheet allocate; drag persist later) → Publish / copy / fill → point Duty Roster at the same store → Amendments → Night / Overnight → Holiday stub. Do not persist Night/Holiday/Duty as separate copies of the week.

---

## 2. UI map — Shift Roster (Phase 0)

Match the Shift Roster mock. Compose like Overtime (`CommonManagerHeader` + count cards + sections).

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Shift Roster                                                              │
│ Calendar-based roster planning with drag-and-drop allocation,             │
│ weekly/monthly views, copy, publish and export.                           │
│   [ Fill New ] [ Fill Old Roster ] [ Create Fixed Roster ]                │
│   [ Save Draft ] [ Publish Roster ]                                       │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Staff Rostered ─┐ ┌─ Shifts This Week ─┐ ┌─ Total Hours ─┐ ┌─ Conflicts ─┐
│       248        │ │       1,736        │ │    13,888     │ │      0      │
└──────────────────┘ └────────────────────┘ └───────────────┘ └─────────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ Department │ Unit │ Roster │ Date range │ Staff Search                    │
│ [ Load Roster ] [ Clear ] [ Hide ] [ Visible ]                            │
│ [ Copy Previous Week ] [ Copy Previous Month ]                            │
│ [ Print Blank Roster ] [ Print Filled Roster ]                            │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Week of 01 Sep 2025 – 07 Sep 2025     [ Weekly ] [ Monthly ]             │
│                          [ + Allocate Shift ] [ Print ] [ Excel ] [ PDF ] │
│ D Day │ E Evening │ N Night │ O Off │ L Leave                             │
│ ── custom roster grid (not CommonDataTable) ───────────────────────────── │
│ Staff ID │ Name │ Dept │ Unit │ Designation │ Sun…Sat │ Hours │ OT │ …    │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/shift-roster/`:

| File | Role |
|------|------|
| `page.tsx` | Access check, compose layout, sample data |
| `header-actions.tsx` | Fill New, Fill Old, Create Fixed, Save Draft, Publish |
| `section-roster-summary.tsx` | Four count cards |
| `section-roster-filters.tsx` | Search & Filters card |
| `section-roster-grid.tsx` | Week header, legend, **module table**, pagination, audit footer |
| `roster-column-header.tsx` | Sortable header + per-column filter input |
| `shift-chip.tsx` | Reusable chip (type, time range, Leave checkbox); click → Edit sheet |
| `shift-legend.tsx` | D / E / N / O / L badges |
| `record-actions.tsx` | Edit / Delete / History (sheets + delete confirm) |
| `shift-roster-workspace.tsx` | Client: filters, Hide/Visible, Load/Clear, sheets provider |
| `shift-roster-ui-context.tsx` | Open Add / Edit / History sheets |
| `sheet-roster-allocation-form.tsx` | Allocate / Edit allocation sheet (toast save Phase 0) |
| `sheet-roster-allocation-history.tsx` | Change History sheet; **Cancel only** |
| `sample-data.ts` | Mock staff rows, shifts, summary, filter options |

### 2.1 Header

Reuse `CommonManagerHeader`:

- `title`: `Shift Roster`
- `description`: `Calendar-based roster planning with drag-and-drop allocation, weekly/monthly views, copy, publish and export.`
- `actions`: `ShiftRosterHeaderActions`

| Button | Style | Phase 0 |
|--------|-------|---------|
| Fill New | Outline | Toast |
| Fill Old Roster | Outline | Toast |
| Create Fixed Roster | Outline + sparkles icon | Toast |
| Save Draft | Outline + disk icon | Toast |
| Publish Roster | Primary green + send icon | Toast |

Gate write buttons with `usePermissions().has('shift-roster', 'edit')`.
Phase 0: toast *“Will be wired in a later phase”* — do not call Prisma.

### 2.2 Summary cards

Same grid as leave-management / overtime: `grid-cols-2 lg:grid-cols-4`, `Card` + `CardContent`.

| Card | Sample | Sub-text | Icon |
|------|--------|----------|------|
| Staff Rostered | `248` | Across 14 departments | People, teal circle |
| Shifts This Week | `1,736` | Weekly view – 01-07 Sep | Calendar, teal circle |
| Total Hours | `13,888` | Planned working hours | Clock, green circle |
| Conflicts | `0` | No overlapping allocations | Warning, orange circle |

Phase 0: hardcode from `sample-data.ts`. Phase 5: replace with action → service counts.

### 2.3 Search & Filters

Dedicated card — **not** a `CommonDataTable` toolbar and **not** `FilterWrapper` URL search (roster load is explicit).

Row 1: Department, Unit, Roster, **DateRangePicker** (shared from/to), Staff Search  
Row 2: action buttons

| Control | Phase 0 |
|---------|---------|
| Dropdowns / date range / search | Local state; options from `sample-data.ts` |
| **Load Roster** | Primary green — filters the sample grid |
| Clear | Reset filters + sample view |
| Hide / Visible | Local: Hide collapses Department / Unit / Designation; Visible restores |
| Copy Previous Week / Month | Toast |
| Print Blank / Filled Roster | Toast |

### 2.4 Roster grid (module-specific table)

**Do not use `CommonDataTable`.** This is a staff × day calendar (chips, sticky columns, weekly/monthly, drag-and-drop). Build a dedicated table that **reuses the same visual structure**:

- Outer `Card`: `rounded-lg border border-border shadow-sm overflow-hidden`
- `CardHeader` title / description / `headingRight` actions
- Inner `Table` / `TableHeader` / `TableRow` / `TableHead` / `TableCell` from `@/components/ui/table`
- Rounded inner border (`overflow-hidden rounded-lg border border-border`)
- Pagination bar: “Showing x–y of n”, rows per page, Prev / page numbers / Next (same control language as `CommonDataTablePagination`, implemented locally)
- Status pills and circular icon actions consistent with other HRM tables
- **Column separators:** `border-r border-border` on cells (Channeling report table style)
- **On-column sorting:** click header to toggle asc/desc (staff fields, day shift code, hours, status)
- **Column filters:** compact text inputs under filterable headers; “Clear column filters” when any are active

#### Grid chrome

- Title: `Week of 01 Sep 2025 - 07 Sep 2025` (from sample range)
- View toggle: **Weekly View** (active, primary) / **Monthly View** (outline). Phase 0: monthly toast or a second sample layout — weekly is the accepted default
- Actions: **+ Allocate Shift** (primary → Add sheet), Print, Export Excel, Export PDF — export still toast in Phase 0
- Legend: D Day 07:00-15:00 (green), E Evening 15:00-23:00 (orange), N Night 23:00-07:00 (purple), O Off (gray), L Leave (dashed / white)

#### Columns

| Group | Columns |
|-------|---------|
| Staff (sticky left) | Staff ID, Staff Name, Department, Unit, Designation — sort icons in header |
| Days | Sun 01 Sep … Sat 07 Sep (weekly). Monthly: days of the selected month |
| Metrics | Total Hours, OT Hours |
| Status | Draft / Pending Approval / Published / Amended pills |
| Actions | Edit, Delete, History |

#### Shift chip

Reusable `ShiftChip`: label (`Day` / `Evening` / `Night` / `Off` / `Leave`), time range, **Leave** checkbox. **Click chip** → Edit Roster Allocation sheet. Empty day cell → Add sheet prefilled with staff + date.

Hint under the table: *Drag a shift chip to another cell to reassign. Tick 'Leave' to mark the cell as leave-covered.*  
Phase 0: drag-and-drop remains toast/visual-only.

Status colors (align with leave + mock):

- **Published** — green (`bg-emerald-100 text-emerald-700`)
- **Draft** — gray (`bg-muted text-muted-foreground`)
- **Pending Approval** — orange (`bg-orange-100 text-orange-700`)
- **Amended** — sky (`bg-sky-100 text-sky-700`)

Footer (right): `0 conflicts` pill + `Published 22 Aug 2025` outline pill.  
Metadata: Created by / Last updated (Auth user display names + timestamps from sample).

### 2.5 Allocation sheets (Phase 0)

Right-side Sheets (same sticky-header pattern as Shift Types).

| Sheet | Opens from | Footer |
|-------|------------|--------|
| Allocate Shift | **+ Allocate Shift**; empty day cell (staff + date prefilled) | Cancel + Save Allocation |
| Edit Roster Allocation | Chip click; row pencil (first allocated day this week, else toast) | Cancel + Save Changes |
| Change History | Row clock | **Cancel only** |

Form fields: Staff Member*, Shift Type*, Department / Unit / Designation (**read-only** from staff), Roster Date*, Total Hours (**auto** from shift type), OT Hours (editable, default 0), Status* (Draft / Pending Approval / Published / Amended), Comments. Audit footer Created / Last updated.

Phase 0: Save toast only (no Prisma). Delete stays list-only (row trash confirm).

### 2.6 Sample rows (Phase 0)

Use ~6 staff rows so pagination (“Showing 1–6 of 248”) is visible. Mix Day / Evening / Night / Off / Leave / empty cells. Mix Draft / Pending Approval / Published (Amended available in the form).

---

## 2B. UI map — Shift Types (Phase 0)

Match the Shift Types mock. Compose: `CommonManagerHeader` + summary cards + Search & Filters card + **`CommonDataTable`** register (not the roster custom grid). Add / Edit / Duplicate / History open as **right Sheets** (`@archmage/ui` Sheet).

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Shift Types                                                               │
│ Shift master used by Shift Assignment, Duty Roster and Shift Roster…      │
│                                              [ + Add Shift ] → form sheet │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Total Shift Types ─┐ ┌─ Active ─┐ ┌─ Night / Overnight ─┐ ┌─ Holiday ─┐
│         24          │ │    21    │ │          6          │ │    15     │
└─────────────────────┘ └──────────┘ └─────────────────────┘ └───────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ Shift Code │ Shift Name │ Category │ Night Shift │ Overnight │ Status     │
│ [ Search ] [ Clear ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Shift Type Register (CommonDataTable) ───────────────────────────────────┐
│ [ Duplicate ] [ Bulk Activate ] [ Bulk Delete ]   [ Columns ] [ Print/PDF/XLS ] │
│ Code │ Name │ … │ Status │ Updated │ Created │ Actions (Edit/Del/History) │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Sheet (right) ───────────────────────────────────────────────────────────┐
│ Add / Edit / Duplicate Shift Type  OR  Change History (Cancel only)       │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/shift-types/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data into workspace |
| `shift-types-workspace.tsx` | Provider, header, filters, register, sheets |
| `shift-types-ui-context.tsx` | Open Add / Edit / Duplicate / History |
| `header-actions.tsx` | **+ Add Shift** → form sheet |
| `section-shift-type-summary.tsx` | Four count cards |
| `section-shift-type-filters.tsx` | Search & Filters (local Phase 0) |
| `section-shift-type-register.tsx` | `CommonDataTable` + toolbar |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-shift-type-form.tsx` | Formik + Yup sheet (toast save Phase 0) |
| `sheet-shift-type-history.tsx` | Sample audit list; **Cancel only** |
| `sample-data.ts` | Mock shift types, summary, history helper |

### 2B.1 Header (list)

- `title`: `Shift Types`
- `description`: `Shift master used by Shift Assignment, Duty Roster and Shift Roster. Defines timings, thresholds and allowance eligibility.`
- `actions`: **+ Add Shift** (primary) when `has('shift-roster', 'add')` → **Add Shift Type** sheet

Delete stays list-only (row + bulk). No Delete on the form sheet.

### 2B.2 Summary cards

| Card | Sample | Sub-text |
|------|--------|----------|
| Total Shift Types | `24` | 7 categories |
| Active | `21` | Available for assignment |
| Night / Overnight | `6` | Allowance eligible |
| Holiday Eligible | `15` | Gazetted holiday duty |

### 2B.3 Filters

Shift Code, Shift Name (search inputs), Category / Night Shift / Overnight / Status (Combobox). Category options: General, Nursing, Emergency, Rotational, Night, Overnight, Holiday. **Search** applies local sample filter; **Clear** resets.

### 2B.4 Register table

Use **`CommonDataTable`**. Columns: Shift Code, Shift Name, Category, Start, End, Duration, Night Shift, Overnight, Holiday Eligible, Status, **Updated**, **Created**, Actions (Edit / Delete / History).

Updated / Created: same stacked format as Leave Types (`name` + `formatDateTime`).

Toolbar: **Duplicate Shift** (exactly one selected row → Duplicate sheet; else toast *Select one shift type*) + Bulk Activate (toast) + **Bulk Delete**; Columns + Print / PDF / Excel.

Yes/No + Active/Inactive as pills (same language as leave boolean badges).

### 2B.5 Codes & auto hours (locked)

- Human codes: **`SHF-1`, `SHF-2`, …** via `generateRecordCode('SHF')` in Phase 2+
- Add / Duplicate: code field **disabled**, shows `Auto (SHF-n)` until persist
- Edit: show existing code (disabled)
- Do **not** reserve fixed `D`/`E`/`N`/`O`/`L` as system primary keys
- **Total Working Hours**: auto from start / end / break (overnight when Overnight is on or end ≤ start)

### 2B.6 Sheets

| Sheet | Opens from | Footer |
|-------|------------|--------|
| Add Shift Type | Header **+ Add Shift** | Cancel + Save Shift Type |
| Edit Shift Type | Row pencil | Cancel + Update Shift Type |
| Duplicate Shift Type | Toolbar **Duplicate Shift** (1 row selected) | Cancel + Duplicate Shift Type |
| Change History | Row clock | **Cancel only** |

Form fields: Code (auto), Name, Category (General, Nursing, Emergency, Rotational, Night, Overnight, Holiday), Start / End, Break (minutes), Total Working Hours (auto), Grace / Late / Early-exit (minutes), **Shift Rules** card (title + short description + switch per row: Overnight, Night Shift, Public Holiday Eligible, Active Status). Category does not toggle those rules. Footer audit Created / Last updated. Sheet header (title + close) stays fixed; only the form body scrolls.

Phase 0: Save / Update / Duplicate toast only (no Prisma).

---

## 2C. UI map — Shift Assignment (Phase 0)

Compose: `CommonManagerHeader` + 4 summary cards + Search & Filters + **`CommonDataTable`** register. Assign / Bulk Assign / Edit / History open as **right Sheets**.

```
┌─ CommonManagerHeader ─────────────────────────────────────────────────────┐
│ Shift Assignment                                                          │
│ Link staff to shift types from the Shift Types master…                    │
│                         [ + Assign Shift ]  [ Bulk Assign ]               │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Assigned Staff ─┐ ┌─ Unassigned ─┐ ┌─ Rotation Patterns ─┐ ┌─ Expiring ─┐
│       238        │ │      10      │ │          6          │ │     17     │
└──────────────────┘ └──────────────┘ └─────────────────────┘ └────────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ Institution │ Department │ Unit │ Designation                             │
│ Staff Category │ Staff Grade │ Employee Status │ Staff Search             │
│ [ Search ] [ Clear ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Shift Assignment Register (CommonDataTable) ─────────────────────────────┐
│ [ Auto Assign All ]  N of M selected     [ Columns ] [ Print/PDF/XLS ]    │
│ ID │ Name │ Dept │ Unit │ … │ Assigned Shift │ From │ To │ Status │ …     │
│ Updated │ Created │ Actions (Edit / Delete / History)                     │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/shift-assignment/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data |
| `shift-assignment-workspace.tsx` | Provider, header, filters, register, sheets |
| `shift-assignment-ui-context.tsx` | Open Assign / Edit / Bulk / History; selection count |
| `header-actions.tsx` | **Assign Shift** + **Bulk Assign** (≥1 selected) |
| `section-assignment-summary.tsx` | Four count cards |
| `section-assignment-filters.tsx` | Search & Filters (local Phase 0) |
| `section-assignment-register.tsx` | `CommonDataTable` + Auto Assign All + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-assignment-form.tsx` | Assign / Edit / Bulk form sheet |
| `sheet-assignment-history.tsx` | Timeline history; **Cancel only** |
| `sample-data.ts` | Mock assignments + options + summary |

### 2C.1 Header

- No **Save** or **Remove Assignment** on the header (row delete stays on the register).
- **Bulk Assign** requires ≥1 selected row; else toast *Select staff*.

### 2C.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Assign Shift | Header | Staff required |
| Bulk Assign Shift | Header | No staff field; banner with selected count |
| Edit Shift Assignment | Row pencil | Prefill sample |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Fields: Staff* (assign/edit), Shift Type*, Rotation Pattern (Fixed / 2-Shift / 3-Shift / 4 On 2 Off / Weekly / Custom), Effective From*, Effective To (optional), Weekly Off (Mon–Sun), Status (Active / Pending / Inactive), Auto Assign toggle. Sticky header. Phase 0 toast save.

### 2C.3 Register

Columns include **Updated** and **Created** (Leave Types stacked format). Status pills: Active / Pending / Inactive.

---

## 2D. UI map — Duty Roster (Phase 0)

Daily department/unit duty list. Same permission as the rest of Roster & Shifts (`shift-roster`). Register page — **do not** auto-collapse the sidebar.

```
┌─ Header ──────────────────────────────────────────────────────────────────┐
│ Duty Roster                    [ Assign Staff ] [ Swap Shift ] [ Replace ]│
└───────────────────────────────────────────────────────────────────────────┘

┌─ On Duty Today ─┐ ┌─ Present ─┐ ┌─ Late Arrivals ─┐ ┌─ Unfilled Duties ─┐
│        42       │ │     38    │ │        3        │ │         4         │
└─────────────────┘ └───────────┘ └─────────────────┘ └───────────────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ Department │ Unit │ Date (default today) │ Shift │ Roster                 │
│ [ Load Roster ] [ Clear ]                                                 │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Duty Roster (CommonDataTable) ───────────────────────────────────────────┐
│ Daily | Weekly* | Monthly*     N of M selected   [ Columns ] [ Print/… ]  │
│ Staff ID │ Name │ Shift │ Start │ End │ Location │ Ward/Unit │ Supervisor │
│ Status │ Attendance │ Updated │ Created │ Actions (Swap / Edit / Del / Hist)│
└───────────────────────────────────────────────────────────────────────────┘
* Weekly / Monthly: toast only in Phase 0
```

Key files under `app/(dashboard)/(roster-shifts)/duty-roster/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data |
| `duty-roster-workspace.tsx` | Provider, header, filters, register, sheets, swap confirm |
| `duty-roster-ui-context.tsx` | Open Assign / Edit / Swap / Replace / History; swap confirm |
| `header-actions.tsx` | **Assign Staff**, **Swap Shift**, **Replace Staff** (no Print/Excel/PDF) |
| `section-duty-summary.tsx` | Four count cards |
| `section-duty-filters.tsx` | Dept / Unit / Date / Shift / Roster; date defaults to today |
| `section-duty-register.tsx` | `CommonDataTable` + Daily/Weekly/Monthly + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Swap / Edit / Delete / History |
| `sheet-duty-form.tsx` | Assign / Edit / Swap / Replace form |
| `sheet-duty-history.tsx` | Timeline history; **Cancel only** |
| `sample-data.ts` | Mock duties + options + summary |

### 2D.1 Header and views

- Print / PDF / Excel live on the **table toolbar only** (not the page header).
- **Daily** is the working view. **Weekly** / **Monthly** toast that those views are not available yet.
- Header Swap / Replace open **full forms** (no selected-row requirement).

### 2D.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Assign Staff | Header | Staff*, Shift Type*, date*, location, ward/unit, supervisor, status |
| Swap Shift | Header or row Swap | Two staff + date/shift; Save → confirm dialog → toast |
| Replace Staff | Header | Current staff + replacement staff |
| Edit Duty | Row pencil | Prefill sample |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Field behaviour (locked):

- **Start / End** auto from Shift Type (disabled).
- **Duty Location / Ward-Unit** prefilled from staff, still editable.
- **Supervisor** editable.
- Status: **Draft / Pending Approval / Published / Amended**. New assign defaults to Draft.

Swap confirm: `CustomAlertDialog` — “Swap this duty shift?” / both members notified. Continue then toast. Swap is between two registered staff.

Sticky sheet header. Phase 0 toast save (except swap, which confirms first).

### 2D.3 Register

Columns include **Updated** and **Created** (Leave Types stacked format). Default filter date = **today**.

---

## 2E. UI map — Roster Amendments (Phase 0)

Controlled change workflow for published duty rosters. Same permission as the rest of Roster & Shifts (`shift-roster`). Register page — **do not** auto-collapse the sidebar.

```
┌─ Header ──────────────────────────────────────────────────────────────────┐
│ Roster Amendments              [ New Amendment ] [ Approve ] [ Reject ]   │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Total Amendments ─┐ ┌─ Pending Approval ─┐ ┌─ Approved ─┐ ┌─ Rejected ─┐
│        142         │ │         9          │ │    121     │ │     12     │
└────────────────────┘ └────────────────────┘ └────────────┘ └────────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ Amendment No │ Staff │ Department │ Type │ From │ To │ Status │ Requested │
│ [ Search ] [ Clear ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Amendment Register (CommonDataTable) ────────────────────────────────────┐
│ N of M selected                          [ Columns ] [ Print/PDF/Excel ]  │
│ No │ Staff ID │ Name │ Date │ Original │ Amended │ Type │ Reason │ …      │
│ Status │ Updated │ Created │ Actions (Edit / Delete / History)            │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/roster-amendments/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data |
| `roster-amendments-workspace.tsx` | Provider, header, filters, register, sheets, confirm |
| `roster-amendments-ui-context.tsx` | Open New / Edit / History; selection; approve/reject |
| `header-actions.tsx` | **New Amendment**, **Approve**, **Reject** (no Print/Excel/PDF) |
| `section-amendment-summary.tsx` | Four count cards |
| `section-amendment-filters.tsx` | No / staff / dept / type / from / to / status / requested by |
| `section-amendment-register.tsx` | `CommonDataTable` + selection + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History (locked rows hide edit/delete) |
| `sheet-amendment-form.tsx` | New / Edit form |
| `sheet-amendment-history.tsx` | Timeline history; **Cancel only** |
| `sample-data.ts` | Mock amendments + options + summary |

### 2E.1 Header

- Print / PDF / Excel live on the **table toolbar only** (not the page header).
- **Approve** / **Reject** require ≥1 selected row; else toast. Already Approved / Rejected rows toast as locked.
- Confirms use `CustomAlertDialog` (Cancel + Continue). Remarks enforcement later.

### 2E.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| New Amendment | Header | No selected-row requirement |
| Edit Amendment | Row pencil | Prefill sample; hidden on Approved / Rejected |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Field behaviour (locked):

- **Amendment No** auto sample `AMD-2026-n` (disabled). Later `generateRecordCode` with year + padding.
- **Original Shift** auto from staff (disabled).
- **Amended Shift** required except Duty Cancellation (disabled, show —).
- **Requested By** select.
- Status: **Draft / Pending Approval / Approved / Rejected**. New defaults to Pending Approval.
- One form for all types in Phase 0 (no swap-with / location extras yet).

Sticky sheet header. Phase 0 toast save.

### 2E.3 Register

Columns include **Updated** and **Created**. Default From / To empty.

---

## 2F. UI map — Night Shifts (Phase 0)

Night duty register derived from the Duty Roster. Same permission (`shift-roster`). Register page — **do not** auto-collapse the sidebar. Overnight Shifts and Public Holiday Shifts are sibling routes, not tabs here.

```
┌─ Header ──────────────────────────────────────────────────────────────────┐
│ Night Shifts                                              [ Add Night Shift ]│
└───────────────────────────────────────────────────────────────────────────┘

┌─ Night Shifts This Cycle ─┐ ┌─ Staff on Night Duty ─┐ ┌─ Allowance ─┐ ┌─ Alerts ─┐
│           612             │ │          94           │ │  LKR 1.48 M │ │    6     │
└───────────────────────────┘ └───────────────────────┘ └─────────────┘ └──────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ From │ To │ Department │ Unit │ Shift Type │ Staff │ Status │ Salary Cycle│
│ [ Search ] [ Clear ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Night Shift Register (CommonDataTable) ──────────────────────────────────┐
│ Banner: consecutive nights > 3             [ Columns ] [ Print/PDF/Excel ]│
│ Staff │ Dept │ Unit │ Date │ Night Shift │ Hours │ OT │ Allowances │ …    │
│ Consecutive │ Payroll Ready │ Status │ Updated │ Created │ Actions        │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/night-shifts/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data |
| `night-shifts-workspace.tsx` | Provider, header, filters, register, sheets |
| `night-shifts-ui-context.tsx` | Open Add / Edit / History |
| `header-actions.tsx` | **Add Night Shift** (no Print/Excel/PDF) |
| `section-night-summary.tsx` | Four count cards |
| `section-night-filters.tsx` | From / To default empty |
| `section-night-register.tsx` | `CommonDataTable` + policy banner + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-night-shift-form.tsx` | Add / Edit form |
| `sheet-night-shift-history.tsx` | Timeline history; **Cancel only** |
| `sample-data.ts` | Mock night duties + options + summary |

### 2F.1 Header and policy

- Print / PDF / Excel on the **table toolbar only**.
- Consecutive nights **> 3** show a red `n nights` badge. Orange banner under the register toolbar.

### 2F.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Add Night Shift | Header | No selected-row requirement |
| Edit Night Shift | Row pencil | Prefill sample; Edit/Delete stay on all statuses |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Field behaviour (locked):

- **Start / End** auto from Night Shift Type (disabled). Hours / OT / allowances / consecutive nights **editable**.
- **Send to Payroll** toggle maps to the Payroll Ready Yes/No badge.
- Status: **Draft / Pending Approval / Approved / Rejected**. New defaults to Pending Approval.

Sticky sheet header. Phase 0 toast save.

### 2F.3 Register

Columns include **Updated** and **Created**. Default From / To empty.

---

## 2G. UI map — Overnight Shifts (Phase 0)

Cross-midnight shifts with day-split hours. Same permission (`shift-roster`). Register page — **do not** auto-collapse the sidebar.

```
┌─ Header ──────────────────────────────────────────────────────────────────┐
│ Overnight Shifts              [ Add Overnight Shift ] [ Recalculate Splits ]│
└───────────────────────────────────────────────────────────────────────────┘

┌─ Overnight Shifts ─┐ ┌─ Cross-Midnight Hrs ─┐ ┌─ Overnight OT ─┐ ┌─ Conflicts ─┐
│        248         │ │        2,412         │ │      386       │ │      3      │
└────────────────────┘ └──────────────────────┘ └────────────────┘ └─────────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ From │ To │ Department │ Unit │ Shift Type │ Allocation │ Staff │ Status  │
│ [ Search ] [ Clear ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Overnight Shift Register (CommonDataTable) ──────────────────────────────┐
│ Green banner: hours split at midnight      [ Columns ] [ Print/PDF/Excel ]│
│ Staff │ Dept │ Unit │ Start │ End │ Day1 │ Day2 │ Total │ Attendance │ …  │
│ OT │ Allowance │ Payroll Ready │ Status │ Updated │ Created │ Actions     │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/overnight-shifts/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data |
| `overnight-shifts-workspace.tsx` | Provider, header, filters, register, sheets |
| `overnight-shifts-ui-context.tsx` | Open Add / Edit / History |
| `header-actions.tsx` | **Add Overnight Shift**, **Recalculate Splits** (toast) |
| `section-overnight-summary.tsx` | Four count cards |
| `section-overnight-filters.tsx` | From / To default empty |
| `section-overnight-register.tsx` | `CommonDataTable` + split banner + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-overnight-form.tsx` | Add / Edit form + auto-split |
| `sheet-overnight-history.tsx` | Timeline history; **Cancel only** |
| `sample-data.ts` | Mock overnight duties + options + summary |

### 2G.1 Header

- Print / PDF / Excel on the **table toolbar only**.
- **Recalculate Splits** Phase 0 toast (no selected-row requirement).
- Green banner: hours split at midnight; attendance posted to allocation date.

### 2G.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Add Overnight Shift | Header | No selected-row requirement |
| Edit Overnight Shift | Row pencil | Prefill sample; Edit/Delete on all statuses |
| Change History | Row clock | Timeline like Night Shifts; Cancel only |

Field behaviour (locked):

- Start/End date and time **required and editable**. Shift type prefills times and allowance.
- **Auto Split Hours at Midnight** on: Day 1 / Day 2 / Total auto and disabled. Off: those three editable. OT and Allowance stay editable.
- Attendance allocation: **Shift Start Date** / **Shift End Date** (default start).
- **Send to Payroll** maps to Payroll Ready.
- Status: Draft / Pending Approval / Approved / Rejected / **Amended**. New defaults to Pending Approval.

Sticky sheet header. Phase 0 toast save.

### 2G.3 Register

Columns include **Updated** and **Created**. Default From / To empty.

---

## 2H. UI map — Public Holiday Shifts (Phase 0)

Gazetted holiday duties with holiday pay, lieu leave, and payroll posting. Same permission (`shift-roster`). Register page — **do not** auto-collapse the sidebar. Holiday dates: Phase 0 sample list; v1 **`HolidayCalendar` stub** until HR Administration owns a Holiday Date master.

```
┌─ Header ──────────────────────────────────────────────────────────────────┐
│ Public Holiday Shifts    [ Add Holiday Shift ] [ Bulk Assign Holiday Duty ]│
└───────────────────────────────────────────────────────────────────────────┘

┌─ Holiday Duties ─┐ ┌─ Staff on Holiday Duty ─┐ ┌─ Holiday Pay ─┐ ┌─ Lieu Days ─┐
│       164        │ │          118            │ │  LKR 0.92 M   │ │      72     │
└──────────────────┘ └─────────────────────────┘ └───────────────┘ └─────────────┘

┌─ Search & Filters ────────────────────────────────────────────────────────┐
│ Holiday │ Type │ From │ To │ Department │ Unit │ Pay Rate │ Status        │
│ [ Search ] [ Clear ]                                                      │
└───────────────────────────────────────────────────────────────────────────┘

┌─ Public Holiday Shift Register (CommonDataTable) ─────────────────────────┐
│ Green banner: Holiday Date master          [ Columns ] [ Print/PDF/Excel ]│
│ Staff │ Dept │ Unit │ Holiday │ Type │ Date │ Shift │ Hours │ Pay Rate │  │
│ Allowance │ Location │ Lieu │ Status │ Updated │ Created │ Actions        │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/public-holiday-shifts/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + sample data |
| `public-holiday-shifts-workspace.tsx` | Provider, header, filters, register, sheets |
| `public-holiday-shifts-ui-context.tsx` | Open Add / Edit / Bulk / History |
| `header-actions.tsx` | **Add Holiday Shift**, **Bulk Assign Holiday Duty** |
| `section-holiday-summary.tsx` | Four count cards |
| `section-holiday-filters.tsx` | From / To default empty |
| `section-holiday-register.tsx` | `CommonDataTable` + master banner + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-holiday-form.tsx` | Add / Edit / Bulk form + auto-fill |
| `sheet-holiday-history.tsx` | Timeline history; **Cancel only** |
| `sample-data.ts` | Mock holiday duties + sample Holiday Date master |

### 2H.1 Header

- Print / PDF / Excel on the **table toolbar only**.
- **Bulk Assign Holiday Duty** requires **≥1** selected row (else toast), same as Shift Assignment.
- Green banner: holidays sourced from the Holiday Date master under HR Administration.
- **v1 dynamic:** that master is the Roster **`HolidayCalendar` stub**, not a separate HR Admin module.

### 2H.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Add Holiday Shift | Header | No selected-row requirement |
| Bulk Assign Holiday Duty | Header | Hides Staff; banner with selected count |
| Edit Holiday Shift | Row pencil | Prefill sample; Edit/Delete on all statuses |
| Change History | Row clock | Timeline like Overnight; Cancel only |

Field behaviour (locked):

- Public Holiday, Holiday Type, Staff (not Bulk), Shift, Duty Date, Pay Rate required.
- Holiday selection auto-fills **Holiday Type** and **Duty Date** (both remain editable).
- Shift auto-fills **Worked Hours** (editable). Staff auto-fills **Duty Location** (editable).
- Pay Rate: **1.50x / 2.00x / 2.50x**. Grant Lieu Leave maps to Lieu Leave Yes/No. Send to Payroll is **form only**.
- Status: Draft / Pending Approval / Approved / Rejected / **Amended**. New defaults to Pending Approval.

Sticky sheet header. Phase 0 toast save.

### 2H.3 Register

Columns include **Updated** and **Created**. Default From / To empty. No Payroll Ready column.

---

## 3. Suggested folders

```
app/(dashboard)/(roster-shifts)/shift-roster/
  page.tsx
  header-actions.tsx
  shift-roster-workspace.tsx
  shift-roster-ui-context.tsx
  section-roster-summary.tsx
  section-roster-filters.tsx
  section-roster-grid.tsx
  roster-column-header.tsx
  shift-chip.tsx
  shift-legend.tsx
  record-actions.tsx
  sheet-roster-allocation-form.tsx
  sheet-roster-allocation-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/shift-types/
  page.tsx
  shift-types-workspace.tsx
  shift-types-ui-context.tsx
  header-actions.tsx
  section-shift-type-summary.tsx
  section-shift-type-filters.tsx
  section-shift-type-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-shift-type-form.tsx
  sheet-shift-type-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/shift-assignment/
  page.tsx
  shift-assignment-workspace.tsx
  shift-assignment-ui-context.tsx
  header-actions.tsx
  section-assignment-summary.tsx
  section-assignment-filters.tsx
  section-assignment-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-assignment-form.tsx
  sheet-assignment-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/duty-roster/
  page.tsx
  duty-roster-workspace.tsx
  duty-roster-ui-context.tsx
  header-actions.tsx
  section-duty-summary.tsx
  section-duty-filters.tsx
  section-duty-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-duty-form.tsx
  sheet-duty-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/roster-amendments/
  page.tsx
  roster-amendments-workspace.tsx
  roster-amendments-ui-context.tsx
  header-actions.tsx
  section-amendment-summary.tsx
  section-amendment-filters.tsx
  section-amendment-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-amendment-form.tsx
  sheet-amendment-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/night-shifts/
  page.tsx
  night-shifts-workspace.tsx
  night-shifts-ui-context.tsx
  header-actions.tsx
  section-night-summary.tsx
  section-night-filters.tsx
  section-night-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-night-shift-form.tsx
  sheet-night-shift-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/overnight-shifts/
  page.tsx
  overnight-shifts-workspace.tsx
  overnight-shifts-ui-context.tsx
  header-actions.tsx
  section-overnight-summary.tsx
  section-overnight-filters.tsx
  section-overnight-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-overnight-form.tsx
  sheet-overnight-history.tsx
  sample-data.ts

app/(dashboard)/(roster-shifts)/public-holiday-shifts/
  page.tsx
  public-holiday-shifts-workspace.tsx
  public-holiday-shifts-ui-context.tsx
  header-actions.tsx
  section-holiday-summary.tsx
  section-holiday-filters.tsx
  section-holiday-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-holiday-form.tsx
  sheet-holiday-history.tsx
  sample-data.ts

# Dynamic layers (Phase 1+)
types/roster.ts
lib/mappers/
  shift-type-form.mapper.ts
  shift-assignment-form.mapper.ts
  shift-roster-form.mapper.ts
  duty-roster-form.mapper.ts
  roster-amendment-form.mapper.ts
  holiday-calendar.mapper.ts
services/roster-services/
  roster-shared.ts
  shift-type.service.ts
  shift-assignment.service.ts
  shift-roster.service.ts          # period header + allocations (week)
  duty-roster.service.ts           # same allocations, filtered by date
  roster-amendment.service.ts
  holiday-calendar.service.ts
  night-shift.service.ts           # query + extra fields; not a 2nd table
  overnight-shift.service.ts
  public-holiday-shift.service.ts
app/actions/roster-actions/
  shift-type.actions.ts
  shift-assignment.actions.ts
  shift-roster.actions.ts
  duty-roster.actions.ts
  roster-amendment.actions.ts
  holiday-calendar.actions.ts
  night-shift.actions.ts
  overnight-shift.actions.ts
  public-holiday-shift.actions.ts
```

Activity log examples: `shift-roster.visited`, `shift-types.visited`, `shift-types.created`, `shift-roster.published`, `roster-amendments.approved`. Entity types match the collection (`ShiftType`, `StaffShiftAssignment`, `ShiftRoster`, `RosterAllocation`, `RosterAmendment`, `HolidayCalendar`). Night / Overnight / Holiday actions still log against `RosterAllocation`.

---

## 4. Permissions (register in Phase 0)

Unmapped routes stay open. Register before shipping the page.

**One resource for the whole Roster & Shifts group.**

Checklist:

1. `types/user-group.ts` → `{ id: 'shift-roster', name: 'Roster & Shifts' }`
2. `lib/permissions.ts` → map `/shift-roster`, `/shift-types`, `/shift-assignment`, `/duty-roster`, `/roster-amendments`, `/night-shifts`, `/overnight-shifts`, `/public-holiday-shifts` → `shift-roster`
3. Sidebar `hasAccess` for `/shift-roster`, `/shift-types`, `/shift-assignment`, `/duty-roster`, `/roster-amendments`, `/night-shifts`, `/overnight-shifts`, `/public-holiday-shifts` under **Roster & Shifts**
4. Pages `checkRouteAccess` → `/unauthorized-access`
5. Mutations: `requirePermission('shift-roster', action)` — no extra resources for Night vs Roster
6. Client buttons: `usePermissions().has('shift-roster', …)`
   - **view** — load lists / grid
   - **edit** — allocate, save draft, Duty swap/replace, assignment update
   - **add** or **edit** — publish, amendment approve/reject
   - View-only cannot publish
7. `breadcrumbs.tsx` → `shift-roster`, `shift-types`, `shift-assignment`, `duty-roster`, `roster-amendments`, `night-shifts`, `overnight-shifts`, `public-holiday-shifts`
8. Grant on Auth User Group; user re-logins

---

## 5. Development phases

**UI first is done.** Do not start Prisma until this doc’s Phase 1 collection map is accepted (locked 17 Aug 2026). Then `schema.prisma` + `db push`.

**Group sequence (v1 persist):**

```
D0  Phase 0 UI (done; minor polish allowed)
D1  Shared collections + types  (no UI wiring)
D2  Shift Types CRUD
D3  Shift Assignment CRUD
D4  Shift Roster read (Load Roster)
D5  Shift Roster draft write (sheet allocate; drag persist later)
D6  Publish / copy / fill
D7  Duty Roster → same RosterAllocation store
D8  Roster Amendments (apply on Approve)
D9  Night Shifts register (derived)
D10 Overnight Shifts register (derived + stored splits)
D11 Public Holiday Shifts + HolidayCalendar stub
    → later: live cards / export / hardening / OT Process Staff Shift
```

Inside each slice:

```
Types/Zod → Service → Actions (permissions + activity log) → wire UI → smoke test
```

Pages must not call Prisma. No business rules in components. Finish a slice’s “Done when” before starting the next. Do not persist Night, Duty, or Holiday as a second copy of the week.

---

### Shift Roster — Phase 0 — UI interfaces

**Goal:** Pixel-close shell of the mock. No Mongo collection required.

| Work |
|------|
| Route group `(roster-shifts)/shift-roster` |
| `page.tsx` — `checkRouteAccess`, `CommonManagerHeader`, compose sections |
| Sample summary + filters + grid from `sample-data.ts` |
| **Module-specific table** (not `CommonDataTable`) with `ShiftChip` + legend |
| Allocate / Edit / History **sheets** (toast save; History Cancel-only) |
| Header / filter / export actions toast only |
| Permission resource + route map + sidebar + breadcrumb |
| Desktop sidebar auto-collapsed on `/shift-roster` (Channeling pattern + toggle) |
| `logActivityNonBlocking` on visit (`shift-roster.visited`) |

| Done when |
|-----------|
| [x] `/shift-roster` matches the mock (header, 4 cards, filters, weekly grid) |
| [x] Table is **not** `CommonDataTable`; visual structure matches other HRM cards/tables |
| [x] Non-admin without grant is redirected |
| [x] Fill / Save / Publish / Copy / Print / Export / Allocate do not write to the DB |
| [x] Allocate / Edit / History open as sheets |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

**Out of scope for Phase 0:** Prisma models, Zod, real drag-and-drop persist, print/export files.

---

## 5B. Development phases — Shift Types

```
Phase 0: Static UI (done)
  → D1 schema includes ShiftType
    → D2: CRUD
      → Duplicate persist / bulk activate with CRUD
        → Live summary + export after register is live
          → Block delete if allocations exist
            → Roster chips / OT consume live ShiftType (after D4+)
```

### Shift Types — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/shift-types` — sheets only (no add/edit routes) |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Form / History sheets: Formik + Yup; Save/Update/Duplicate toast; History Cancel-only |
| Map `/shift-types` → `shift-roster`; sidebar + breadcrumb |
| `shift-types.visited` activity on list |

| Done when |
|-----------|
| [x] `/shift-types` matches the mock (sheets + register) |
| [x] Register uses **CommonDataTable** (not roster custom grid) |
| [x] Add/Edit/Duplicate/History are sheets; no Prisma writes |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

### Shift Types — D2 — CRUD (after D1)

| Layer | Work |
|-------|------|
| Service | list (paged + filters), get, create, update, delete; allocate `SHF-n` |
| Actions | `requirePermission('shift-roster', …)` |
| UI | Wire list Search + form Save/Update/Delete |

| Done when |
|-----------|
| [ ] Create appears in register as Active/Inactive |
| [ ] Edit loads form; delete removes row (or soft-status if locked) |

### Shift Types — D2 follow-ons (summary)

| Phase | Outcome |
|-------|---------|
| **3** | Duplicate Shift; Bulk Activate |
| **4** | Live summary cards; export against real rows |
| **5** | Permissions matrix; smoke; refuse delete when allocations reference the type |
| **later** | Roster / OT consume live `ShiftType` |

Auto Assign that **writes calendar cells** waits until D5 (allocations exist). Duplicate / Bulk Activate stay in D2 if they only touch `ShiftType`.

---

## 5C. Development phases — Shift Assignment

```
Phase 0: Static UI (done)
  → D1 schema includes StaffShiftAssignment
    → D3: CRUD
      → Bulk assign persist
        → Auto Assign that creates allocations waits for D5
          → Live summary + export
```

### Shift Assignment — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/shift-assignment` — sheets only |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Assign / Bulk / Edit / History sheets; toast save; History Cancel-only |
| Map `/shift-assignment` → `shift-roster`; sidebar + breadcrumb |
| `shift-assignment.visited` activity on list |

| Done when |
|-----------|
| [x] `/shift-assignment` matches the mock (sheets + register) |
| [x] No header Save / Remove Assignment |
| [x] Bulk Assign requires ≥1 selected row |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

---

## 5D. Development phases — Duty Roster

```
Phase 0: Static UI (done)
  → D1 schema (Duty is a view, not a collection)
    → D7: point UI at RosterAllocation by date
      → Swap / replace persist (draft only; published → amendment)
        → Attendance enum + live summary + export
```

Weekly / Monthly views stay toast until later.

### Duty Roster — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/duty-roster` — sheets + swap confirm |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Daily view only; Weekly/Monthly toast; table-only Print/PDF/Excel |
| Assign / Swap / Replace / Edit / History sheets; History Cancel-only |
| Map `/duty-roster` → `shift-roster`; sidebar + breadcrumb (sidebar stays expanded) |
| `duty-roster.visited` activity on list |

| Done when |
|-----------|
| [x] `/duty-roster` matches the mock (sheets + register + swap confirm) |
| [x] Weekly / Monthly toast; Print/PDF/Excel on table only |
| [x] Swap Save opens confirm dialog |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

---

## 5E. Development phases — Roster Amendments

```
Phase 0: Static UI (done)
  → D1 schema includes RosterAmendment
    → D8: CRUD of amendment requests
      → Approve applies to RosterAllocation (mark Amended); Reject does not
        → Live summary + export
```

### Roster Amendments — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/roster-amendments` — sheets + approve/reject confirm |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Table-only Print/PDF/Excel; Approve/Reject need ≥1 selected pending/draft row |
| New / Edit / History sheets; History Cancel-only; locked rows hide edit/delete |
| Map `/roster-amendments` → `shift-roster`; sidebar + breadcrumb (sidebar stays expanded) |
| `roster-amendments.visited` activity on list |

| Done when |
|-----------|
| [x] `/roster-amendments` matches the mock (sheets + register + confirms) |
| [x] Approve / Reject require selection; Print/PDF/Excel on table only |
| [x] Approved / Rejected rows hide Edit and Delete |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

---

## 5F. Development phases — Night Shifts

```
Phase 0: Static UI (done)
  → D1 extra fields on RosterAllocation (not a NightShift collection)
    → D9: list allocations where ShiftType.isNightShift
      → Add only if staff + date has no cell; consecutive-night count in service
        → Live summary + export
```

### Night Shifts — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/night-shifts` — sheets only |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Table-only Print/PDF/Excel; consecutive nights > 3 red badge + banner |
| Add / Edit / History sheets; History Cancel-only; Edit/Delete on all statuses |
| Map `/night-shifts` → `shift-roster`; sidebar + breadcrumb (sidebar stays expanded) |
| `night-shifts.visited` activity on list |

| Done when |
|-----------|
| [x] `/night-shifts` matches the mock (sheets + register + policy badge) |
| [x] Print/PDF/Excel on table only; Start/End auto from shift type |
| [x] Status includes Draft / Pending Approval / Approved / Rejected |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

---

## 5G. Development phases — Overnight Shifts

```
Phase 0: Static UI (done)
  → D1 overnight split fields on RosterAllocation
    → D10: list allocations where ShiftType.isOvernight
      → Persist stored Day 1 / Day 2 / Total + allocation date
        → Recalculate Splits writes those fields; live summary + export
```

### Overnight Shifts — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/overnight-shifts` — sheets only |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Table-only Print/PDF/Excel; Recalculate Splits toast; midnight-split banner |
| Add / Edit / History sheets; Auto Split local calc; History Cancel-only |
| Map `/overnight-shifts` → `shift-roster`; sidebar + breadcrumb (sidebar stays expanded) |
| `overnight-shifts.visited` activity on list |

| Done when |
|-----------|
| [x] `/overnight-shifts` matches the mock (sheets + register + split banner) |
| [x] Auto Split fills Day 1 / Day 2 / Total from start/end; Recalculate toast |
| [x] Status includes Draft / Pending Approval / Approved / Rejected / Amended |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

---

## 5H. Development phases — Public Holiday Shifts

```
Phase 0: Static UI (done)
  → D1 HolidayCalendar stub + holiday fields on RosterAllocation
    → D11: list allocations on holiday dates
      → Add / Bulk create allocations only when staff + date is empty
        → Lieu / payroll flags only; live summary + export
```

### Public Holiday Shifts — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/public-holiday-shifts` — sheets only |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Table-only Print/PDF/Excel; Bulk Assign needs ≥1 selected; Holiday Date banner |
| Add / Edit / Bulk / History sheets; auto-fill holiday/shift/staff; History Cancel-only |
| Map `/public-holiday-shifts` → `shift-roster`; sidebar + breadcrumb (sidebar stays expanded) |
| `public-holiday-shifts.visited` activity on list |

| Done when |
|-----------|
| [x] `/public-holiday-shifts` matches the mock (sheets + register + master banner) |
| [x] Holiday fills Type + Date; Shift fills Hours; Staff fills Location; Bulk hides Staff |
| [x] Status includes Draft / Pending Approval / Approved / Rejected / Amended |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |

---

### D1 — Foundation (shared — locked 17 Aug 2026)

**Goal:** Six collections + shared types. Do **not** add `NightShift`, `DutyRoster`, or `PublicHolidayShift` tables. Staff employment `roster` string stays a snapshot label until a Roster master exists.

**Do not invent extra collections.** Schema is in `prisma/schema.prisma`; types in `types/roster.ts`.

```
Staff 1──* StaffShiftAssignment
Staff 1──* RosterAllocation
Staff 1──* RosterAmendment
ShiftType 1──* StaffShiftAssignment
ShiftType 1──* RosterAllocation
ShiftRoster 1──* RosterAllocation
HolidayCalendar 1──* RosterAllocation   (optional holidayId on the cell)
```

| Topic | Locked decision |
|-------|-----------------|
| Collections | **Six** — `ShiftType`, `StaffShiftAssignment`, `ShiftRoster` (period header), `RosterAllocation` (the store), `RosterAmendment`, `HolidayCalendar` (v1 stub) |
| Shift type codes | **`SHF-n`** via `generateRecordCode('SHF')` — not fixed `D`/`E`/`N` PKs |
| Shift types seed | Optional starter Day/Evening/Night/Off/Leave rows still use `SHF-n` |
| Assignment codes | `generateRecordCode`: `SA-1` |
| Roster period codes | `generateRecordCode`: `SR-1` |
| Amendment codes | `generateRecordCode`: `RA-1` |
| Holiday calendar codes | `generateRecordCode`: `HOL-1` |
| Roster period | One `ShiftRoster` per department + unit + roster name + from/to |
| Status (period) | `draft` → `published` only (no multi-step approval in v1) |
| Status (cell) | Follows the period; `amended` after an approved amendment |
| Status (assignment) | `active` / `pending` / `inactive` |
| Status (amendment) | `draft` / `pending_approval` / `approved` / `rejected` |
| Status (shift type) | Active / Inactive (or `status` 0\|1 like leave types) |
| Allocation uniqueness | **`@@unique([staffId, date])` hospital-wide** — one shift per staff per calendar date |
| Fill / copy | Must **not** insert a second cell for an existing staff+date; upsert empty cells or shift dates by 7 days (copy previous week) |
| Leave on a cell | Boolean `isLeave`; does **not** create a Leave Application in v1 |
| Duty extras on the cell | `dutyLocation`, supervisor id/name snapshots, `attendance` (`present` \| `late` \| `absent` \| null), comments |
| Overnight on the cell | Start/end date-time; stored `day1Hours` / `day2Hours` / `totalHours`; attendance allocation date (`shift_start` \| `shift_end`) |
| Holiday on the cell | Optional `holidayId`; `payRate` (`1.50` \| `2.00` \| `2.50`); `holidayAllowance`; `grantLieuLeave`; `sendToPayroll` |
| Night extras on the cell | Night hours / OT / allowances as stored floats when the shift type is night; consecutive nights **computed** in the service (not a stored counter as source of truth) |
| Hours / OT | Stored floats on the allocation; derive from shift type duration when creating the cell |
| Snapshots | Department / unit / roster **strings** on `ShiftRoster` and on each allocation (same pattern as Overtime) |
| Staff roster field | Keep employment `roster` string; no Roster master FK in v1 |
| Publish lock | After `published`, allocate / swap / edit **rejected** in service except via approved `RosterAmendment` |
| Permissions | One resource `shift-roster`. View-only cannot publish |
| Derived screens | Night / Overnight / Holiday query `RosterAllocation`; **Add** creates an allocation only if staff+date is empty |
| Phase 0 status badges | Duty/Night/Holiday labels stay in the UI. Wiring: Draft = period `draft`, Published = period `published`, Amended = cell after D8. Independent `pending_approval` on derived screens is **not** a second workflow |

| Done when |
|-----------|
| [x] Domain table above is **locked** (edit this doc if product disagrees) |
| [x] Models in `schema.prisma` + Staff relations both sides |
| [x] `types/roster.ts` — statuses, payloads, list params, DTOs |
| [x] `prisma db push` applied locally (`rh-hrm`) |

---

### D2 — Shift Types CRUD

**Goal:** First live register. Leave Types pattern.

| Layer | Work |
|-------|------|
| Service | list (paged + filters), get, create, update, delete; allocate `SHF-n` |
| Actions | `requirePermission('shift-roster', …)` |
| UI | Wire `/shift-types` Search + form Save/Update/Delete/Duplicate |

| Done when |
|-----------|
| [ ] Create appears in register as Active/Inactive |
| [ ] Edit loads form; delete refuses when allocations or assignments reference the type |

---

### D3 — Shift Assignment CRUD

**Goal:** Standing rules. Does **not** write calendar cells yet.

| Layer | Work |
|-------|------|
| Service | list, get, create, update, delete, bulk assign (same payload × N staff); `SA-n` |
| Actions | strip client audit / status |
| UI | Wire `/shift-assignment`; Bulk still requires ≥1 selected |

| Done when |
|-----------|
| [ ] Assign / Edit persist; Bulk writes one row per selected staff |
| [ ] Overlapping effective dates for the same staff rejected in the service |

Auto Assign that **creates week cells** waits for D5.

---

### D4 — Load roster (read)

**Goal:** Filters + **Load Roster** replace sample rows. No writes yet.

| Layer | Work |
|-------|------|
| Service | List staff in scope; load `ShiftRoster` + `RosterAllocation` for from/to |
| Actions | `requirePermission('shift-roster', 'view')` |
| UI | Load Roster / Clear; empty state; chips from live `ShiftType` (not hardcoded `D`/`E`/`N` PKs) |

| Done when |
|-----------|
| [ ] Load Roster shows real staff for the selected filters |
| [ ] Existing allocations appear as chips; empty cells stay blank |
| [ ] Pagination is server-side (`page` / `limit`) |
| [ ] No save / publish yet |

---

### D5 — Allocate + save draft

**Goal:** Persist cells as part of a `draft` period. **Sheet allocate first.** Drag-and-drop persist is deferred.

| Layer | Work |
|-------|------|
| Service | Create/update `ShiftRoster` as `draft`; upsert/delete allocations; derive hours; reject `staffId+date` collisions |
| Actions | `add` / `edit`; strip client audit / status |
| UI | Allocate Shift sheet, Leave checkbox, Save Draft |

| Done when |
|-----------|
| [ ] Save Draft persists the period + allocations |
| [ ] Reload after Save shows the same chips on Shift Roster |
| [ ] Leave checkbox stores `isLeave` without creating a leave application |
| [ ] Duplicate staff+date is rejected safely |

---

### D6 — Publish / copy / fill

**Goal:** Workflow and copy helpers.

| Action | Behaviour |
|--------|-----------|
| Publish Roster | Period `draft` → `published`; set `publishedAt` / `publishedBy`; cells inherit published |
| Fill New | New draft period for the current filters (empty cells) |
| Fill Old Roster | Copy from a previous published period into a **new date range** or into empty cells only — never a second row for the same staff+date |
| Copy Previous Week / Month | Pattern shifted by 7 days / month |
| Create Fixed Roster | **Toast** — do not block publish/copy |

| Done when |
|-----------|
| [ ] Publish is idempotent; further allocate/swap on those dates fails without an amendment |
| [ ] Copy previous week creates a draft with the pattern shifted by 7 days |
| [ ] Activity log on publish / copy |
| [ ] Create Fixed Roster still toast |

---

### D7 — Duty Roster on the same store

**Goal:** `/duty-roster` daily list is `RosterAllocation` filtered by duty date. No second table.

| Layer | Work |
|-------|------|
| Service | Same upsert as D5; Swap / Replace = two (or one) allocation updates in a transaction |
| UI | Load by date; Assign / Swap / Replace / Edit; weekly/monthly still toast |
| Publish lock | Swap on a published date → service error pointing at Amendments |

| Done when |
|-----------|
| [ ] Duty list for 11 Aug matches Shift Roster chips for 11 Aug |
| [ ] Swap in draft persists; both screens show the new shifts |
| [ ] Attendance Present / Late / Absent stores on the cell |
| [ ] Published date rejects direct swap |

---

### D8 — Roster Amendments

**Goal:** Only path to change a **published** cell.

| Layer | Work |
|-------|------|
| Service | CRUD amendment; Approve updates the allocation + marks `amended`; Reject leaves the cell |
| UI | New / Edit / History; header Approve / Reject need ≥1 selected pending/draft row |

| Done when |
|-----------|
| [ ] Approve changes the live cell; Shift Roster and Duty Roster both show it |
| [ ] Reject does not change the cell |
| [ ] Approved / Rejected rows hide Edit and Delete |

---

### D9 — Night Shifts (derived)

**Goal:** List + extra fields for allocations whose `ShiftType.isNightShift`.

| Work |
|------|
| Query `RosterAllocation` join `ShiftType` |
| Consecutive nights: count prior adjacent night allocations in the service; **> 3** red badge |
| Add: create allocation only if staff+date empty |
| Status display follows the cell/period — no parallel approve workflow |
| `sendToPayroll` flag only |

| Done when |
|-----------|
| [ ] Night register shows live night-flagged cells |
| [ ] Exception Add refuses an existing staff+date |

---

### D10 — Overnight Shifts (derived)

**Goal:** Same as Night, for `ShiftType.isOvernight`.

| Work |
|------|
| Persist stored Day 1 / Day 2 / Total + allocation date |
| Recalculate Splits writes those fields from start/end |
| Add only if staff+date empty |

| Done when |
|-----------|
| [ ] Overnight register shows live overnight-flagged cells |
| [ ] Recalculate updates stored split hours |

---

### D11 — Public Holiday Shifts + calendar stub

**Goal:** `HolidayCalendar` rows (v1 stub). Register = allocations whose date matches a holiday (or `holidayId` set).

| Work |
|------|
| CRUD holiday calendar (seed Nikini Poya, May Day, Independence Day as a start) |
| List/join allocations on those dates |
| Pay rate / allowance / `grantLieuLeave` / `sendToPayroll` on the cell (**flags only** — no entitlement or payroll post) |
| Add / Bulk: create allocations only for selected staff with empty date cells |

| Done when |
|-----------|
| [ ] Holiday register lists live cells on stub holiday dates |
| [ ] Bulk refuses rows that already have a cell that day |
| [ ] Lieu / payroll do not call Leave or payroll services |

---

### Later (do not block D1–D11)

| Item | Notes |
|------|--------|
| Live summary cards + conflicts | After the matching register is live (do not block persist) |
| Print / PDF / Excel | Table/grid export against real rows; until then toast |
| Duty Weekly / Monthly views | Stay toast |
| Drag-and-drop persist | Same upsert as D5 when product is ready |
| Create Fixed Roster templates | Separate collection when specified |
| Overtime Process Staff Shift | Replace OT sample fill with roster **read** (after D4+) |
| Leave overlap | Tick Leave vs real `LeaveApplication` — keep independent in v1 |
| RFID / attendance engine | Later; enum on the cell is enough for D7 |
| Real Holiday Date master | Replace `HolidayCalendar` stub when HR Administration exists |
| Roster master FK on Staff | Keep employment `roster` string until then |
| Multi-step approval | **Not** in v1 |

---

## 6. Domain notes (locked)

- Audit: `createdBy` / `updatedBy` / `publishedBy` are Auth User ObjectIds — **no** cross-DB Prisma relation.
- Do not put Prisma in pages.
- Do not trust client `status` or audit fields on save.
- Cell Leave is **not** a Leave Application. `grantLieuLeave` is **not** a Leave Entitlement write.
- Shift type codes are **`SHF-n`**. Chips may still **display** D/E/N labels from the type; those labels are not primary keys.
- Staff employment `roster` is a display/filter string until a Roster master exists.
- Overtime must not call a fake roster API — wait for D4+ read service.
- Mongo: enforce hospital-wide `staffId+date` uniqueness in Prisma **and** handle fill/copy as upsert/shift, not insert-on-top of published weeks.

---

## 7. Shared utilities

| Utility | Use |
|---------|-----|
| `CommonManagerHeader` | Page title + header actions |
| `@archmage/ui` `Card`, `Badge`, `Button` | Cards, status, actions |
| `CommonDataTable` | Flat registers (Shift Types, Assignment, Duty, Amendments, Night, Overnight, Holiday) |
| `@/components/ui/table` | Shift Roster grid primitives (not `CommonDataTable`) |
| `@/lib/utils/date` | Week / month labels |
| `usePermissions` | Hide write actions without grant |

---

## 8. Pitfalls

1. **Do not** put Prisma in pages — services only.
2. **Do not** use `CommonDataTable` for the roster grid — chips, sticky days, and drag-and-drop do not fit it. Keep the **same card/table styling**.
3. Register `/shift-roster`, `/shift-types`, `/shift-assignment`, `/duty-roster`, `/roster-amendments`, `/night-shifts`, `/overnight-shifts`, and `/public-holiday-shifts` in `ROUTE_TO_RESOURCE` (same `shift-roster` resource) or the routes stay open.
4. Permission changes need re-login (JWT snapshot).
5. Keep Save / Publish / Copy / Swap as no-ops until their D-slice.
6. Do not merge allocations into Staff or Leave Application documents. Do not write Leave Entitlement from `grantLieuLeave`.
7. Do not create `NightShift`, `DutyRosterRow`, or `PublicHolidayShift` collections — query / extra fields on `RosterAllocation`.
8. Do not block D1–D8 on Fixed Roster templates, drag persist, or OT integration.
9. Process Staff Shift in Overtime must not call a fake roster API — wait for D4+.
10. Fill/copy must respect hospital-wide `staffId+date` uniqueness (upsert or shift dates).

---

## 9. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — leave phases and UI map (copy this process)
- `apps/hrm/docs/OVERTIME_MANAGER_GUIDE.md` — UI-first shell; Process Staff Shift waits for D4+ read
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating
- `apps/hrm/prisma/schema.prisma` — six roster collections (D1)
