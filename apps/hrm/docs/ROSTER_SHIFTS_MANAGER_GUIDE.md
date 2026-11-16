# Roster & Shifts Manager — Development Guide

Guidance for building roster and shift features in `apps/hrm`.
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).
Leave / Overtime are the process references — see `LEAVE_MANAGER_GUIDE.md` and `OVERTIME_MANAGER_GUIDE.md`.

**Status:** All eight Roster & Shifts screens are operational. Phase 0 UI maps below are **historical layout specs** — prefer §1.1, §5 domain table, §10, and **§11** for current behaviour.  
**Domain (Phase 1 map):** locked in this doc (17 Aug 2026); uniqueness refined to **staff × date × shiftType** + time-overlap (see locked domain + §5).  
**D1:** Six collections in `schema.prisma` + `types/roster.ts`; `prisma db push` applied locally.  
**D6:** Shift Roster workflow is live on `/shift-roster` (publish, fill new, fill old, copy previous week/month, draft save guards on published dates).  
**D7:** Duty Roster **complete** on `/duty-roster` (same `RosterAllocation` store; standing / ad-hoc assign, place FKs, swap / replace / attendance; List/Days/Weeks/Months; leave + weekly-off soft warn; published dates locked).  
**D8:** Roster Amendments is live on `/roster-amendments` (CRUD; Approve applies to published cells; Reject leaves roster unchanged).  
**D9:** Night Shifts is live on `/night-shifts` (derived from `RosterAllocation` where `ShiftType.isNightShift`; consecutive nights computed; Add refuses same staff+date+**shiftType**).  
**D10:** Overnight Shifts is live on `/overnight-shifts` (derived from `RosterAllocation` where `ShiftType.isOvernight`; day-split hours stored; Recalculate Splits rewrites fields; Add refuses same staff+date+shiftType; conflict strip + leave/weekly-off soft warn like Night).  
**Build path:** UI first (done), then **Types/Zod → Service → Actions → wire UI**. Vertical slices, one collection or read/write path at a time.  
Pages must not call Prisma. No business rules in components. Remaining work is module-wise in **§11** (Shift Roster Phase F leftovers; Fixed Roster / E2 deferred).

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
- Duty Roster: Daily list plus Weekly (Sun–Sat) / Monthly date-range lists; Print/PDF/Excel on table only
- Duty Roster status: Draft / Published / Amended (follows allocation / period); History Cancel-only timeline
- Roster Amendments: **`CommonDataTable`**; header New / Approve / Reject; table-only Print/PDF/Excel
- Roster Amendments Approve / Reject: **≥1** selected row; skip already Approved/Rejected
- Roster Amendments status: Draft / Pending Approval / Approved / Rejected; History Cancel-only timeline
- Night Shifts: **`CommonDataTable`**; header Add only; table-only Print/PDF/Excel; consecutive nights **> 3** red badge
- Night Shifts status: **Draft / Published / Amended** (allocation status — no separate approval workflow)
- Night Shifts Overnight / Public Holiday: sibling routes, not tabs on this page
- Overnight Shifts: **`CommonDataTable`**; header Add + Recalculate Splits (live); table-only Print/PDF/Excel
- Overnight Shifts: Auto Split at midnight; attendance allocation Start/End date; Status includes Amended
- Public Holiday Shifts: **`CommonDataTable`**; header Add + Bulk Assign Holiday Duty (≥1 selected); table-only Print/PDF/Excel
- Public Holiday Shifts: Holiday → Type + Duty Date; Shift → Worked Hours; Staff Combobox; duty place = working-dept switch + Duty Department / Zone / Unit–Room (Duty-parity, own FKs)
- Public Holiday Shifts: conflict strip (same shift type / day limit hard-block; other duties info); leave soft-warn Continue via `acknowledgedWarnings`
- Public Holiday Shifts: Pay Rate badges 1.50x / 2.00x / 2.50x; Lieu Leave Yes/No; Send to Payroll on form only; filter Status uses Selector
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
- Night / Overnight / Holiday are **registers of allocations** (shift-type flags or holiday date). **Add** creates a `RosterAllocation` when the same staff + date + **shift type** is free (multi-shift day OK up to INT-R4; same type / time overlap blocked). Status pills follow the allocation / period — **not** a second approval engine.
- Holiday dates: owned by **HR Administration** (`HolidayCalendar` CRUD on `/holiday-calendar`). Public Holiday Shifts **reads** that master. **Manage Rosters** filter/codes (**INT-R3 / R7**) and Staff Employment roster codes (**INT-S3**) are **done** — see **§1.1**. Other masters (department, unit, designation, grade) remain on the HR Admin integration backlog.
- Grant Lieu Leave / Send to Payroll: **flags only** in v1 (no Leave Entitlement write, no payroll engine).
- Duty attendance: store Present / Late / Absent. RFID / finger-scan engine is in `STAFF_ATTENDANCE_ARCHITECTURE.md`. HR confirms sync from **Daily Attendance → Confirm to Duty Roster** (never auto from punches).
- Overnight: **store** Day 1 / Day 2 / Total hours + attendance allocation date; service still computes from start/end.
- **Uniqueness (allocations):** Prisma `@@unique([staffId, date, shiftTypeId])` — multiple different shift types on the same day are allowed up to Manage Rosters `shiftsPerPersonPerDay` (**INT-R4**); same shift type on the same day is blocked; overlapping duty time windows are also rejected. Standing Shift Assignment uniqueness is separate (same staff + same shift type + overlapping effective dates among active/pending).
- Permissions: keep **one** `shift-roster` resource. `edit` = allocate / save draft / swap. `add` or `edit` = publish and amendment approve. View-only cannot publish.
- **Defer / upcoming:** Create Fixed Roster (needs template schema); OT Process Staff Shift roster **read** (Overtime Manager); Dept / Unit / Designation / Grade master filters (HR Admin §31–32); Auto Assign E2/E3 rotation patterns (when product asks); **Manage Shifts** HR Admin screen (not required — keep Shift Types; §34).

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/shift-roster` | `shift-roster` | Week/month grid **view** of allocations (plan, draft, publish, copy) |
| `/shift-types` | `shift-roster` | **Current** hospital-wide shift template master (`ShiftType`, `SHF-n`) — used by Assignment, Duty, Shift Roster, Night/Overnight/PH |
| `/shift-assignment` | `shift-roster` | Standing staff ↔ shift / rotation **rule** — own collection; feeds Fill / Auto Assign |
| `/duty-roster` | `shift-roster` | Daily **view** of the same allocations (assign, swap, replace, attendance) |
| `/roster-amendments` | `shift-roster` | Overlay on **published** allocations; apply on Approve |
| `/night-shifts` | `shift-roster` | Register: allocations whose shift type is night (hours, consecutive-night alerts) |
| `/overnight-shifts` | `shift-roster` | Register: allocations whose shift type is overnight (stored midnight split) |
| `/public-holiday-shifts` | `shift-roster` | Register: allocations on `HolidayCalendar` dates (pay rate, lieu, payroll flags) |

**Permission:** one Auth User Group grant — resource id `shift-roster`, display name **Roster & Shifts** — covers every route in this group (same pattern as OT → `overtime-requests`).

Sidebar: **Roster & Shifts** collapsible → Shift Roster, Shift Types, Shift Assignment, Duty Roster, Roster Amendments, Night Shifts, Overnight Shifts, Public Holiday Shifts.

Shift Roster v1 is **one screen** for calendar planning. Header actions stay on that page (dialogs / sheets); only **Create Fixed Roster** remains a placeholder toast.

Overtime **Process Staff Shift** still uses sample/toast until Overtime wires a published-roster **read** (Phase F / Overtime Manager — roster store is ready).

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
HolidayCalendar  (HR Administration owns CRUD; Public Holiday Shifts joins allocations to these dates)
ManageRoster     (HR Administration — roster *groups* / business codes e.g. CHN; not period SR-n)
```

**Manage Shifts (HR Admin mock) vs Shift Types — locked decision for now**

Legacy mocks place **Manage Shifts** under HR Administration (templates filtered by roster group, leave hours, previous/next shift, etc.).  
**That module is not required for the current system.** Shift templates already live here as **Shift Types**.

| Topic | Decision |
|-------|----------|
| Template master today | **`ShiftType` / `/shift-types`** |
| Roster groups | **Manage Rosters** (HR Admin) — separate from templates |
| HR Admin Manage Shifts | **Deferred / optional** — see `HR_ADMINISTRATION_GUIDE.md` §34 |
| Dual masters | **Do not** run Manage Shifts CRUD alongside Shift Types |
| If product later needs roster-scoped catalogs | Prefer extend `ShiftType` (Option A) or replace with one HR master (Option B); then wire option loaders — details in §34 |

Until §34 Option A/B ships, **no Roster & Shifts refactor** is needed for Manage Shifts.

### 1.1 Manage Rosters connection (integration wave)

**Simple explanation:** Manage Rosters (HR Admin) is **not** a shift template. It defines a **roster group** (team/ward): department, business code (e.g. `CHN`), and how many shifts per person per day. **Shift Types** here are the actual shift templates (Morning, Night, etc.). **Shift Assignment** links staff ↔ shift type as standing rules. **Roster & Shifts** calendars then allocate those shifts on dates. In short: group rules in HR Admin → membership on Staff → standing rules in Shift Assignment → day duties in calendars.

Roster & Shifts **operational screens are complete**. **INT-H8–H9** and **D11 Public Holiday** done — remaining work is module-wise in **§11** (mainly Shift Roster polish). Do not reopen grid/register structure.

**Connection (required):**

```
Manage Rosters (CHN)
        →  Staff.employment.roster = "CHN"          (membership)
        →  StaffShiftAssignment.manageRosterId      (FK to group ObjectId)
        →  ShiftRoster / filters / allocation snapshots use "CHN"
           Period IDs stay SR-n
```

**Today:**

| Area | Status |
|------|--------|
| Staff Employment membership | Manage Roster **codes** (INT-S3) |
| Shift / Duty roster filters | Manage Rosters via `buildManageRosterFilterOptions` (INT-R3 / R7); legacy orphans dual-read |
| Shift Assignment | Roster-first UI; `manageRosterId` required on create; same-staff + same-shift-type overlap enforced |
| Day limit (`shiftsPerPersonPerDay`) | Stored on Manage Rosters; shown on Shift Assignment context card; **enforced** on allocate / fill-copy / publish (**INT-R4**). Multiple different shift types/day allowed up to the limit; same shift type / overlapping times blocked |

**Deliverables:**

| ID | Work | Status |
|----|------|--------|
| **INT-R3** | Load roster filter / create-period options from `ManageRoster` | **Done (R7)** |
| **INT-R3b** | New period + allocation snapshots write roster **code** | Keep string field; dual-read legacy during transition |
| **INT-R4** | Enforce `shiftsPerPersonPerDay` on allocate / fill / publish (full **calendar day**) | **Done (R8)** — `assertStaffDayShiftLimit` in `saveRosterAllocationDraft` + publish pre-check; not on standing-assignment create |
| **INT-L2** | Leave Application overlap on calendar allocate / fill / publish — **soft warn + Continue** (not hard block); not on standing Shift Assignment create | **Done** — `assertLeaveSoftWarn` + `acknowledgedWarnings` |
| — | Weekly-off day on covering standing assignment — soft warn + Continue on allocate / fill / publish / Duty Swap / Replace (same `acknowledgedWarnings` ack as INT-L2) | **Done** — `assertWeeklyOffSoftWarn` |
| **INT-H2** | Server assert: assigned staff’s `employment.roster` = selected Manage Roster **code** (create / bulk / update) | **Done** |
| **INT-H3** | Legacy null `manageRosterId` — backfill + include in Manage Rosters in-use | **Done** (HR Admin) |
| **INT-H5** | Reject inactive shift types on assignment create/update | **Done** |
| **INT-H6** | Case-insensitive roster-code membership lookups | **Done** |
| **INT-H7** | Overlap ignores `inactive`; `active` + `pending` still block | **Done** |
| — | Do **not** change | `SR-n` period codes; one `shift-roster` permission; Shift Types as template master |

**Locked storage key:** staff membership + Roster & Shifts roster **strings** = `ManageRoster.code`. Standing assignment FK = Manage Roster **ObjectId** (`manageRosterId`). Do not invent a second key.

Full backlog: `HR_ADMINISTRATION_GUIDE.md` §26, §29, §32 (incl. **INT-H*** post-review hardening). Staff Employment lock: `STAFF_MANAGER_GUIDE.md` §4 / §7 (**INT-H1**).

---

## 2. UI map — Shift Roster (Phase 0)

> **Live status (Nov 2026):** Load Roster, Allocate / Edit (Duty-parity), View, Delete drafts, History, publish / fill / copy, weekly + monthly views, print / Excel / PDF (export scope dialog), draft-only drag persist, conflict detail card, Fill New + Auto Assign All (E1 Fixed), leave / weekly-off soft warn, approved-leave amber hints. Still toast: **Create Fixed Roster** only. Prefer this callout + §11.1 over Phase 0 “toast” rows below when they disagree.

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
| `page.tsx` | Access check; load roster + form options; compose workspace |
| `header-actions.tsx` | Fill New, Fill Old, Create Fixed (toast), Save Draft, Publish |
| `section-roster-summary.tsx` | Four count cards (live) |
| `section-roster-filters.tsx` | Search & Filters card |
| `section-roster-grid.tsx` | Week/month header, legend, **module table**, pagination, audit footer |
| `roster-column-header.tsx` | Sortable header + per-column filter input |
| `shift-chip.tsx` | Reusable chip (type, time range, Leave checkbox); amber when leave / approved leave; click → Edit sheet |
| `shift-legend.tsx` | D / E / N / O / L badges |
| `record-actions.tsx` | View / Edit / Delete / History (sheets + delete confirm) |
| `shift-roster-workspace.tsx` | Client: filters, Hide/Visible, Load/Clear, sheets provider |
| `shift-roster-ui-context.tsx` | Open Add / Edit / View / History sheets |
| `sheet-roster-allocation-form.tsx` | Allocate / Edit allocation sheet (Duty-parity; live save) |
| `sheet-roster-allocation-history.tsx` | Change History sheet; **Cancel only** |
| `sheet-roster-staff-view.tsx` | View staff + duties for loaded week/month range; **Close only** |
| `sample-data.ts` | Historical Phase 0 mocks (not used by live Load Roster) |

### 2.1 Header

Reuse `CommonManagerHeader`:

- `title`: `Shift Roster`
- `description`: `Calendar-based roster planning with drag-and-drop allocation, weekly/monthly views, copy, publish and export.`
- `actions`: `ShiftRosterHeaderActions`

| Button | Style | Live |
|--------|-------|------|
| Fill New | Outline | **Live** — Fixed + `autoAssign` standing rules → empty days (E1); soft warn + Continue |
| Fill Old Roster | Outline | **Live** — copy previous published pattern into empty cells / new range |
| Create Fixed Roster | Outline + sparkles icon | **Toast** — deferred until template schema |
| Save Draft | Outline + disk icon | **Live** — period + draft cells; published dates guarded |
| Publish Roster | Primary green + send icon | **Live** — period/cells → published |

Gate write buttons with `usePermissions().has('shift-roster', 'edit')`.

### 2.2 Summary cards

Same grid as leave-management / overtime: `grid-cols-2 lg:grid-cols-4`, `Card` + `CardContent`.

| Card | Sample | Sub-text | Icon |
|------|--------|----------|------|
| Staff Rostered | `248` | Across 14 departments | People, teal circle |
| Shifts This Week | `1,736` | Weekly view – 01-07 Sep | Calendar, teal circle |
| Total Hours | `13,888` | Planned working hours | Clock, green circle |
| Conflicts | `0` | No overlapping allocations | Warning, orange circle |

**Live:** summary cards come from `loadRoster` / service counts (not sample).

### 2.3 Search & Filters

Dedicated card — **not** a `CommonDataTable` toolbar and **not** `FilterWrapper` URL search (roster load is explicit).

Row 1: Department, Unit, Roster, **DateRangePicker** (shared from/to), Staff Search  
Row 2: action buttons

| Control | Live |
|---------|------|
| Dropdowns / date range / search | URL + workspace; roster options via Manage Rosters (`buildManageRosterFilterOptions`). Dept/Unit still free-text / snapshot until HR Admin masters |
| **Load Roster** | Primary green — server load for filters + date range |
| Clear | Reset filters + reload default week |
| Hide / Visible | Local: Hide collapses Department / Unit / Designation; Visible restores |
| Copy Previous Week / Month | **Live** |
| Print Blank / Filled Roster | **Live** (same export path as grid Print) |

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

- Title: week/month label from loaded `fromDate`/`toDate`
- View toggle: **Weekly View** (primary) / **Monthly View** — monthly sets URL range to calendar month and reloads the same grid
- Actions: **+ Allocate Shift** (Add sheet), Print, Export Excel, Export PDF — live via export action + scope dialog (first 100 / 500 / all matching filters)
- Legend: D Day 07:00-15:00 (green), E Evening 15:00-23:00 (orange), N Night 23:00-07:00 (purple), O Off (gray), L Leave (dashed / white); amber chip / empty-cell hint when approved leave covers the day

#### Columns

| Group | Columns |
|-------|---------|
| Staff (sticky left) | Staff ID, Staff Name, Department, Unit, Designation — sort icons in header |
| Days | Sun 01 Sep … Sat 07 Sep (weekly). Monthly: days of the selected month |
| Metrics | Total Hours, OT Hours |
| Status | Draft / Pending Approval / Published / Amended pills |
| Actions | View, Edit, Delete, History |

#### Shift chip

Reusable `ShiftChip`: label (`Day` / `Evening` / `Night` / `Off` / `Leave`), time range, **Leave** checkbox. **Click chip** → Edit Roster Allocation sheet. Empty day cell → Add sheet prefilled with staff + date.

Hint under the table: *Drag a draft shift chip to another cell to reassign. Tick 'Leave' to mark the cell as leave-covered.*  
**Live:** drag persist is draft-only (published/amended blocked; same upsert as Allocate).

Status colors (align with leave + mock):

- **Published** — green (`bg-emerald-100 text-emerald-700`)
- **Draft** — gray (`bg-muted text-muted-foreground`)
- **Pending Approval** — orange (`bg-orange-100 text-orange-700`)
- **Amended** — sky (`bg-sky-100 text-sky-700`)

Footer (right): live conflict count pill (+ detail list when overlaps) + period published meta when present.  
Metadata: Created by / Last updated from Auth user resolve on period / cells.

### 2.5 Allocation sheets (Phase 0)

Right-side Sheets (same sticky-header pattern as Shift Types).

| Sheet | Opens from | Footer |
|-------|------------|--------|
| Allocate Shift | **+ Allocate Shift**; empty day cell (staff + date prefilled) | Cancel + Save Allocation |
| Edit Roster Allocation | Chip click; row pencil (first allocated day in loaded range, else toast) | Cancel + Save Changes |
| View Roster | Row eye | Staff header + duties for loaded week/month range; **Close only** |
| Change History | Row clock | **Cancel only** |

**Live form:** Duty-parity Allocate / Edit — standing/ad-hoc, duty place FKs, Leave + OT, published lock; leave soft-warn preview + Continue on save. Dept / Unit / Designation read-only from staff / assignment. Delete stays list-only (row trash removes **draft** cells in loaded range; published/amended → Amendments).

### 2.6 Sample rows (Phase 0)

Historical Phase 0 note: ~6 sample staff rows for pagination demos. **Live grid** pages real staff from `loadRoster` for the filter range.

---

## 2B. UI map — Shift Types (Phase 0)

**Role:** Shift Types is the **operational shift template master** for Roster & Shifts. It is **not** the same as the deferred HR Admin **Manage Shifts** mock (`HR_ADMINISTRATION_GUIDE.md` §34). Keep CRUD here unless product replaces this with a single HR-owned master.

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
| Assign Shift | Header | Roster group first, then staff in that group |
| Bulk Assign Shift | Header | Roster group required; only selected staff in that group |
| Edit Shift Assignment | Row pencil | Prefill including `manageRosterId` |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Fields: Roster Group* (Manage Rosters FK — context card: name, code, department, institution, shifts/person/day), Staff* (assign/edit; scoped to roster code membership + active-rule count), Shift Type*, Rotation Pattern (Fixed / 2-Shift / 3-Shift / 4 On 2 Off / Weekly / Custom), Effective From*, Effective To (optional), Weekly Off (Mon–Sun), Status (Active / Pending / Inactive), Auto Assign toggle. `StaffShiftAssignment.manageRosterId` → `ManageRoster`. Day-limit hard enforce remains INT-R4 on allocate/publish.

### 2C.2a Required behaviour (Shift Assignment)

| Rule | Required behaviour |
|------|-------------------|
| Roster-first | Select Manage Roster group before staff; staff options = members with `employment.roster` = group **code** |
| FK | Create always sets `manageRosterId`; update must keep a resolved roster (legacy null rows backfilled via employment code when edited) |
| Overlap | Reject only **same staff + same shift type** with overlapping effective date ranges among `active`/`pending` rows (cross-type allowed; `inactive` ignored — INT-H7) |
| Day limit | Context card shows `shiftsPerPersonPerDay`; **do not** hard-block standing-rule create — allocate / fill-copy / publish enforced (**INT-R4**) |
| Leave Application | **Do not** hard-block standing Shift Assignment for leave. Calendar allocate / fill / publish: soft warn + Continue if approved or pending leave overlaps that date (**INT-L2**) |
| Weekly off | Standing `weeklyOffDay` is informational on assignment create. Calendar allocate / fill / publish / Duty Swap / Replace: soft warn + Continue when the duty’s Asia/Colombo weekday matches any covering active/pending assignment’s weekly off (same `acknowledgedWarnings` as INT-L2) |
| Delete | Removes standing rule only; does **not** cascade-delete calendar cells |
| Shift Types | Templates only; delete blocked when assignments / allocations / amendments reference the type |

### 2C.2b Enforcement status

| Rule | UI | Server |
|------|----|--------|
| Staff must belong to selected roster | **Done** (scope API + sheet filter) | **Done (INT-H2)** |
| Same-type date overlap | Toast / form error | **Done** (`assertNoOverlap`; ignores `inactive`) |
| `manageRosterId` on create | Required field | **Done** |
| Inactive shift type rejected | Options may filter | **Done (INT-H5)** |

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

┌─ Duty Roster views ───────────────────────────────────────────────────────┐
│ List | Days | Weeks | Months                     [ Columns ] [ Print/… ]  │
│ List → staff-grouped table · Days/Weeks/Months → cards → CustomDialog     │
└───────────────────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(roster-shifts)/duty-roster/`:

| File | Role |
|------|------|
| `page.tsx` | Access check + live `RosterAllocation` list by date |
| `duty-roster-workspace.tsx` | Provider, header, filters, register, sheets, swap confirm |
| `duty-roster-ui-context.tsx` | Open Assign / Edit / Swap / Replace / History; swap confirm |
| `header-actions.tsx` | **Assign Staff**, **Swap Shift**, **Replace Staff** (no Print/Excel/PDF) |
| `section-duty-summary.tsx` | Four count cards |
| `section-duty-filters.tsx` | Mode-aware filters (date / year+month / year) + staff/dept/unit/shift/roster |
| `section-duty-register.tsx` | **List** — staff-grouped `CommonDataTable` + export |
| `section-duty-days-board.tsx` / `weeks` / `months` | Card browsers |
| `dialog-duty-range.tsx` | Drill-down dialog with staff-grouped duties |
| `section-duty-view-toolbar.tsx` | List / Days / Weeks / Months switcher |
| `section-duty-instructions.tsx` | Collapsible Duty Roster procedure |
| `columns.tsx` / `record-actions.tsx` | Columns + Swap / Edit / Delete / History |
| `sheet-duty-form.tsx` | Assign / Edit form |
| `sheet-duty-swap-form.tsx` | Swap sheet (two duty cards + confirm) |
| `sheet-duty-replace-form.tsx` | Replace sheet (handover + incoming cards + confirm) |
| `sheet-duty-history.tsx` | Timeline history; **Cancel only** |

### 2D.1 Header and views

- Print / PDF / Excel live on the **List** table toolbar only (not the page header).
- **List** (default): staff-grouped table for one **date**. **Days**: day cards for **year + month**. **Weeks**: week cards (Sun–Sat) for that month. **Months**: 12 cards for a **year**. Card click opens a staff-grouped duties dialog.
- Filters change with mode. Optional Staff / Dept / Unit / Shift / Roster always available.
- Header Swap / Replace open **full forms**. No table checkboxes.

### 2D.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Assign Staff | Header | Mode switch → Staff* → Duty date* → Assigned shift* (or ad-hoc Shift Type*) → place → supervisor |
| Swap Shift | Header or row Swap | Dedicated swap sheet: current + partner duty cards; partner border accent; Save → `CustomAlertDialog` confirm → toast |
| Replace Staff | Header or row | Dedicated replace sheet: duty-to-hand-over + incoming preview cards; Save → confirm |
| Edit Duty | Row pencil | Prefill live allocation (standing / ad-hoc) |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Field behaviour (locked):

- **Mode:** **From standing assignment** (default) vs **Ad-hoc duty**. Standing loads covering `StaffShiftAssignment` rows for staff × duty date (fetched whenever staff/date change, even in ad-hoc). **No covering row** → auto-switch to ad-hoc (toast). **Coverage appears** (e.g. date moved into an effective window) → auto-switch back to standing (toast), unless the user manually forced ad-hoc for that staff×date.
- **Order:** Staff → Duty date (defaults to register filter / today) → Assigned shift (standing) or Shift Type (ad-hoc) → read-only context card → place → supervisor.
- **Start / End** auto from Shift Type / assignment (disabled).
- **Duty department***: switch **Use staff working department** (default on). Off → department combobox scoped to staff institution. Persists `dutyLocationDepartmentId` (+ name snapshot).
- **Deep-link:** `/duty-roster?dutyDate=&staffId=&allocationId=` (from Night / Overnight edit notes) filters the list and auto-opens Edit when the allocation is present.
- **Zone** / **Unit–Room** optional (`dutyZoneId` / `dutyRoomId`).
- **Supervisor** staff combobox (excludes duty staff).
- Persist `allocationSource` (`standing` \| `adhoc`) + optional `staffShiftAssignmentId`.
- Status follows allocation / period (Draft / Published / Amended). INT-R4 / INT-L2 / weekly-off soft warn still apply on save.

**Swap sheet (locked):** Only staff already on duty that date appear. Current staff locked when opened from a row; **Swap with** excludes the same staff. Two read-only cards — current duty (neutral border) and swap partner (sky accent border) with shift / times / department / location / roster / supervisor. Both must already have a cell (else use Replace). Save opens `CustomAlertDialog` (“Swap this duty shift?” + named summary) before persist. **INT-L2:** soft warn + Continue if **either** staff has approved/pending leave on that day. **Weekly off:** soft warn + Continue if either staff’s covering standing assignment weekly off matches the Asia/Colombo weekday.

**Replace sheet (locked):** Staff to replace must already have a duty; replacement must **not** (unique staff×date). Current staff locked from row. Two cards — **Duty to hand over** (neutral) and **Replacement preview** (amber accent: institution / working dept / roster / standing if any + “Will take over this duty” summary). Same staff excluded; on-duty staff excluded from replacement list. Save opens `CustomAlertDialog` (“Replace this duty staff?” + named summary) before persist. Shift/place stay on the cell; only `staffId` changes. **INT-L2:** soft warn + Continue if **replacement** staff has approved/pending leave on that day. **Weekly off:** soft warn + Continue if replacement’s covering standing weekly off matches that weekday.

Sticky sheet header.

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

Field behaviour (locked — **type-driven form**):

- **Amendment No** auto `RA-n` / display auto-assigned (disabled).
- **Original Shift** auto from published cell lookup (disabled). Extra Duty may have no cell.
- Type shows a short hint strip; visible fields change with type:
  - **Shift Change** → **Published Duty** Combobox (`originalShiftTypeId`) + Amended Shift; summary card; conflict strip (same type / INT-R4)
  - **Shift Swap** → **Published Duty** for primary + **Swap With Duty** Combobox (other published/amended duties that day; stores partner `staffId` + partner shift in `amendedShiftTypeId`); dual cards
  - **Staff Replacement** → **Published Duty** + Replacement Staff Combobox (**free that day only**; same shift kept); dual cards
  - **Duty Cancellation** → **Shift to Cancel** Combobox (`originalShiftTypeId`); summary card; Approve deletes that specific cell
  - **Location Change** → **Published Duty** + Duty Department / optional Zone / Unit–Room; Approve writes FKs + name snapshot
  - **Extra Duty** → Amended Shift; published cell optional; conflict strip (same type / INT-R4)
- **INT-L2** leave + weekly-off soft warn + Continue (`acknowledgedWarnings`) on create/update **and header Approve**; Swap checks both staff; Replacement checks incoming partner too.
- **Requested By** select.
- Status: **Draft / Pending Approval / Approved / Rejected**. New defaults to Pending Approval.

Sticky sheet header. Save calls create/update actions.

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
| `page.tsx` | Access check + server actions (list, filters, form options, export) |
| `night-shifts-workspace.tsx` | Provider, header, filters, register, sheets |
| `night-shifts-ui-context.tsx` | Open Add / Edit / History |
| `header-actions.tsx` | **Add Night Shift** (no Print/Excel/PDF) |
| `section-night-summary.tsx` | Four count cards |
| `section-night-filters.tsx` | From / To default empty |
| `section-night-register.tsx` | `CommonDataTable` + policy banner + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-night-shift-form.tsx` | Add / Edit form |
| `sheet-night-shift-history.tsx` | Timeline history; **Cancel only** |

Backend: `services/roster-services/night-shift.service.ts`, `app/actions/roster-actions/night-shift.actions.ts`, `types/roster.ts` (`NightShiftRecord`, etc.).

### 2F.1 Header and policy

- Print / PDF / Excel on the **table toolbar only**.
- Consecutive nights **> 3** show a red `n nights` badge. Orange banner under the register toolbar.

### 2F.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Add Night Shift | Header | No selected-row requirement |
| Edit Night Shift | Row pencil | Prefill from live record; Edit/Delete on all statuses |
| Change History | Row clock | Timeline like Shift Types; Cancel only |

Field behaviour (locked):

- **Start / End** auto from Night Shift Type (disabled). Hours / OT / allowances editable; consecutive nights **read-only** (computed in service).
- **Send to Payroll** toggle maps to the Payroll Ready Yes/No badge.
- Status: **Draft / Published / Amended** (from allocation; not a separate approval dropdown).
- **Edit only:** note card links to the same cell on Duty Roster (`?dutyDate&staffId&allocationId`) to change **duty place / department** — Night does not own a department picker.

Sticky sheet header. Save calls create/update actions.

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
| `page.tsx` | Access check + server actions (list, filters, form options, export) |
| `overnight-shifts-workspace.tsx` | Provider, header, filters, register, sheets |
| `overnight-shifts-ui-context.tsx` | Open Add / Edit / History |
| `header-actions.tsx` | **Add Overnight Shift**, **Recalculate Splits** (live) |
| `section-overnight-summary.tsx` | Four count cards |
| `section-overnight-filters.tsx` | From / To default empty |
| `section-overnight-register.tsx` | `CommonDataTable` + split banner + export |
| `columns.tsx` / `record-actions.tsx` | Columns + Edit / Delete / History |
| `sheet-overnight-form.tsx` | Add / Edit form + auto-split |
| `sheet-overnight-history.tsx` | Timeline history; **Cancel only** |

Backend: `services/roster-services/overnight-shift.service.ts`, `app/actions/roster-actions/overnight-shift.actions.ts`, `types/roster.ts` (`OvernightShiftRecord`, etc.).

### 2G.1 Header

- Print / PDF / Excel on the **table toolbar only**.
- **Recalculate Splits** live (rewrites day-split hours; no selected-row requirement).
- Green banner: hours split at midnight; attendance posted to allocation date.

### 2G.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Add Overnight Shift | Header | No selected-row requirement |
| Edit Overnight Shift | Row pencil | Prefill sample; Edit/Delete on all statuses |
| Change History | Row clock | Timeline like Night Shifts; Cancel only |

Field behaviour (locked):

- Start/End **dates** required and editable. Start/End **times** auto from Overnight Shift Type (**disabled** in UI; **server always uses ShiftType times**). Shift type also prefills allowance.
- **Auto Split Hours at Midnight** on: Day 1 / Day 2 / Total auto and disabled. Off: those three editable. OT and Allowance stay editable.
- Attendance allocation: **Shift Start Date** / **Shift End Date** / **Split Across Both Days** (default start).
- **Send to Payroll** maps to Payroll Ready.
- Status: **Draft / Pending Approval / Published / Amended** (from allocation; read-only in edit).
- **Edit only:** note card links to the same cell on Duty Roster (`?dutyDate&staffId&allocationId`) to change **duty place / department** — Overnight does not own a department picker.
- **Conflict strip (like Night):** live preview on staff + start date + shift type — hard-block same shift type / INT-R4 day limit; info when other duties exist that day (notes overnight spans Day 2). Save disabled while blocked. Leave / weekly-off soft warn + Continue via `acknowledgedWarnings` (same draft path as Night).

Sticky sheet header. Save calls create/update actions.

### 2G.3 Register

Columns include **Updated** and **Created**. Default From / To empty.

---

## 2H. UI map — Public Holiday Shifts (Phase 0)

Gazetted holiday duties with holiday pay, lieu leave, and payroll posting. Same permission (`shift-roster`). Register page — **do not** auto-collapse the sidebar. Holiday dates come from the **HR Administration Holiday Calendar** master (`/holiday-calendar`).

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
- Green banner: holidays sourced from the Holiday Date master under HR Administration (`/holiday-calendar`).
- Roster **group** filter: loads from Manage Rosters **codes** (INT-R3 / R7) with legacy orphan dual-read. Department / unit / designation / grade remain on the broader HR Admin integration backlog (`HR_ADMINISTRATION_GUIDE.md` §32).

### 2H.2 Form sheets

| Sheet | Opens from | Notes |
|-------|------------|--------|
| Add Holiday Shift | Header | No selected-row requirement |
| Bulk Assign Holiday Duty | Header | Hides Staff; banner with selected count |
| Edit Holiday Shift | Row pencil | Prefill sample; Edit/Delete on all statuses |
| Change History | Row clock | Timeline like Overnight; Cancel only |

Field behaviour (locked):

- Public Holiday, Staff (not Bulk), Shift, Pay Rate required.
- Layout: Holiday (full) → Holiday Type | Duty Date → Staff | Shift → remaining fields.
- Holiday selection auto-fills **Holiday Type** and **Duty Date** (both read-only cards from Holiday Calendar). Server derives allocation date from the holiday; client `dutyDate` is ignored.
- Shift auto-fills **Worked Hours** (editable). Staff is a **Combobox**. Working Location (institution) is read-only.
- **Duty place (Duty-parity):** switch **Use staff working department** (default on). Off → **Duty Department** Combobox scoped to staff institution. Optional **Zone** / **Unit–Room** Comboboxes. Persist `dutyLocationDepartmentId` (+ name in `dutyLocation`), `dutyZoneId`, `dutyRoomId`.
- **Conflict strip:** live preview on staff + holiday date + shift — hard-block same shift type / INT-R4 day limit; info when other duties exist that day. Leave soft warn + Continue via `acknowledgedWarnings`.
- **Bulk Assign:** requires ≥1 selected register rows; unique `staffIds` from selection; one create per staff via `bulkCreatePublicHolidayShifts`. Soft leave/weekly-off preflight + Continue; hard skip same shift type / day limit; working-dept switch applies per staff (or one shared place when off). Toast created + skipped counts.
- Filter **Approval Status** uses **Selector** (constant list).
- Pay Rate: **1.50x / 2.00x / 2.50x**. Grant Lieu Leave maps to Lieu Leave Yes/No. Send to Payroll is **form only**.
- Status: Draft / Pending Approval / Approved / Rejected / **Amended**. New defaults to Pending Approval.

Sticky sheet header. Save calls create/update/bulk actions.

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
  sheet-roster-staff-view.tsx
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
  section-duty-instructions.tsx
  section-duty-register.tsx
  columns.tsx
  record-actions.tsx
  sheet-duty-form.tsx
  sheet-duty-history.tsx

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
| [x] Create appears in register as Active/Inactive |
| [x] Edit loads form; delete removes row (or soft-status if locked) |

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

Weekly / Monthly views are date-range lists on `/duty-roster` (not a second grid).

### Duty Roster — Phase 0 — UI interfaces

| Work |
|------|
| Route `(roster-shifts)/duty-roster` — sheets + swap confirm |
| List: header, 4 cards, filters, `CommonDataTable` + Created/Updated |
| Daily list plus Weekly (Sun–Sat) / Monthly date-range lists; table-only Print/PDF/Excel |
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
| [x] Status shows Draft / Published / Amended from allocation |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |
| [x] **D9:** Live register from `RosterAllocation` where `ShiftType.isNightShift` |

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
| [x] Status shows Draft / Pending Approval / Published / Amended from allocation |
| [x] Layout accepted for dynamic work (minor style / component polish allowed) |
| [x] **D10:** Live register from `RosterAllocation` where `ShiftType.isOvernight` |

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
| Allocation uniqueness | **`@@unique([staffId, date, shiftTypeId])`** — multiple different shift types/day OK up to INT-R4; same shift type on the same day blocked; overlapping time windows also rejected |
| Fill / copy | Empty days only (or shifted dates for copy previous week/month); never insert a second row for the same staff+date+**shiftType**; time-overlap still blocked |
| Leave on a cell | Boolean `isLeave`; does **not** create a Leave Application in v1 |
| Duty extras on the cell | `dutyLocation`, supervisor id/name snapshots, `attendance` (`present` \| `late` \| `absent` \| null), comments |
| Overnight on the cell | Start/end date-time; stored `day1Hours` / `day2Hours` / `totalHours`; attendance allocation date (`shift_start` \| `shift_end`) |
| Holiday on the cell | Optional `holidayId`; `payRate` (`1.50` \| `2.00` \| `2.50`); `holidayAllowance`; `grantLieuLeave`; `sendToPayroll`; `dutyLocationDepartmentId` FK + `dutyLocation` name snapshot |
| Night extras on the cell | Night hours / OT / allowances as stored floats when the shift type is night; consecutive nights **computed** in the service (not a stored counter as source of truth) |
| Hours / OT | Stored floats on the allocation; derive from shift type duration when creating the cell |
| Snapshots | Department / unit / roster **strings** on `ShiftRoster` and on each allocation (same pattern as Overtime). Roster string = `ManageRoster.code` (**INT-R3** / dual-read legacy orphans) |
| Staff roster field | Employment `roster` string = Manage Roster **code** (**INT-S3**). No Prisma FK required in v1 |
| Publish lock | After `published`, allocate / swap / edit **rejected** in service except via approved `RosterAmendment` |
| Permissions | One resource `shift-roster`. View-only cannot publish |
| Derived screens | Night / Overnight / Holiday query `RosterAllocation`; **Add** creates an allocation when staff+date+**shiftType** is free (same uniqueness + overlap rules as Allocate) |
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
| [x] Create appears in register as Active/Inactive |
| [x] Edit loads form; delete refuses when allocations or assignments reference the type |

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
| [x] Assign / Edit persist; Bulk writes one row per selected staff |
| [x] Overlapping effective dates for the same staff + same shift type rejected in the service |
| [x] Roster-first UI + `manageRosterId` on create |
| [x] **INT-H2** — service rejects staff whose employment roster ≠ selected Manage Roster code |
| [x] **INT-H5** — service rejects inactive shift types on create/update |

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
| [x] Load Roster shows real staff for the selected filters |
| [x] Existing allocations appear as chips; empty cells stay blank |
| [x] Pagination is server-side (`page` / `limit`) |
| [x] No save / publish yet |

---

### D5 — Allocate + save draft

**Goal:** Persist cells as part of a `draft` period. **Sheet allocate first.** Drag-and-drop persist is **done** (draft-only — Phase D).

| Layer | Work |
|-------|------|
| Service | Create/update `ShiftRoster` as `draft`; upsert/delete allocations; derive hours; reject `staffId+date+shiftType` collisions + time overlap |
| Actions | `add` / `edit`; strip client audit / status |
| UI | Allocate Shift sheet, Leave checkbox, Save Draft |

| Done when |
|-----------|
| [x] Save Draft persists the period + allocations |
| [x] Reload after Save shows the same chips on Shift Roster |
| [x] Leave checkbox stores `isLeave` without creating a leave application |
| [x] Duplicate staff+date+shiftType (and time overlap) is rejected safely |

---

### D6 — Publish / copy / fill

**Goal:** Workflow and copy helpers.

| Action | Behaviour |
|--------|-----------|
| Publish Roster | Period `draft` → `published`; set `publishedAt` / `publishedBy`; cells inherit published |
| Fill New | New draft period for the current filters (empty cells) |
| Fill Old Roster | Copy from a previous published period into a **new date range** or into empty cells only — never a second row for the same staff+date+shiftType |
| Copy Previous Week / Month | Pattern shifted by 7 days / month |
| Create Fixed Roster | **Toast** — do not block publish/copy |

| Done when |
|-----------|
| [x] Publish is idempotent; further allocate/swap on those dates fails without an amendment |
| [x] Copy previous week creates a draft with the pattern shifted by 7 days |
| [x] Activity log on publish / copy |
| [x] Create Fixed Roster still toast |

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
| [x] Duty list for a given date matches Shift Roster chips for that date |
| [x] Swap in draft persists; both screens show the new shifts |
| [x] Attendance Present / Late / Absent stores on the cell |
| [x] Published date rejects direct swap |

---

### D8 — Roster Amendments

**Goal:** Only path to change a **published** cell.

| Layer | Work |
|-------|------|
| Service | CRUD amendment; Approve updates the allocation + marks `amended`; Reject leaves the cell |
| UI | New / Edit / History; header Approve / Reject need ≥1 selected pending/draft row |

| Done when |
|-----------|
| [x] Approve changes the live cell; Shift Roster and Duty Roster both show it |
| [x] Reject does not change the cell |
| [x] Approved / Rejected rows hide Edit and Delete |
| [x] New / Edit / History sheets on live data |
| [x] Header Approve / Reject require ≥1 selected draft/pending row |

---

### D9 — Night Shifts (derived)

**Goal:** List + extra fields for allocations whose `ShiftType.isNightShift`.

| Work |
|------|
| Query `RosterAllocation` join `ShiftType` |
| Consecutive nights: count prior adjacent night allocations in the service; **> 3** red badge |
| Add: create allocation when staff+date+**shiftType** is free (multi-shift day OK up to INT-R4) |
| Status display follows the cell/period — no parallel approve workflow |
| `sendToPayroll` flag only |

| Done when |
|-----------|
| [x] Night register shows live night-flagged cells |
| [x] Exception Add refuses same staff+date+shiftType |
| [x] Consecutive nights > 3 show red badge + summary alert count |
| [x] Create / update / delete / history wired via actions |
| [x] Table Print/PDF/Excel export from server |
| [x] `sendToPayroll` flag persisted on allocation |

---

### D10 — Overnight Shifts (derived)

**Goal:** Same as Night, for `ShiftType.isOvernight`.

| Work |
|------|
| Persist stored Day 1 / Day 2 / Total + allocation date |
| Recalculate Splits writes those fields from start/end |
| Add refuses same staff + date + **shiftType** (multi-shift day OK up to INT-R4; time overlap blocked on draft) |

| Done when |
|-----------|
| [x] Overnight register shows live overnight-flagged cells |
| [x] Recalculate updates stored split hours |
| [x] Create / update / delete / history wired via actions |
| [x] Table Print/PDF/Excel export from server |
| [x] Auto Split computes Day 1 / Day 2 / Total from start/end times |
| [x] `sendToPayroll` flag persisted on allocation |
| [x] Add refuses same staff+date+shiftType; conflict strip + leave/weekly-off soft warn |
| [x] Edit note links to Duty Roster for duty place / department |

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
| [x] Holiday register lists live cells on holiday dates (`holidayId` / calendar join) |
| [x] Bulk Assign creates per selected staff; skips same shift type / day limit; leave/weekly-off soft warn + Continue |
| [x] Lieu / payroll do not call Leave or payroll services (flags only) |

---

### Later / external (do not reopen completed D-slices)

| Item | Notes |
|------|--------|
| Live summary cards + conflicts | **Done** on Shift Roster (service counts + overlap detail list) |
| Print / PDF / Excel | **Done** on Shift Roster + flat registers |
| Duty Weekly / Monthly views | **Done** as date-range lists on `/duty-roster`; calendar grid stays on Shift Roster |
| Drag-and-drop persist | **Done** — draft-only (Phase D) |
| Create Fixed Roster templates | Still deferred — separate collection when product specifies schema |
| Overtime Process Staff Shift | Still open — replace OT sample fill with published roster **read** (Phase F / Overtime) |
| Leave overlap (**INT-L2**) | **Done:** soft warn + Continue on allocate / fill / publish **and Duty Swap / Replace** when approved/pending leave overlaps the duty window (Colombo civil bounds; half-day AM/PM aware). Not on standing Shift Assignment create. Cell `isLeave` independent of Leave Application. |
| Weekly-off soft warn | **Done:** soft warn + Continue when covering standing `weeklyOffDay` matches Colombo weekday (same ack as INT-L2). |
| RFID / attendance engine | See `STAFF_ATTENDANCE_ARCHITECTURE.md`; enum on the cell is enough for D7; confirm sync is HR-gated |
| Real Holiday Date master | **Done** — HR Administration `/holiday-calendar`; keep Roster as read consumer |
| Department / Unit / Designation / Grade masters | Still open — `HR_ADMINISTRATION_GUIDE.md` §31–32 → roster filter options (Phase F) |
| **Manage Rosters integration (INT-R3 / R7)** | **Done** — see **§1.1** |
| Enforce `shiftsPerPersonPerDay` (INT-R4 / R8) | **Done** — allocate / fill-copy / publish |
| Staff employment roster value | **Done (INT-S3)** — string = Manage Roster **code** (not ObjectId / Prisma FK) |
| HR Admin Manage Shifts | **Not required**; deferred — `HR_ADMINISTRATION_GUIDE.md` §34. Keep `/shift-types` |
| If Manage Shifts (A/B) ships later | Shared roster-scoped option loaders; Assignment / Duty / grids / Night / Overnight / PH follow §34 |
| Multi-step approval | **Not** in v1 |

---

## 6. Domain notes (locked)

- Audit: `createdBy` / `updatedBy` / `publishedBy` are Auth User ObjectIds — **no** cross-DB Prisma relation.
- Do not put Prisma in pages.
- Do not trust client `status` or audit fields on save.
- Cell Leave is **not** a Leave Application. `grantLieuLeave` is **not** a Leave Entitlement write.
- Shift type codes are **`SHF-n`**. Chips may still **display** D/E/N labels from the type; those labels are not primary keys.
- Staff employment `roster` stores `ManageRoster.code` (**INT-S3**). No Prisma FK required.
- Overtime must not call a fake roster API — Process Staff Shift waits on an Overtime-side published-roster **read** (Phase F).
- Mongo: enforce `@@unique([staffId, date, shiftTypeId])` plus time-overlap checks; fill/copy upsert empty cells or shift dates — never insert-on-top of an existing same-type cell.

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
5. Do not reintroduce toast no-ops for Save / Publish / Copy / Swap / Allocate — those paths are live; only **Create Fixed Roster** remains a placeholder.
6. Do not merge allocations into Staff or Leave Application documents. Do not write Leave Entitlement from `grantLieuLeave`.
7. Do not create `NightShift`, `DutyRosterRow`, or `PublicHolidayShift` collections — query / extra fields on `RosterAllocation`.
8. Do not block remaining polish on Fixed Roster templates or OT Process Staff Shift — those are deferred/external (Phase F / product).
9. Process Staff Shift in Overtime must not invent a fake roster API — consume published `RosterAllocation` via a real read.
10. Fill/copy must respect `staffId+date+shiftType` uniqueness and time-overlap (empty cells only / shift dates).

---

## 9. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — leave phases and UI map (copy this process)
- `apps/hrm/docs/OVERTIME_MANAGER_GUIDE.md` — Process Staff Shift waits on published-roster read (Phase F)
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating
- `apps/hrm/docs/STAFF_MANAGER_GUIDE.md` — Employment membership + standing-assignments panel (§7); **INT-H1**
- `apps/hrm/docs/HR_ADMINISTRATION_GUIDE.md` — Manage Rosters / Change Staff; §32 **INT-H*** hardening backlog
- `apps/hrm/prisma/schema.prisma` — six roster collections (D1)

---

## 10. Post-review hardening TODO (this module)

Canonical table: `HR_ADMINISTRATION_GUIDE.md` §32 (**INT-H***). Roster & Shifts owners:

- [x] **INT-H2** (Must) — `createAssignmentRecord` / bulk / update: staff `employment.roster` must equal resolved Manage Roster **code**
- [x] **INT-H5** (Should) — reject inactive shift types on create/update
- [x] **INT-H6** (Should) — case-insensitive roster-code membership in getShiftAssignmentRosterScope (and peer lookups)
- [x] **INT-H7** (Should) — overlap ignores inactive; ctive/pending still block
- [x] **INT-R4 / R8** — enforce shiftsPerPersonPerDay on allocate / fill / publish (full calendar day)
- [x] **INT-L2** — allocate / fill / publish: soft warn + Continue when staff has leave on that calendar day (not on standing Shift Assignment)
- [x] **Weekly-off soft warn** — allocate / fill / publish / Duty Swap / Replace when covering standing `weeklyOffDay` matches Colombo weekday
- [x] **INT-H8** — overlap re-check immediately before create/update write (narrow TOCTOU; Mongo standalone has no reliable interactive txn for range-unique)
- [x] **INT-H9** — `deleteStaff` / `deleteStaffs` refuse while standing assignments or roster allocations exist; schema `onDelete: Restrict` on those Staff FKs (Prisma Client emulation on Mongo)

---

## 11. Remaining completion — module-wise (Roster & Shifts group)

Snapshot of what is still open vs largely done across the eight screens. **Shift Types**, **Shift Assignment**, **Duty Roster**, **Night**, **Overnight**, **Amendments**, and **Public Holiday (D11)** are complete in Roster & Shifts. **Shift Roster** Phases A–E1 (+ row View) are done; leftovers are Phase F (OT read / HR master filters) and deferred Fixed Roster / E2. **INT-H8 / INT-H9** are done.

### Already done (do not re-open as “remaining”)

- **D1–D11** operational paths (schema/types, Shift Types, Assignment, Shift Roster publish/fill/copy, Duty, Amendments, Night, Overnight, Public Holiday)
- **Duty Roster complete** — List / Days / Weeks / Months + assign / swap / replace / attendance / soft warns / export
- **Shift Types** + **Shift Assignment** complete (incl. delete guards + schema `onDelete: Restrict` where paired)
- **Public Holiday Shifts complete** — register, filters, Add/Edit/Bulk, duty place, conflict strip, leave/weekly-off soft warn, published lock, export
- **Shift Roster A–E1** — Duty-parity Allocate, row delete/history/view, print/export + monthly view, draft drag, conflicts, Fixed Auto Assign / Fill New, approved-leave amber
- **INT-R3 / R7** Manage Rosters filter/codes; **INT-R4 / R8** shifts-per-person-per-day
- **INT-L2** leave soft warn + **weekly-off** soft warn (allocate / fill / publish / Duty Swap / Replace / Night / Overnight / PH)
- Multi-shift same day: unique `staffId + date + shiftTypeId` + time-overlap hard block
- Holiday Calendar master (HR Admin); PH Shifts consumes it
- **INT-H8 / INT-H9** — assignment overlap re-check before write; staff delete guards for assignments + allocations

> **Uniqueness (canonical):** allocations = **staff × date × shiftType** + time-overlap hard block (+ INT-R4 day cap). Older “one shift per staff × date” lines are obsolete — prefer this section + schema `@@unique`.

> **Legend:** ✅ = module fully completed for Roster & Shifts v1 scope. Under each module, **Related features to add** lists follow-ons that belong with that surface (may be owned by another module — still tracked here so they are not lost).

### 11.1 Shift Roster — `/shift-roster`

Operational Load / allocate draft / publish / fill / copy / View / Auto Assign (E1) are live. Remaining: Phase F leftovers + deferred Fixed Roster / E2. Execute in phases below (do not reorder without product reason).

**Locked decisions (Nov 2026)**

| # | Decision |
|---|----------|
| 1 | Allocate Shift does **not** include Attendance (Duty owns daily attendance) |
| 2 | Rotation expansion — **E1 Fixed-like locked for v1**; E2 catalog cycle / E3 multi-row later |
| 3 | Bulk generate entry point — **both** Shift Roster **Fill New** and Assignment **Auto Assign All** (shared generator) |
| 4 | Drag-and-drop persist = **draft-only** |
| 5 | **Create Fixed Roster** deferred until template schema / mock exists |
| 6 | Start implementation with **Phase A** (Duty-parity Allocate) |

**Implementation order**

| Phase | Work | Notes |
|-------|------|--------|
| **A** | Allocate Shift ↔ Duty parity | **Done** — standing/ad-hoc; duty place FKs; Leave + OT; published lock; reuse Duty form options; no Swap/Replace/Attendance |
| **A+** | Live INT-L2 leave hint | **Done** — shared `getRosterLeavePreview` + amber strip on Allocate (under Leave + highlight / Set Yes), Duty (assign/edit/swap/replace), Night, Overnight, PH, Amendments. Skip Shift Types / Assignment. Save Continue dialog unchanged |
| **B** | Grid row completeness | **Done** — row Delete removes **draft** cells for staff in loaded range (published/amended skipped → Amendments); Change History loads activity timeline for row allocation IDs |
| **C** | Output & views | **Done** — Print blank/filled via `getShiftRosterExportAction` + `buildShiftRosterExport` + `printPdfUtil`; grid Print / Excel / PDF; export scope dialog (first 100 / 500 / all matching filters); Monthly View sets URL `fromDate`/`toDate` to calendar month then reloads grid |
| **D** | Advanced planning | **Done** except Fixed Roster — drag persist (draft-only); conflict detail card. Fixed Roster **deferred** (needs schema) |
| **E** | Auto Assign / rotation | **Done (E1)** — shared `generateAutoAssignDraftCells` (`auto-assign-roster.service`); Fixed + `autoAssign=true` + status **active**; empty days only; leave/weekly-off soft warn + Continue; Fill New + Auto Assign All both call it; Assignment UI disables Auto Assign when pattern ≠ Fixed |
| **F** | Shared / external | HR master filter options; OT Process Staff Shift read; guide cleanup (**done** Nov 2026 — uniqueness + stale toast notes) |

**Still toast / deferred**

| Remaining | Notes |
|-----------|--------|
| Create Fixed Roster | Deferred — needs template schema |
| Auto Assign E2 / E3 | Catalog cycle / multi-row — when product asks (E1 Fixed is v1) |

**Related features**

| Feature | Owner / notes |
|---------|----------------|
| Duty-parity Allocate Shift (Phase A) | **Done** |
| Row View sheet | **Done** — staff + duties for loaded week/month |
| Fixed Roster templates + Create Fixed Roster wire-up | This module (when product specifies schema) |
| Drag-and-drop allocate persist (draft-only) | **Done** (Phase D) |
| Full monthly planning grid | **Done** (Phase C) |
| Real Print blank / filled + Export Excel / PDF | **Done** (Phase C) |
| Richer conflict summary (overlap detail list) | **Done** (Phase D) |
| Auto Assign / Fill from standing rotation (`autoAssign`) | **Done (E1 Fixed)** — E2/E3 later |
| Overtime **Process Staff Shift** reads published roster cells | Overtime Manager (Phase F) |
| Dept / Unit / Designation / Grade filter options from HR masters | HR Admin masters → this screen’s filters (Phase F) |

### 11.2 Shift Types — `/shift-types` ✅

| Status | Notes |
|--------|--------|
| **Complete** | CRUD, duplicate, export, Bulk Activate, in-use delete guard. Schema `onDelete: Restrict` on assignment / allocation / amendment → ShiftType FKs (paired with `assertShiftTypeDeletable`) |

**Related features to add**

| Feature | Owner / notes |
|---------|----------------|
| HR Admin **Manage Shifts** (roster-scoped catalogs + leave/prev-next rules) | **Not required** for current system — keep `/shift-types` (`HR_ADMINISTRATION_GUIDE.md` §34) |
| Shared option loaders if Manage Shifts Option A/B ever ships | This module + Assignment / Duty / Night / Overnight / PH |

### 11.3 Shift Assignment — `/shift-assignment` ✅

| Status | Notes |
|--------|--------|
| **Complete** | Roster-first, `manageRosterId`, INT-H2/H5–H8, bulk assign. Staff delete guards (**INT-H9**) live in Staff service |

**Related features to add**

| Feature | Owner / notes |
|---------|----------------|
| Auto-fill / copy from standing rules into calendar cells (richer Fill from Assignment) | Shift Roster fill path (already partially used) |
| Staff Employment panel deep-link polish | Staff Manager (standing-assignments panel already live) |
| Staff `employment.roster` always = Manage Roster **code** (INT-S3) | Staff module; Assignment already asserts membership |

### 11.4 Duty Roster — `/duty-roster` ✅

| Status | Notes |
|--------|--------|
| **Complete** | Standing/ad-hoc, place FKs, swap/replace, attendance enum, List/Days/Weeks/Months, leave + weekly-off soft warn, list export, summary cards. Staff delete vs allocations covered by **INT-H9** |

**Related features to add**

| Feature | Owner / notes |
|---------|----------------|
| **Daily Attendance → Confirm to Duty Roster** (never auto from punches) | Attendance / `STAFF_ATTENDANCE_ARCHITECTURE.md` — writes Present/Late/Absent onto duty cells after HR confirm |
| Richer conflict strip (overlap / leave / weekly-off browse signals) | This module (optional polish) |
| Dept / Unit / Designation / Grade master filters | HR Admin masters → this screen’s filters |
| RFID / finger-scan engine | Attendance (Duty only stores the attendance enum) |

### 11.5 Roster Amendments — `/roster-amendments` ✅

| Status | Notes |
|--------|--------|
| **Complete** | CRUD + Approve applies to published cell / Reject leaves cell; type-driven form; multi-duty published-cell picker; swap partner duty via `amendedShiftTypeId`; Duty place FKs; dual cards; leave+weekly-off soft warn on create/update **and batch Approve**; Extra Duty / Shift Change conflict strip; export |

**Related features to add**

| Feature | Owner / notes |
|---------|----------------|
| Multi-step approval workflow | **Not** in v1 |
| Notify affected staff / supervisors on Approve | Optional (product) |
| Multi-site place constraints beyond institution-scoped dept list | Optional polish |

### 11.6 Night Shifts — `/night-shifts` ✅

| Status | Notes |
|--------|--------|
| **Complete** | Live register from night-flagged allocations; consecutive-nights badge; export |

**Related features to add**

| Feature | Owner / notes |
|---------|----------------|
| `sendToPayroll` → real payroll post | Payroll (flag only in v1) |
| Policy threshold configurable (today consecutive nights **> 3**) | HR Admin / product config if required |

### 11.7 Overnight Shifts — `/overnight-shifts` ✅

| Status | Notes |
|--------|--------|
| **Complete** | Live register; day-split store; Recalculate Splits; export; ShiftType times enforced; dept/unit name resolve; Edit → Duty place deep-link; conflict strip (same type / INT-R4) + leave/weekly-off soft warn; Add refuses same staff+date+**shiftType** |

**Nothing left inside Roster & Shifts for this screen.** Remaining items are owned elsewhere:

| Feature | Owner / notes |
|---------|----------------|
| `sendToPayroll` → real payroll post | Payroll (flag only in v1) |
| Attendance allocation date sync from Daily Attendance confirm | Attendance (same confirm wave as Duty) |
| Richer Conflicts summary card | Optional polish (current count is thin) — not required to close D10 |
| Dept / Unit master filter options | Shared HR Admin masters backlog (§11.9) |

### 11.8 Public Holiday Shifts — `/public-holiday-shifts` ✅

| Status | Notes |
|--------|--------|
| **Complete** | Live register on holiday dates; Status Selector; Staff Combobox; Duty-parity place (working-dept switch + Zone / Unit–Room); conflict strip (same type / INT-R4); leave/weekly-off soft warn; Bulk Assign per selected staff (skip same type / day limit); published lock; export; lieu / send-to-payroll **flags only** |

**Nothing left inside Roster & Shifts for this screen.** Remaining items are owned elsewhere:

| Feature | Owner / notes |
|---------|----------------|
| `grantLieuLeave` → Leave Entitlement write | Leave Manager (**not** v1 — flag only) |
| `sendToPayroll` → payroll engine | Payroll (**not** v1 — flag only) |
| Holiday Calendar H7/H8 (leave day counting / year import) | HR Admin `/holiday-calendar` (PH Shifts is read consumer) |

### 11.9 Shared across the group

| Item | Touches |
|------|---------|
| **INT-H8 / INT-H9** | **Done** — see §10 |
| Dept / Unit / Designation / Grade master filters | When HR Admin masters land (`HR_ADMINISTRATION_GUIDE.md` §31–32) — apply on Shift Roster / Duty / Assignment filters |
| Staff `employment.roster` = Manage Roster **code** (INT-S3) | Staff module; Roster already consumes codes |
| Guide cleanup | **Done** (Nov 2026) — uniqueness = staff×date×shiftType + overlap; Shift Roster §2 live callouts; stale toast / one-shift-per-day lines fixed |

### 11.10 Outside this group (index — details live under the module above)

| Item | Tracked under |
|------|----------------|
| Overtime **Process Staff Shift** → roster **read** | §11.1 Shift Roster |
| Attendance **Confirm to Duty Roster** (+ Overnight allocation date sync) | §11.4 Duty Roster / §11.7 Overnight |
| HR Admin **Manage Shifts** | §11.2 Shift Types (**not required**) |
| Multi-step approval | §11.5 Roster Amendments (**not** in v1) |

*Last updated: Nov 2026 — Shift Roster Phases A–**E1** + row View done; guide cleanup (Phase F docs slice) done. Still open in F: OT Process Staff Shift read; HR master Dept/Unit/Designation/Grade filters. Fixed Roster + E2 deferred until product asks.*
