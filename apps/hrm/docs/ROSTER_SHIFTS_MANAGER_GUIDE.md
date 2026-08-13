# Roster & Shifts Manager — Development Guide

Guidance for building roster and shift features in `apps/hrm`.
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).
Leave / Overtime are the process references — see `LEAVE_MANAGER_GUIDE.md` and `OVERTIME_MANAGER_GUIDE.md`.

**Status:** Phase 0 UI implemented — awaiting design acceptance.
**Build path:** UI first, then **Types/Zod → Service → Actions → wire UI**.
Pages must not call Prisma. No business rules in components.

**Phase 0 decisions (locked):**
- Sidebar group: **Roster & Shifts**
- Sample week: **current calendar week** (Sun–Sat)
- Hide / Visible: local toggle for Department / Unit / Designation columns (Staff ID + Name stay)
- `/shift-roster` auto-collapses the desktop sidebar (Channeling focus-page pattern)

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/shift-roster` | `shift-roster` | Calendar roster planning: filters, allocate, draft, publish, copy, print/export |

v1 is **one screen**. Header actions (Fill New, Fill Old Roster, Create Fixed Roster) stay on this page as dialogs / toasts until a later phase splits them.

Sidebar: **Roster & Shifts → Shift Roster** collapsible in `desktop-sidebar.tsx`.

Overtime **Process Staff Shift** stays sample/toast until this module exposes a roster service (see `OVERTIME_MANAGER_GUIDE.md` Phase 6).

---

## 2. UI map (target — Phase 0)

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
| `shift-chip.tsx` | Reusable chip (type, time range, Leave checkbox) |
| `shift-legend.tsx` | D / E / N / O / L badges |
| `record-actions.tsx` | Edit / Delete / History (toast in Phase 0) |
| `shift-roster-workspace.tsx` | Client: filters, Hide/Visible, Load/Clear against sample |
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
- Actions: **+ Allocate Shift** (primary), Print, Export Excel, Export PDF — toast in Phase 0
- Legend: D Day 07:00-15:00 (green), E Evening 15:00-23:00 (orange), N Night 23:00-07:00 (purple), O Off (gray), L Leave (dashed / white)

#### Columns

| Group | Columns |
|-------|---------|
| Staff (sticky left) | Staff ID, Staff Name, Department, Unit, Designation — sort icons in header |
| Days | Sun 01 Sep … Sat 07 Sep (weekly). Monthly: days of the selected month |
| Metrics | Total Hours, OT Hours |
| Status | Published / Draft / Pending Approval pills |
| Actions | Edit, Delete, History |

#### Shift chip

Reusable `ShiftChip`: label (`Day` / `Evening` / `Night` / `Off` / `Leave`), time range, **Leave** checkbox.

Hint under the table: *Drag a shift chip to another cell to reassign. Tick 'Leave' to mark the cell as leave-covered.*  
Phase 0: chips are static; drag-and-drop is visual-only or toast.

Status colors (align with leave + mock):

- **Published** — green (`bg-emerald-100 text-emerald-700`)
- **Draft** — gray (`bg-muted text-muted-foreground`)
- **Pending Approval** — orange (`bg-orange-100 text-orange-700`)

Footer (right): `0 conflicts` pill + `Published 22 Aug 2025` outline pill.  
Metadata: Created by / Last updated (Auth user display names + timestamps from sample).

### 2.5 Sample rows (Phase 0)

Use ~6 staff rows so pagination (“Showing 1–6 of 248”) is visible. Mix Day / Evening / Night / Off / Leave / empty cells. Mix Published / Draft / Pending Approval.

---

## 3. Suggested folders

```
app/(dashboard)/(roster-shifts)/shift-roster/
  page.tsx
  header-actions.tsx
  shift-roster-workspace.tsx
  section-roster-summary.tsx
  section-roster-filters.tsx
  section-roster-grid.tsx
  shift-chip.tsx
  shift-legend.tsx
  record-actions.tsx
  sample-data.ts

# Dynamic layers (Phase 1+)
types/roster.ts
lib/mappers/
  shift-roster-form.mapper.ts
services/roster-services/
  roster-shared.ts
  shift-type.service.ts
  shift-roster.service.ts
app/actions/roster-actions/
  shift-type.actions.ts
  shift-roster.actions.ts
```

Activity log examples: `shift-roster.visited`, `shift-roster.draft-saved`, `shift-roster.published`. Entity types match the collection (`ShiftRoster`, `RosterAllocation`, …).

---

## 4. Permissions (register in Phase 0)

Unmapped routes stay open. Register before shipping the page.

Checklist (same as leave / overtime):

1. `types/user-group.ts` → `{ id: 'shift-roster', name: 'Shift Roster' }`
2. `lib/permissions.ts` → `ROUTE_TO_RESOURCE['/shift-roster'] = 'shift-roster'`
3. Sidebar `hasAccess` for `/shift-roster` under **Roster & Shifts**
4. Page `checkRouteAccess` → `/unauthorized-access`
5. Mutations: `requirePermission('shift-roster', action)`
6. Client buttons: `usePermissions().has('shift-roster', 'edit')` (publish/delete may use `edit` until a dedicated action is needed)
7. `breadcrumbs.tsx` → `{ path: 'shift-roster', name: 'Shift Roster' }`
8. Grant on Auth User Group; user re-logins

---

## 5. Development phases

**UI first, then dynamic.** Do not start Prisma until Phase 0 screens are accepted.

```
Phase 0: Static UI
  → Phase 1: Collections + types (lock domain)
    → Phase 2: Load roster (read)
      → Phase 3: Allocate + save draft
        → Phase 4: Publish / copy / fill
          → Phase 5: Live summary + conflicts
            → Phase 6: Print / export
              → Phase 7: Hardening
                → Phase 8: Downstream (OT Process Staff Shift, leave overlap)
```

Inside each dynamic phase, keep Staff / Leave layering:

```
Types/Zod → Service → Actions (permissions + activity log) → wire UI → smoke test
```

Pages must not call Prisma. No business rules in components.

**How to use this list:** Finish a phase’s “Done when” before starting the next. Prefer vertical slices inside each phase.

---

### Phase 0 — UI interfaces (do this first)

**Goal:** Pixel-close shell of the mock. No Mongo collection required.

| Work |
|------|
| Route group `(roster-shifts)/shift-roster` |
| `page.tsx` — `checkRouteAccess`, `CommonManagerHeader`, compose sections |
| Sample summary + filters + grid from `sample-data.ts` |
| **Module-specific table** (not `CommonDataTable`) with `ShiftChip` + legend |
| Header / filter / grid actions toast only |
| Permission resource + route map + sidebar + breadcrumb |
| Desktop sidebar auto-collapsed on `/shift-roster` (Channeling pattern + toggle) |
| `logActivityNonBlocking` on visit (`shift-roster.visited`) |

| Done when |
|-----------|
| [x] `/shift-roster` matches the mock (header, 4 cards, filters, weekly grid) |
| [x] Table is **not** `CommonDataTable`; visual structure matches other HRM cards/tables |
| [x] Non-admin without grant is redirected |
| [x] Fill / Save / Publish / Copy / Print / Export / Allocate do not write to the DB |
| [ ] Design accepted — ready for Phase 1 |

**Out of scope for Phase 0:** Prisma models, Zod, real drag-and-drop persist, print/export files.

---

### Phase 1 — Foundation (lock before Prisma)

**Goal:** Collections + shared types. Staff employment `roster` string stays a snapshot label until a Roster master exists.

Proposed (lock in this phase — do not invent extra collections):

```
Staff 1──* RosterAllocation
ShiftType 1──* RosterAllocation
ShiftRoster 1──* RosterAllocation
```

| Topic | Proposed decision (confirm before `db push`) |
|-------|-----------------------------------------------|
| Collections | **Three** — `ShiftType`, `ShiftRoster` (period header), `RosterAllocation` (staff × date cell) |
| Shift types | Seed D / E / N / O / L with default times from the legend |
| Roster period | One `ShiftRoster` per department + unit + roster name + from/to |
| Status | `draft` → `published` (optional `pending_approval` if product requires it) |
| Allocation uniqueness | `@@unique([shiftRosterId, staffId, date])` |
| Leave on a cell | Boolean `isLeave` on the allocation (chip checkbox); does not create a Leave Application in v1 |
| Hours / OT | Stored floats on the allocation (or derived from shift type duration in service) |
| Department / unit / roster | Snapshot strings on `ShiftRoster` and optionally on each allocation |
| Codes | `generateRecordCode`: `SR-1` for roster periods; shift types use stable codes `D`/`E`/`N`/`O`/`L` |
| Staff roster field | Keep employment `roster` string; do not require a Roster master FK in v1 |
| Conflicts | Overlapping allocations for the same staff + date across loaded rows |

| Done when |
|-----------|
| [ ] Domain table above is **locked** (edit this doc if product disagrees) |
| [ ] Models in `schema.prisma` + Staff relations both sides |
| [ ] `types/roster.ts` — statuses, shift codes, payloads, list params, DTOs |
| [ ] `prisma db push` + `prisma generate` applied locally |

---

### Phase 2 — Load roster (read)

**Goal:** Filters + **Load Roster** replace sample rows. No writes yet.

| Layer | Work |
|-------|------|
| Service | List staff in scope (department / unit / roster / name); load `ShiftRoster` + allocations for from/to |
| Actions | `requirePermission('shift-roster', 'view')` |
| UI | Load Roster / Clear call actions; empty state when nothing matches |
| Grid | Render live chips; weekly range from From/To (default current week) |

| Done when |
|-----------|
| [ ] Load Roster shows real staff for the selected filters |
| [ ] Existing allocations appear as chips; empty cells stay blank |
| [ ] Pagination is server-side (`page` / `limit`) |
| [ ] No save / publish yet |

---

### Phase 3 — Allocate + save draft

**Goal:** Persist cell changes as `draft`.

| Layer | Work |
|-------|------|
| Service | Create/update `ShiftRoster` as `draft`; upsert/delete allocations; derive hours |
| Actions | `add` / `edit`; strip client audit / status |
| UI | Allocate Shift, chip change, Leave checkbox, Save Draft, row edit/delete |
| Drag-and-drop | Reassign cell → same upsert path |

| Done when |
|-----------|
| [ ] Save Draft persists the period + allocations |
| [ ] Reload after Save shows the same chips |
| [ ] Leave checkbox stores `isLeave` without creating a leave application |
| [ ] Invalid duplicate staff+date is rejected safely |

---

### Phase 4 — Publish / copy / fill

**Goal:** Workflow and copy helpers.

| Action | Behaviour |
|--------|-----------|
| Publish Roster | `draft` → `published`; set `publishedAt` / `publishedBy` |
| Fill New | New draft period for the current filters (empty cells) |
| Fill Old Roster | Copy allocations from a previous published period into a new draft |
| Copy Previous Week / Month | Same as fill-old, scoped to the previous period |
| Create Fixed Roster | Toast or later template collection — **do not block** publish/copy |

| Done when |
|-----------|
| [ ] Publish is idempotent; cannot edit published cells without an explicit “edit published → new draft” rule (lock in this phase) |
| [ ] Copy previous week creates a draft with the same pattern shifted by 7 days |
| [ ] Activity log on publish / copy |
| [ ] Create Fixed Roster still toast unless product supplies a template spec |

---

### Phase 5 — Live summary + conflicts

**Goal:** Replace sample cards.

| Card | Query |
|------|--------|
| Staff Rostered | Distinct staff in the loaded period |
| Shifts This Week | Allocation count in the visible week (exclude Off/Leave if product agrees) |
| Total Hours | Sum planned hours |
| Conflicts | Count overlapping staff+date allocations; sub-text when `0` |

| Done when |
|-----------|
| [ ] Cards match the loaded filter range |
| [ ] Conflict pill on the grid footer matches the card |
| [ ] Monthly view uses the same queries for the month range |

---

### Phase 6 — Print / export

**Goal:** Blank vs filled output.

| Work |
|------|
| [ ] Print Blank Roster — staff rows + empty day cells |
| [ ] Print Filled Roster — chips as text/colours |
| [ ] Export Excel / PDF of the current grid |
| [ ] Grid Print button uses the filled layout |

Until this phase, print/export stay toast-only.

---

### Phase 7 — Hardening

| Work |
|------|
| [ ] Hide / Visible column toggles for staff fields |
| [ ] Monthly view (not toast) with horizontal scroll + sticky staff columns |
| [ ] View vs add/edit/delete matrix |
| [ ] History action — activity log for that staff/period (or toast if too heavy) |
| [ ] Smoke: filter → load → allocate → save draft → publish → copy previous week |
| [ ] Non-admin without grant redirected; view-only cannot publish |

---

### Phase 8 — Later (do not block v1 persist)

| Item | Notes |
|------|--------|
| Create Fixed Roster templates | Separate collection when product specifies repeating patterns |
| Overtime Process Staff Shift | Replace OT sample fill with this roster service |
| Leave overlap | Tick Leave vs real `LeaveApplication` — keep independent in v1 |
| Attendance overlap | Later |
| Roster master FK on Staff | Optional; keep employment `roster` string until then |
| Multi-step approval | Only if `pending_approval` is locked in Phase 1 |

---

## 6. Domain notes (proposed until Phase 1 lock)

- Audit: `createdBy` / `updatedBy` / `publishedBy` are Auth User ObjectIds — **no** cross-DB Prisma relation.
- Do not put Prisma in pages.
- Do not trust client `status` or audit fields on save.
- Cell Leave is **not** a Leave Application in v1.
- Staff employment `roster` is a display/filter string until a Roster master exists.
- Overtime must not call a fake roster API — wait for Phase 2+ read service.

---

## 7. Shared utilities

| Utility | Use |
|---------|-----|
| `CommonManagerHeader` | Page title + header actions |
| `@archmage/ui` `Card`, `Badge`, `Button` | Cards, status, actions |
| `@/components/ui/table` | Roster grid primitives (not `CommonDataTable`) |
| `@/lib/utils/date` | Week / month labels |
| `usePermissions` | Hide write actions without `edit` |

---

## 8. Pitfalls

1. **Do not** put Prisma in pages — services only.
2. **Do not** use `CommonDataTable` for the roster grid — chips, sticky days, and drag-and-drop do not fit it. Keep the **same card/table styling**.
3. Register `/shift-roster` in `ROUTE_TO_RESOURCE` or the route stays open.
4. Permission changes need re-login (JWT snapshot).
5. Keep Save / Publish / Copy as no-ops until their phase.
6. Do not merge allocations into Staff or Leave Application documents.
7. Do not block Phase 0–4 on Fixed Roster templates or OT integration.
8. Process Staff Shift in Overtime must not call a fake roster API.

---

## 9. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — leave phases and UI map (copy this process)
- `apps/hrm/docs/OVERTIME_MANAGER_GUIDE.md` — UI-first shell; Process Staff Shift waits on this module
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating
- `apps/hrm/prisma/schema.prisma` — add roster collections in Phase 1
