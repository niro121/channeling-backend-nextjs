# Overtime Manager — Development Guide

Guidance for building overtime (OT) features in `apps/hrm`.
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).
Leave is the reference module — see `LEAVE_MANAGER_GUIDE.md`.

**Status:** Phase 0 UI shell live (sample data). No Prisma model or persist actions yet.
**Build path:** **UI interfaces first** (Phase 0), then dynamic layers (Phase 1+).
Do **not** skip Phase 0 — lock the screens before Prisma / services.

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/overtime-requests` | `overtime-requests` | OT request register, summary cards, approve / reject |
| `/overtime-requests/add` | `overtime-requests` | New OT request form (Phase 0 dialog stub; dedicated page later) |
| Reserved | `overtime-duty` | Additional duty forms (subtitle; v2, like leave gate pass) |

Sidebar: **Overtime Management → OT Requests** in `desktop-sidebar.tsx`.

Keep OT as a flat group until a second page exists. Promote to `SidebarCollapsible` only when additional duty / types land.

---

## 2. UI map (target — Phase 0)

Match the Overtime dashboard mock. Compose like Leave Management (`CommonManagerHeader` + count cards + section).

```
┌─ CommonManagerHeader ─────────────────────────────────────────┐
│ Overtime                                                      │
│ OT requests, additional duty forms and approvals              │
│                                          [ + New OT Request ] │
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
| `header-actions.tsx` | **+ New OT Request** stub dialog |
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

Phase 0: button opens a stub dialog. Fields do not persist.

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

---

## 3. Suggested folders

```
app/(dashboard)/(overtime)/overtime-requests/
  page.tsx
  header-actions.tsx
  section-ot-summary.tsx
  section-ot-requests.tsx
  record-actions.tsx
  sample-data.ts
  add/page.tsx                 # optional; dialog used in Phase 0

# Dynamic phases only
types/overtime.ts
services/overtime-services/
  overtime-request.service.ts
app/actions/overtime-actions/
  overtime-request.actions.ts
lib/mappers/overtime-request-form.mapper.ts
```

Activity log examples: `overtime-requests.visited`, `overtime.request.created`, `overtime.request.approved`. Entity type `OvertimeRequest`.

---

## 4. Permissions (register in Phase 0)

Unmapped routes stay open. Register before shipping the page.

Checklist (same as leave):

1. `types/user-group.ts` → `{ id: 'overtime-requests', name: 'OT Requests' }`
2. `lib/permissions.ts` → `ROUTE_TO_RESOURCE['/overtime-requests'] = 'overtime-requests'`
3. Sidebar `hasAccess('/overtime-requests')` (already present)
4. Page `checkRouteAccess('/overtime-requests')` → `/unauthorized-access`
5. Mutations later: `requirePermission('overtime-requests', action)`
6. Client buttons: `usePermissions().has('overtime-requests', 'edit')`
7. `breadcrumbs.tsx` → `{ path: 'overtime-requests', name: 'OT Requests' }`
8. Grant on Auth User Group; user re-logins

---

## 5. Development phases

**UI first, then dynamic.** Do not start Prisma until Phase 0 screens are accepted.

```
Phase 0: Static UI (sample data)
  → Phase 1: Schema + types
    → Phase 2: CRUD (create / list / update / delete)
      → Phase 3: Approve / reject workflow
        → Phase 4: Live summary cards (hours + cost)
          → Phase 5: Hardening
            → Phase 6: Additional duty (optional v2)
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
| [x] Approve / reject / New OT do not write to the DB |
| [ ] Design accepted before Phase 1 |

**Out of scope:** Prisma models, Zod, cost calculation, filters, export.

---

### Phase 1 — Foundation

**Goal:** Contracts ready for services.

Proposed model (lock before `db push`):

```
Staff 1──* OvertimeRequest
OvertimeRequest
  status: pending | approved | rejected | cancelled
  approverId = Auth User.id (not Staff)
  hours: Float
  otDate, reason, departmentSnapshot?
```

| Topic | Decision (align with leave) |
|-------|------------------------------|
| Approver | Auth **User.id**; optional `approverName` for lists |
| Hours | **Float** (e.g. `4`, `6`, `1.5`) |
| Department | Snapshot string at request time (staff dept can change) |
| Form number | `generateRecordCode` if product wants OT-1 / staff-scoped codes |
| Cost | **Do not store as source of truth in v1** unless rate is specified; derive for cards or defer |

| Done when |
|-----------|
| [ ] `OvertimeRequest` in `schema.prisma` + `prisma generate` |
| [ ] `types/overtime.ts` — statuses, record type, list params |
| [ ] Staff relation added both sides |

---

### Phase 2 — OT Request CRUD

**Goal:** Replace sample rows with real list + create form.

| Layer | Work |
|-------|------|
| Service | list (paged), get, create, update, delete; default `status = pending` |
| Actions | `requirePermission('overtime-requests', …)`; strip client audit fields |
| UI | Wire table; New OT form saves; filters optional (staff / date / status) |

| Done when |
|-----------|
| [ ] Save appears in the register as `pending` |
| [ ] No approve side effects yet |
| [ ] Export / column toggle only if using `CommonDataTable` |

---

### Phase 3 — Approval workflow

**Goal:** Status transitions, same as leave Phase 4 (without entitlement math unless product adds OT balances).

| Layer | Work |
|-------|------|
| Service | `approve` / `reject` / `cancel` in transactions; set `approverId`, `approverName`, `approvedAt` |
| Actions | Permission + activity log per transition |
| UI | Row actions call real actions; `router.refresh()` |

| Done when |
|-----------|
| [ ] Pending → approved / rejected |
| [ ] Invalid double-approve rejected safely |
| [ ] Reject of pending does not invent cost/hours side effects |

---

### Phase 4 — Live summary cards

**Goal:** Replace sample counts.

| Card | Query idea |
|------|------------|
| Pending | `status = pending` count |
| Approved (month) | approved in current calendar month |
| Total OT Hours | sum `hours` of approved (month or all-time — lock this) |
| OT Cost | only when rate rule exists; else keep `—` or hide card |

---

### Phase 5 — Hardening

| Work |
|------|
| [ ] Filters (department / status / date range) via `FilterWrapper` |
| [ ] Auth User Group can grant `overtime-requests` |
| [ ] Smoke: create → approve → cards update |
| [ ] View-only vs edit permission matrix |

---

### Phase 6 — v2 (optional)

| Item | Notes |
|------|--------|
| Additional duty forms | Second nav item; separate model when specified |
| OT types / rates | Needed before trustworthy OT Cost |
| Multi-step approval history | Optional collection, same as leave v2 |
| Attendance link | Later; do not block v1 register |

---

## 6. Domain notes (dynamic phases — do not block UI)

Locked only when Phase 1 starts. Defaults below follow leave:

- Approver is Auth User, not Staff.
- Audit: `createdBy` / `updatedBy` / `approverId` are Auth User ObjectIds — **no** cross-DB Prisma relation.
- Status: `pending` → `approved` \| `rejected` \| `cancelled`.
- Do not put Prisma in pages.

**Open product questions (before Phase 1, not Phase 0):**

1. Hourly rate source for OT Cost (staff payroll, grade table, flat rate)?
2. Who may create vs only approve (staff self-serve vs HR-only)?
3. Form number format?
4. Additional duty — same collection or separate?

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

1. **Do not** start schema/services before Phase 0 UI is accepted.
2. **Do not** put Prisma in pages — services only.
3. Register `/overtime-requests` in `ROUTE_TO_RESOURCE` or the page stays open.
4. Permission changes need re-login (JWT snapshot).
5. Approver is **Auth User.id**; resolve names like Staff / Leave.
6. Do not invent OT cost in Phase 0–3 without a rate rule.
7. Keep approve/reject as no-ops until Phase 3 — same as early leave stubs.

---

## 9. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference
- `apps/hrm/docs/LEAVE_MANAGER_GUIDE.md` — leave phases and UI map (copy this process)
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating
- `apps/hrm/prisma/schema.prisma` — add OT collections in Phase 1
