# Leave Manager — Development Guide

Guidance for building and extending leave features in `apps/hrm`.  
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).

**Status:** Phase 0–2 Leave Types + Entitlements CRUD live; application UI still sample stubs.  
**Build path:** Follow **§6 Development phases** (Phase 0 → 7 for v1; Phase 8 optional).

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/leave-types` | `leave-types` | Master data for leave categories |
| `/leave-entitlement` | `leave-entitlement` | Per-staff entitlements (date range) + balance |
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
| **LeaveEntitlement** | Unique `(staffId, leaveTypeId, fromDate, toDate)`; stored `entitled` / `used` / `remaining` / `carryForward` (`Float`) |
| **LeaveApplication** | Form + workflow; `formNumber` unique; `days` Float; optional `halfDaySession` (`AM`\|`PM`); status workflow |
| **LeaveApplicationShift** | Embedded rows from Process Shift (label + from/to) |

### Locked product decisions

| Topic | Decision |
|-------|----------|
| Approver | `approverId` = Auth **User.id** (not Staff). Optional `approverName` denormalized for lists |
| Entitlement usage | **Store** `used` / `remaining`; update in a transaction on approve / cancel-after-approve |
| Entitlement period | **From / To dates** (`fromDate`, `toDate`) — not calendar year |
| Day precision | **Float** — whole and half days (`0.5`, `1`, `1.5`). Prefer multiples of `0.5` in Zod |
| Out with cancel | Independent **`outWithCancel` boolean** — not derived from `status === 'cancelled'` |

### Application status

`pending` → `approved` | `rejected` | `cancelled`

### Audit fields

`createdBy` / `updatedBy` / `approverId` are Auth User ObjectIds — **no** cross-DB Prisma relation. Resolve display names via existing Auth helpers (same as Staff).

### Sequence

Form numbers use `generateRecordCode(staffCode)` → e.g. `ST-1-1`, `ST-1-2` (same Sequence pattern as Staff / Leave Type codes).

---

## 3. Business rules (implement in services)

### 3.1 Entitlement balance

```
remaining = entitled + carryForward - used
```

- On **approve**: `used += application.days`, recompute `remaining` for the entitlement whose period covers the application (staff + leave type + date overlap).
- On **cancel** (if previously approved): subtract days; do not go below `0`.
- Reject of a pending app: no entitlement change.
- Optional **Recalculate** repair: recompute `used` from approved applications for that entitlement.

### 3.2 Application days

- **Full-day mode:** inclusive calendar days from `fromDate`/`toDate` (whole days only; no 2.5 yet).
- **Half-day mode** (when leave type `allowHalfDay`): single date + required session `AM` (Morning) / `PM` (Afternoon); store `days = 0.5`, `halfDaySession`, and equal `fromDate`/`toDate`.
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

## 6. Development phases (build in order)

Do **not** skip ahead: each phase depends on the previous one. Within a phase, follow Staff layering:

```
Types/Zod → Service → Actions (permissions + activity log) → UI → Smoke test
```

Push schema to Mongo when starting Phase 0 if collections are not live yet: `npx prisma db push` from `apps/hrm`.

### Phase checklist overview

| Phase | Name | Outcome |
|-------|------|---------|
| **0** | Foundation | DB + shared leave types; client generated |
| **1** | Leave Types | Master CRUD live |
| **2** | Entitlements | Per-staff date-range balances CRUD + register UI wired |
| **3** | Applications (CRUD) | Create/list/update/delete + filters; form numbers |
| **4** | Workflow | Approve / reject / cancel updates entitlement `used` |
| **5** | Application UX polish | Recalculate, shifts stubs, balance card, view/edit flows |
| **6** | Leave Management | Real pending/balances/calendar queries |
| **7** | Hardening | Permissions matrix, exports, bulk delete, activity logs |
| **8** | v2 (optional) | Gate pass, shift masters, approval history |

---

### Phase 0 — Foundation

**Goal:** Schema and shared contracts ready for services.

| Done when |
|-----------|
| [x] `LeaveType` / `LeaveEntitlement` / `LeaveApplication` in schema (already added) |
| [x] `prisma generate` (+ `db push` on target env) |
| [x] `types/leave.ts` — shared statuses, day helpers, payload types |
| [x] Sequence scope decided: `LEAVE_APPLICATION_FORM_SCOPE` (`leave-application`) for form numbers; leave-type codes use `generateRecordCode('LT')` |

**Out of scope:** UI changes.

---

### Phase 1 — Leave Types manager

**Goal:** HR can maintain Annual / Casual / Medical / etc.

| Layer | Work |
|-------|------|
| Service | `leave-type.service.ts` — list (paged), get, create, update, soft/hard status |
| Actions | `leave-type.actions.ts` — `requirePermission('leave-types', …)` |
| UI | `/leave-types` list + add/edit (Staff-like or simple form); sidebar already reserved |
| Permissions | Grant `leave-types` on Auth User Group for testers |

| Done when |
|-----------|
| [x] Non-admin with view/add/edit/delete works end-to-end *(grant `leave-types` on User Group before testing)* |
| [x] Active types appear as options for later phases (`getLeaveTypeOptions`) |
| [x] Activity log on create/update/delete |

**Blocks:** Phase 2–3 dropdowns.

---

### Phase 2 — Leave Entitlement

**Goal:** Assign entitlements by date range; show register + balance.

| Layer | Work |
|-------|------|
| Service | CRUD; enforce `@@unique([staffId, leaveTypeId, fromDate, toDate])`; compute `remaining` on write |
| Actions | Entitlement actions + permission `leave-entitlement` |
| UI | Replace sample data on `/leave-entitlement` (filter, form, table, balance section) |

| Done when |
|-----------|
| [x] Create/edit entitlement for a staff + type + from/to dates |
| [x] Duplicate unique key surfaces a clear error |
| [x] Balance cards reflect `entitled` / `used` / `remaining` (used may still be 0 until Phase 4) |

**Blocks:** Meaningful application balance / approve.

---

### Phase 3 — Leave Application CRUD

**Goal:** Persist applications; wire left form + right list without approval side effects yet.

| Layer | Work |
|-------|------|
| Service | Create/update/list/get/delete; allocate `formNumber` via Sequence; compute `days`; store `outWithCancel`, snapshots optional |
| Actions | `leave-application` permissions; strip client audit fields |
| UI | `/leave-application` — form save/clear/delete; filters; table; view dialog; staff-code link |

| Done when |
|-----------|
| [x] New application appears in register after Save |
| [x] Filters (staff, type, dates by mode, approver, outWithCancel) hit the DB |
| [x] Export / column toggle work against real rows |
| [x] Status stays `pending` on create (no entitlement change yet) |

**Note:** Process Shift / Lieu may still write stub embedded data; full roster not required.

---

### Phase 4 — Approval workflow

**Goal:** Status transitions keep entitlement `used` / `remaining` correct.

| Layer | Work |
|-------|------|
| Service | `approve` / `reject` / `cancel` in **transactions**; set `approverId` + `approverName` + `approvedAt` |
| Actions | Permission checks; activity log per transition |
| UI | Management pending list + application row actions (approve/reject/cancel) |

| Done when |
|-----------|
| [ ] Approve increases `used` and decreases `remaining` for the matching staff/type/period entitlement |
| [ ] Cancel after approve reverses usage (floor at 0) |
| [ ] Reject pending does not change entitlement |
| [ ] Double-approve / invalid transition is rejected safely |

**Blocks:** Trustworthy management dashboard numbers.

---

### Phase 5 — Application UX polish

**Goal:** Form behaviours match product screens.

| Work |
|------|
| [ ] Recalculate → entitlement snapshots + days |
| [ ] Process Shift → populate `shifts[]` (rules as agreed; stub OK) |
| [ ] Process Lieu Shift → `lieuShiftId` / label |
| [ ] Leave Balance card on form from live entitlement aggregate |
| [ ] Edit flow: select row / staff code → load form |
| [x] Half-day mode: checkbox + single date + Morning/Afternoon (`halfDaySession`); no multi-day fractions yet |

---

### Phase 6 — Leave Management dashboard

**Goal:** Replace placeholders with queries on real applications/entitlements.

| Work |
|------|
| [ ] Count cards (on leave today, pending, approved/rejected month) |
| [ ] Pending approvals list → Phase 4 actions |
| [ ] My leave balances (session user’s staff link via Auth `User.staffId`) |
| [ ] Calendar from approved applications in range |
| [ ] Gate pass — keep placeholder until Phase 8 |

---

### Phase 7 — Hardening

| Work |
|------|
| [ ] Bulk delete applications (and policy: only pending?) |
| [ ] Export columns match live fields |
| [ ] Auth User Group can grant all leave resources (HRM matrix or extended Channeling RESOURCES) |
| [ ] Smoke: create type → entitlement → apply → approve → balances |
| [ ] Non-admin permission matrix test (view-only vs full CRUD) |

---

### Phase 8 — v2 (optional, after v1 stable)

| Work |
|------|
| [ ] Gate pass model + Management section |
| [ ] Shift / roster masters; optional FKs on application (keep label snapshots) |
| [ ] Approval history collection |
| [ ] Financial-year helpers (only if product later needs derived FY labels on top of from/to) |

---

### Suggested folders (from Phase 1 onward)

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

**How to use this list:** Finish a phase’s “Done when” before starting the next. Prefer vertical slices (service → action → one UI path) inside each phase rather than building all services first.

---

## 7. Shared utilities

| Utility | Use |
|---------|-----|
| `@/lib/utils/date` → `formatDateTime` | Created / Updated / Approved columns |
| `@/app/(dashboard)/filter-wrapper` | URL-driven filters; Search + Clear stay in one nowrap group |
| `CommonDataTable` | Register tables; `haveBulkDelete` + server actions only (no inline non-server fns across RSC boundary) |

---

## 8. Deferred / v2

See **Phase 8**. Summary:

| Item | Notes |
|------|--------|
| Gate pass requests | Management section; separate model when specified |
| Multi-step approval history | Optional `LeaveApproval` collection |
| Staff / roster Shift masters | Link via optional FKs; keep application snapshots |
| Financial year labels | Optional later — entitlements use from/to dates |

---

## 9. Pitfalls

1. **Do not** derive `outWithCancel` from `status`.
2. **Do not** put Prisma in pages — services only.
3. Approver is **Auth User.id**; resolve names like Staff audit.
4. Updating entitlement without a transaction on approve can drift `used` / `remaining`.
5. Unmapped routes stay open in `canAccessRoute` — always register leave routes.
6. Permission changes need re-login (JWT snapshot).
7. When Shift models arrive, prefer additive FKs + keep labels — don’t wipe historical shift text on old applications.
8. **Do not** start Phase 4 before Phase 2–3 — approvals without entitlements/applications will corrupt or no-op balances.

---

## 10. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference, workflow
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating and Auth grants
- `apps/hrm/prisma/schema.prisma` — source of truth for leave collections
