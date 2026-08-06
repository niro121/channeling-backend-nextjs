# Leave Manager — Development Guide

Guidance for building and extending leave features in `apps/hrm`.  
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).

**Status:** Prisma models exist; UI is largely sample-data / stubs. Wire services → actions → UI next.

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/leave-types` | `leave-types` | Master data for leave categories |
| `/leave-entitlement` | `leave-entitlement` | Per-staff yearly entitlements + balance |
| `/leave-application` | `leave-application` | Create/edit forms + application register |
| `/leave-management` | `leave-management` | Approvals, balances overview, calendar, gate pass (UI shell) |
| `/leave-requests` | `leave-requests` | Reserved; prefer `leave-application` for the form flow |

Sidebar: **Leave Management → Leave** collapsible in `desktop-sidebar.tsx`.

---

## 2. Domain models (`prisma/schema.prisma`)

```
Staff 1──* LeaveEntitlement *──1 LeaveType
Staff 1──* LeaveApplication *──1 LeaveType
LeaveApplication
  └─ shifts[] (embedded LeaveApplicationShift)
```

| Model | Purpose |
|-------|---------|
| **LeaveType** | Code, name, paid/approval/half-day/carry-forward policy, `status` 0\|1 |
| **LeaveEntitlement** | Unique `(staffId, leaveTypeId, year)` — calendar year; stored `entitled` / `used` / `remaining` / `carryForward` (`Float`) |
| **LeaveApplication** | Form + workflow; `formNumber` unique; `days` Float; status workflow |
| **LeaveApplicationShift** | Embedded rows from Process Shift (label + from/to) |

### Locked product decisions

| Topic | Decision |
|-------|----------|
| Approver | `approverId` = Auth **User.id** (not Staff). Optional `approverName` denormalized for lists |
| Entitlement usage | **Store** `used` / `remaining`; update in a transaction on approve / cancel-after-approve |
| Year | **Calendar year** (`year: Int`, e.g. 2026) |
| Day precision | **Float** — whole and half days (`0.5`, `1`, `1.5`). Prefer multiples of `0.5` in Zod |
| Out with cancel | Independent **`outWithCancel` boolean** — not derived from `status === 'cancelled'` |

### Application status

`pending` → `approved` | `rejected` | `cancelled`

### Audit fields

`createdBy` / `updatedBy` / `approverId` are Auth User ObjectIds — **no** cross-DB Prisma relation. Resolve display names via existing Auth helpers (same as Staff).

### Sequence

Use `Sequence` with a scope such as `leave-application` to allocate `formNumber` (same pattern as other coded entities).

---

## 3. Business rules (implement in services)

### 3.1 Entitlement balance

```
remaining = entitled + carryForward - used
```

- On **approve**: `used += application.days`, recompute `remaining` (same staff/type/year as `fromDate`’s calendar year).
- On **cancel** (if previously approved): subtract days; do not go below `0`.
- Reject of a pending app: no entitlement change.
- Optional **Recalculate** repair: recompute `used` from approved applications for that entitlement.

### 3.2 Application days

- Compute from `fromDate`/`toDate` (and half-day rules when enabled on `LeaveType`).
- Form “Recalculate” may also set `entitleSnapshot` / `utilizedSnapshot` / `balanceSnapshot` from current entitlement — snapshots are audit only, not source of truth.

### 3.3 Process Shift / Lieu Shift

- **v1:** Fill embedded `shifts[]` and optional `lieuShiftId` / `lieuShiftLabel` (stubs until Shift masters exist).
- **Later:** Add optional `shiftId` FKs; **keep** labels/from/to as historical snapshots so old apps stay readable if a shift is renamed/deleted.

`LeaveType` / `LeaveEntitlement` do **not** need redesign when Shift models land.

### 3.4 Out with cancel

Filter list and form control use the boolean field. Status remains the workflow field.

---

## 4. UI map (current)

### Leave Application (`/leave-application`)

```
┌─ ~35% ─────────────────┐  ┌─ ~65% ──────────────────────────────┐
│ Leave Form Details     │  │ Title + Back to Leave Entitlement   │
│ (Formik)               │  │ Filter card (FilterWrapper)         │
│ + Leave Balance card   │  │ CommonDataTable + export/bulk delete│
└────────────────────────┘  └─────────────────────────────────────┘
```

Key files under `app/(dashboard)/(leave)/leave-application/`:

| File | Role |
|------|------|
| `page.tsx` | Access check, filters, compose layout |
| `form-leave-details.tsx` | Left form + balance card |
| `section-leave-form-list.tsx` | Right list shell |
| `filter-section.tsx` | Staff, dateSearchBy, range, type, approver, outWithCancel |
| `columns.tsx` / `record-actions.tsx` / `view-dialog.tsx` / `staff-code-cell.tsx` | Table UX |

Filter **date search by**: `created` | `approved` | `shift` applies From/To to that field.

### Leave Entitlement

Filter card → employee form + leave balance section → entitlement register table.

### Leave Management

Count cards → pending approvals + my balances → calendar + gate pass (mostly placeholders).

---

## 5. Permissions

Resources already in `types/user-group.ts`:

- `leave-types`, `leave-entitlement`, `leave-application`, `leave-management` (+ `leave-requests` reserved)

Routes mapped in `lib/permissions.ts` → `ROUTE_TO_RESOURCE`.

**Granting access:** Auth **User Group** permissions in `@archmage/db-auth` — not Channeling domain permissions.  
Channeling’s User Groups UI currently lists Channeling `RESOURCES` only; HRM leave keys may need HRM admin UI or an extended matrix. See `PERMISSION_FLOW.md`.

Checklist per new leave page:

1. `RESOURCES` + `ROUTE_TO_RESOURCE`
2. Sidebar `hasAccess`
3. Page `checkRouteAccess` → `/unauthorized-access`
4. Mutations: `requirePermission(resource, action)`
5. Client buttons: `usePermissions().has(...)`
6. Grant on User Group; user re-logins

---

## 6. Layered implementation order

Follow Staff pattern:

```
UI → Server Actions → Services (Zod + Prisma) → MongoDB
```

Recommended build order:

1. **LeaveType** CRUD (service + actions + simple manager page)
2. **LeaveEntitlement** CRUD + balance reads
3. **LeaveApplication** create/update/list + Sequence `formNumber`
4. Approve / reject / cancel actions that adjust entitlement `used`
5. Replace sample data in existing leave UIs
6. Management dashboard queries (pending, calendar from approved apps)
7. Later: GatePass, Shift masters, approval history

### Suggested folders

```
services/leave-services/
  leave-type.service.ts
  leave-entitlement.service.ts
  leave-application.service.ts

app/actions/leave-actions/
  leave-type.actions.ts
  leave-entitlement.actions.ts
  leave-application.actions.ts

types/leave.ts
lib/mappers/leave-*.mapper.ts   # when forms are non-trivial
```

Activity log examples: `leave.application.created`, `leave.application.approved`, entityType `LeaveApplication`.

---

## 7. Shared utilities

| Utility | Use |
|---------|-----|
| `@/lib/utils/date` → `formatDateTime` | Created / Updated / Approved columns |
| `@/app/(dashboard)/filter-wrapper` | URL-driven filters; Search + Clear stay in one nowrap group |
| `CommonDataTable` | Register tables; `haveBulkDelete` + server actions only (no inline non-server fns across RSC boundary) |

---

## 8. Deferred / v2

| Item | Notes |
|------|--------|
| Gate pass requests | Management section; separate model when specified |
| Multi-step approval history | Optional `LeaveApproval` collection |
| Staff / roster Shift masters | Link via optional FKs; keep application snapshots |
| Financial year entitlements | Not in v1 — calendar year only |

---

## 9. Pitfalls

1. **Do not** derive `outWithCancel` from `status`.
2. **Do not** put Prisma in pages — services only.
3. Approver is **Auth User.id**; resolve names like Staff audit.
4. Updating entitlement without a transaction on approve can drift `used` / `remaining`.
5. Unmapped routes stay open in `canAccessRoute` — always register leave routes.
6. Permission changes need re-login (JWT snapshot).
7. When Shift models arrive, prefer additive FKs + keep labels — don’t wipe historical shift text on old applications.

---

## 10. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference, workflow
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating and Auth grants
- `apps/hrm/prisma/schema.prisma` — source of truth for leave collections
