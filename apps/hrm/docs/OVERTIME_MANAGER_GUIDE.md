# Overtime Manager — Development Guide

Guidance for building overtime (OT) features in `apps/hrm`.
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).
Leave is the reference module — see `LEAVE_MANAGER_GUIDE.md`.

**Status:** Phase 0 UI accepted. Dynamic work started (Phase 1 schema + Extra Time CRUD first).
**Build path:** UI first (done), then **Types/Zod → Service → Actions → wire UI**.
Pages must not call Prisma. No business rules in components.

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/overtime-requests` | `overtime-requests` | OT request register, summary cards, approve / reject |
| `/overtime-extra-time` | `overtime-requests` | Additional Extra Time Forms (form + search + register) |
| `/overtime-day-off-ph-shift` | `overtime-requests` | Day Off / PH Shift (form + search + register) |
| `/overtime-extra-shift-normal` | `overtime-requests` | Extra Shift Normal (form + search + register) |

Sidebar: **Overtime Management → Overtime** collapsible in `desktop-sidebar.tsx` (OT Requests, Extra Time, Day Off / PH Shift, Extra Shift Normal).

Same resource grant covers all overtime form routes. **New OT Request** on the dashboard links to `/overtime-extra-time`.

---

## 2. UI map (target — Phase 0)

Match the Overtime dashboard mock. Compose like Leave Management (`CommonManagerHeader` + count cards + section).

```
┌─ CommonManagerHeader ─────────────────────────────────────────┐
│ Overtime                                                      │
│ OT requests, additional duty forms and approvals              │
│                     [ + New OT Request → /overtime-extra-time ] │
└───────────────────────────────────────────────────────────────┘

┌─ Pending ─┐ ┌─ Approved (Mon) ─┐ ┌─ Total OT Hours ─┐ ┌─ OT Cost ─┐
│     9     │ │       146        │ │      2,140h      │ │ LKR 1.8M  │
└───────────┘ └──────────────────┘ └──────────────────┘ └───────────┘

┌─ OT Requests ─────────────────────────────────────────────────┐
│ Staff │ Department │ Date │ Hours │ Reason │ Status │ Actions │
│ … sample rows …                                               │
└───────────────────────────────────────────────────────────────┘
```

Key files under `app/(dashboard)/(overtime)/overtime-requests/`:

| File | Role |
|------|------|
| `page.tsx` | Access check, compose layout, sample data |
| `header-actions.tsx` | **+ New OT Request** → `/overtime-extra-time` |
| `section-ot-summary.tsx` | Four count cards |
| `section-ot-requests.tsx` | `CommonDataTable` shell |
| `columns.tsx` | Staff, Department, Date, Hours, Reason, Status, Actions |
| `record-actions.tsx` | Circular reject / approve (toast only in Phase 0) |
| `sample-data.ts` | Mock rows and summary totals |

### 2.1 Header

Reuse `CommonManagerHeader`:

- `title`: `Overtime`
- `description`: `OT requests, additional duty forms and approvals`
- `actions`: `OvertimeHeaderActions` — primary **+ New OT Request**

Phase 0: button navigates to Additional Extra Time Forms.

### 2.2 Summary cards

Same grid as leave-management: `grid-cols-2 lg:grid-cols-4`, `Card` + `CardContent`.

| Card | Sample | Notes |
|------|--------|--------|
| Pending | `9` | Orange clock icon (mock) |
| Approved (Aug) | `146` | Label uses current month name |
| Total OT Hours | `2,140h` | Format hours with `h` suffix |
| OT Cost | `LKR 1.8M` | Compact LKR; real rate later |

Phase 0: hardcode from `sample-data.ts`. Phase 4: replace with action → service counts.

### 2.3 OT Requests table

Use `CommonDataTable` (same as leave application / leave types), not a hand-rolled HTML table.

| Column | Example | UI |
|--------|---------|-----|
| Staff | N. Fernando / ST-1 | Name + staff code |
| Department | Ward 3 | From staff employment / denormalized |
| Date | 13 Aug | Short month day |
| Hours | 4h | Duration |
| Reason | Ward coverage | Short text |
| Status | Pending / Approved / Rejected | Color badges |
| Actions | Reject + Approve | Circular icon buttons (red X / green check) |

Status colors (align with leave + mock):

- **Pending** — orange (`bg-orange-100 text-orange-700`)
- **Approved** — green (`bg-emerald-100 text-emerald-700`)
- **Rejected** — red (`bg-red-100 text-red-700`)

Gate write buttons with `usePermissions().has('overtime-requests', 'edit')`.
Phase 0: toast *“Will be wired in the workflow phase”* — do not call Prisma.
Enable approve/reject only when `status === 'pending'`.

### 2.4 Sample rows (Phase 0)

| Staff | Department | Date | Hours | Reason | Status |
|-------|------------|------|-------|--------|--------|
| N. Fernando | Ward 3 | 13 Aug | 4h | Ward coverage | Pending |
| S. Wijesinghe | Emergency | 12 Aug | 6h | Emergency intake | Approved |
| R. Perera | Cardiology | 12 Aug | 3h | Night shift extension | Pending |
| A. Silva | Lab | 11 Aug | 5h | Additional consultation | Rejected |
| K. Jayasinghe | Ward 3 | 11 Aug | 4h | Sample backlog | Approved |

### 2.5 Additional Extra Time Forms (`/overtime-extra-time`)

Leave Application two-column workspace, plus a **Links** sidebar on `2xl`:

- **`< 2xl`:** Form left (`lg:col-span-4`); Search + Register stacked on the right (`lg:col-span-8`). Links is a horizontal card above the search column.
- **`2xl`:** Form (`3`) | Search + Register (`7`) | **Links** (`2`)

```
2xl:
┌─ Extra Time Form ─┐ ┌─ Search Forms ──────────┐ ┌─ Links ──────┐
│ form fields       │ │ date / staff / approver │ │ Finger Print │
│                   │ ├─ Extra Time Register ───┤ │ Print        │
│                   │ │ CommonDataTable         │ │ Analysis     │
└───────────────────┘ └─────────────────────────┘ └──────────────┘
```

Links (Phase 0): Finger Print, Print, Analysis — toast only.

Key files under `app/(dashboard)/(overtime)/overtime-extra-time/`:

| File | Role |
|------|------|
| `page.tsx` | Access check, sample filter, compose workspace |
| `extra-time-workspace.tsx` | 4/8 grid; row edit loads the form |
| `form-extra-time.tsx` | Extra Time Form (Formik + Yup, no persist) |
| `filter-section.tsx` | `FilterWrapper` search |
| `section-extra-time-list.tsx` | Search card + `CommonDataTable` |
| `section-extra-time-links.tsx` | Links card (Finger Print, Print, Analysis) |
| `columns.tsx` / `record-actions.tsx` / `view-dialog.tsx` | Register UX |
| `sample-data.ts` | Mock AET rows and options |

Phase 0: Save / Delete / Process Staff Shift toast only.

### 2.6 Day Off / PH Shift (`/overtime-day-off-ph-shift`)

Same workspace as Extra Time (form | search + register | Links). Field deltas vs Extra Time:

- Type is **DO** or **PH** (no shift combobox; Process Staff Shift sits beside Type)
- From and To both use `CustomDateTimePartsField` with `showCombined`
- Approved Date instead of Comment; Delete + Delete Comment match Extra Time
- Search button label: **Search Shift Date**
- Sample IDs: `DO-321`, `PH-118`

Key files under `app/(dashboard)/(overtime)/overtime-day-off-ph-shift/`:

| File | Role |
|------|------|
| `page.tsx` | Access check, sample filter, compose workspace |
| `extra-shift-workspace.tsx` | 4/8 grid; row edit loads the form |
| `form-extra-shift.tsx` | Day Off / PH Shift Form (Formik + Yup, no persist) |
| `filter-section.tsx` | `FilterWrapper` search |
| `section-extra-shift-list.tsx` | Search card + `CommonDataTable` |
| `section-extra-shift-links.tsx` | Links card (Finger Print, Print, Analysis) |
| `columns.tsx` / `record-actions.tsx` / `view-dialog.tsx` | Register UX |
| `sample-data.ts` | Mock DO / PH rows and options |

Phase 0: Save / Delete / Process Staff Shift toast only.

### 2.7 Extra Shift Normal (`/overtime-extra-shift-normal`)

Same workspace as Extra Time (form | search + register | Links). Field deltas vs Day Off / PH:

- No Process Staff Shift, Type, or shift combobox
- From and To use `CustomDateTimePartsField` without `showCombined`
- Approved Date + Comment
- Delete + Delete Comment only when a record is selected
- Search button label: **Search Shift Date**
- Sample IDs: `ES-0091`, `ES-0092`

Key files under `app/(dashboard)/(overtime)/overtime-extra-shift-normal/`:

| File | Role |
|------|------|
| `page.tsx` | Access check, sample filter, compose workspace |
| `extra-shift-normal-workspace.tsx` | 4/8 grid; row edit loads the form |
| `form-extra-shift-normal.tsx` | Extra Shift Form (Formik + Yup, no persist) |
| `filter-section.tsx` | `FilterWrapper` search |
| `section-extra-shift-normal-list.tsx` | Search card + `CommonDataTable` |
| `section-extra-shift-normal-links.tsx` | Links card (Finger Print, Print, Analysis) |
| `columns.tsx` / `record-actions.tsx` / `view-dialog.tsx` | Register UX |
| `sample-data.ts` | Mock ES rows and options |

Phase 0: Save / Delete toast only.

---

## 3. Suggested folders

```
app/(dashboard)/(overtime)/overtime-requests/
  page.tsx
  header-actions.tsx
  section-ot-summary.tsx
  section-ot-requests.tsx
  columns.tsx
  record-actions.tsx
  sample-data.ts

app/(dashboard)/(overtime)/overtime-extra-time/
  page.tsx
  extra-time-workspace.tsx
  form-extra-time.tsx
  filter-section.tsx
  section-extra-time-list.tsx
  columns.tsx
  record-actions.tsx
  view-dialog.tsx
  sample-data.ts

app/(dashboard)/(overtime)/overtime-day-off-ph-shift/
  page.tsx
  extra-shift-workspace.tsx
  form-extra-shift.tsx
  filter-section.tsx
  section-extra-shift-list.tsx
  columns.tsx
  record-actions.tsx
  view-dialog.tsx
  sample-data.ts

app/(dashboard)/(overtime)/overtime-extra-shift-normal/
  page.tsx
  extra-shift-normal-workspace.tsx
  form-extra-shift-normal.tsx
  filter-section.tsx
  section-extra-shift-normal-list.tsx
  columns.tsx
  record-actions.tsx
  view-dialog.tsx
  sample-data.ts

# Dynamic layers
types/overtime.ts
lib/mappers/
  overtime-extra-time-form.mapper.ts
  overtime-day-off-ph-form.mapper.ts
  overtime-extra-shift-normal-form.mapper.ts
  overtime-request-form.mapper.ts
services/overtime-services/
  overtime-shared.ts
  overtime-extra-time.service.ts
  overtime-day-off-ph.service.ts
  overtime-extra-shift-normal.service.ts
  overtime-request.service.ts
app/actions/overtime-actions/
  overtime-extra-time.actions.ts
  overtime-day-off-ph.actions.ts
  overtime-extra-shift-normal.actions.ts
  overtime-request.actions.ts
```

Do **not** keep a stale `overtime-extra-shift/` folder — the live Day Off route is `overtime-day-off-ph-shift`.

Activity log examples: `overtime-extra-time.visited`, `overtime.extra-time.created`, `overtime.extra-time.deleted`. Entity types match the collection (`OvertimeExtraTime`, `OvertimeRequest`, …).

---

## 4. Permissions (register in Phase 0)

Unmapped routes stay open. Register before shipping the page.

Checklist (same as leave):

1. `types/user-group.ts` → `{ id: 'overtime-requests', name: 'OT Requests' }`
2. `lib/permissions.ts` → `ROUTE_TO_RESOURCE['/overtime-requests'] = 'overtime-requests'`
3. Sidebar `hasAccess` for `/overtime-requests`, `/overtime-extra-time`, `/overtime-day-off-ph-shift`, and `/overtime-extra-shift-normal`
4. Pages `checkRouteAccess` → `/unauthorized-access`
5. Mutations: `requirePermission('overtime-requests', action)` (HR-only, same grant as the current forms)
6. Client buttons: `usePermissions().has('overtime-requests', 'edit')`
7. `breadcrumbs.tsx` → `{ path: 'overtime-requests', name: 'OT Requests' }`
8. Grant on Auth User Group; user re-logins

---

## 5. Development phases

**UI first, then dynamic.** Do not start Prisma until Phase 0 screens are accepted.

```
Phase 0: Static UI (accepted)
  → Phase 1: Four collections + types
    → Phase 2: CRUD — Extra Time first, then Day Off / PH, Extra Shift Normal, OT Requests
      → Phase 3: Approve / reject / cancel on all four
        → Phase 4: Live summary cards (hours only; cost stays placeholder)
          → Phase 5: Hardening
            → Phase 6: Roster / rates / attendance (later)
```

Inside each dynamic phase, keep Staff / Leave layering:

```
Types/Zod → Service → Actions (permissions + activity log) → wire UI → smoke test
```

Pages must not call Prisma. No business rules in components.

---

### Phase 0 — UI interfaces (do this first)

**Goal:** Pixel-close shell of the mock. No Mongo collection required.

| Work |
|------|
| Route group `(overtime)/overtime-requests` |
| `page.tsx` — `checkRouteAccess`, `CommonManagerHeader`, compose sections |
| Sample summary + table from `sample-data.ts` |
| Status badges + circular approve/reject (toast only) |
| **+ New OT Request** stub dialog (no persist) |
| Permission resource + route map + breadcrumb |
| `logActivityNonBlocking` on visit (`overtime-requests.visited`) |

| Done when |
|-----------|
| [x] `/overtime-requests` matches the mock (header, 4 cards, table) |
| [x] Non-admin without grant is redirected |
| [x] Approve / reject / Extra Time / Day Off / Extra Shift Save / Delete do not write to the DB |
| [x] Design accepted — Phase 1 started |

**Out of scope for Phase 0:** Prisma models, Zod, cost calculation.

---

### Phase 1 — Foundation (locked)

**Goal:** Four collections + shared types. Dashboard is **not** an inbox merge of the forms.

```
Staff 1──* OvertimeRequest
Staff 1──* OvertimeExtraTime
Staff 1──* OvertimeDayOffPh
Staff 1──* OvertimeExtraShiftNormal
```

| Topic | Locked decision |
|-------|-----------------|
| Collections | **Four** — one per screen |
| Form numbers | `generateRecordCode`: `OT-1`, `AET-1`, `DO-1` / `PH-1`, `ES-1` |
| Create / approve | HR-only, same as current forms (`overtime-requests` grant) |
| Approver | Auth **User.id**; denormalized `approverName` |
| Hours | **Float**; Extra Time / Day Off / Extra Shift **derive** from `toAt - fromAt` |
| Department / roster | Snapshot strings at save time |
| Cost | **Do not store.** Summary card stays placeholder until payroll/rate exists |
| Process Staff Shift | Toast + sample fill until a roster service exists |
| Workflow | Same on all four: `pending` → `approved` \| `rejected` \| `cancelled` |

| Done when |
|-----------|
| [x] Models in `schema.prisma` + Staff relations both sides |
| [x] `types/overtime.ts` — statuses, payloads, list params, record DTOs |
| [x] `prisma db push` + `prisma generate` applied locally |

---

### Phase 2 — CRUD (one module at a time)

**Order:** Extra Time → Day Off / PH → Extra Shift Normal → OT Requests.

| Layer | Work |
|-------|------|
| Service | list (paged), get, create, update, delete; default `status = pending` |
| Actions | `requirePermission('overtime-requests', …)`; strip client audit / status / formNumber |
| UI | Replace `sample-data` list with actions; Save / Delete / export call the server |
| Delete | Hard-delete (like leave). `deleteComment` goes on the activity log only |

| Done when |
|-----------|
| [x] Extra Time save appears in the register as `pending` (`AET-n`) |
| [x] Extra Time edit loads the form; delete removes the row |
| [ ] Day Off / PH + Extra Shift Normal + OT Requests persist (same pipeline) |
| [ ] No approve side effects yet |

---

### Phase 3 — Approval workflow

**Goal:** Status transitions on all four collections (no entitlement math).

| Layer | Work |
|-------|------|
| Service | `approve` / `reject` / `cancel` in transactions; reject double-approve |
| Actions | Permission + activity log per transition |
| UI | Dashboard circular buttons + form “Approval workflow”; `router.refresh()` |

| Done when |
|-----------|
| [ ] Pending → approved / rejected on each collection |
| [ ] Invalid double-approve rejected safely |
| [ ] Reject does not invent cost |

---

### Phase 4 — Live summary cards

**Goal:** Replace sample counts. Cost stays placeholder.

| Card | Query |
|------|--------|
| Pending | count `status = pending` on `OvertimeRequest` (dashboard collection) |
| Approved (month) | approved in current calendar month |
| Total OT Hours | sum stored `hours` of approved OT Requests |
| OT Cost | keep sample / `—` until a rate rule exists |

---

### Phase 5 — Hardening

| Work |
|------|
| [ ] Server-side pagination on form registers (`page` / `limit` like leave) |
| [ ] Dashboard filters (department / status / date range) |
| [ ] View vs add/edit/delete matrix |
| [ ] Smoke: Extra Time create → list → edit → delete |
| [ ] Smoke (after Phase 3): create → approve → cards update |

---

### Phase 6 — Later (do not block v1 persist)

| Item | Notes |
|------|--------|
| Roster-backed Process Staff Shift | Keep toast/sample until roster service exists |
| OT types / rates | Required before trustworthy OT Cost |
| Finger Print / Print / Analysis | Links stay toast-only |
| Attendance overlap | Later |
| Multi-step approval history | Optional, same as leave v2 |

---

## 6. Domain notes (locked)

- Approver is Auth User, not Staff.
- Audit: `createdBy` / `updatedBy` / `approverId` are Auth User ObjectIds — **no** cross-DB Prisma relation.
- Status: `pending` → `approved` \| `rejected` \| `cancelled`.
- Do not put Prisma in pages.
- Do not trust client `status`, `formNumber`, or audit fields on save.
- Extra Time / Day Off / Extra Shift hours are derived at write time for later cards; OT Request hours are entered on that form.
- Day Off form numbers use prefix **DO** or **PH** from the selected type.

---

## 7. Shared utilities

| Utility | Use |
|---------|-----|
| `CommonManagerHeader` | Page title + actions |
| `@/lib/utils/date` | Date / month labels |
| `@archmage/ui` `Card`, `Badge`, `Button` | Cards, status, actions |
| `CommonDataTable` | OT request register (Phase 0); filters / export in Phase 5+ |
| `usePermissions` | Hide approve/reject without `edit` |

---

## 8. Pitfalls

1. **Do not** put Prisma in pages — services only.
2. Register overtime routes in `ROUTE_TO_RESOURCE` or they stay open.
3. Permission changes need re-login (JWT snapshot).
4. Approver is **Auth User.id**; resolve names like Staff / Leave.
5. Do not invent OT cost until a rate rule exists.
6. Keep approve/reject as no-ops until Phase 3.
7. Do not merge the four screens into one `kind` collection.
8. Process Staff Shift must not call a fake roster API — sample fill only.

---

## 9. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — leave phases and UI map (copy this process)
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating
- `apps/hrm/prisma/schema.prisma` — add OT collections in Phase 1
