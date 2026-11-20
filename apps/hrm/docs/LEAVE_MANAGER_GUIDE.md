# Leave Manager — Development Guide

Guidance for building and extending leave features in `apps/hrm`.  
Use with `HRM_DEVELOPMENT_GUIDELINES.md` (layered architecture) and `PERMISSION_FLOW.md` (Auth User Group grants).

**Status:** Types, Entitlements, Application, Management, Process Shift, and Process Lieu Shift Phase A+B live. In-app Guide at `/leave`.  
**Next:** Phase 5b + export columns done. Remaining checklist: **§11** (smoke / permissions).  
**Build path:** Follow **§6 Development phases** (Phase 0 → 7 for v1; Phase 8 optional).

---

## 1. Product surfaces

| Route | Resource key | Role |
|-------|----------------|------|
| `/leave` | any leave `view` | In-app **Guide** (module order, Process Shift / Lieu flow) — same pattern as `/attendance`, `/payroll`, `/roster-shifts` |
| `/leave-types` | `leave-types` | Master data for leave categories; **Add Lieu** path for the single `isLieuLeave` type |
| `/leave-entitlement` | `leave-entitlement` | Per-staff entitlements (date range) + balance |
| `/leave-application` | `leave-application` | Create/edit forms + application register |
| `/leave-management` | `leave-management` | Approvals, balances overview, calendar, gate pass (UI shell) |
| `/leave-requests` | `leave-requests` | Reserved; prefer `leave-application` for the form flow |

**Guide access:** page allows view on any of `leave-types` \| `leave-entitlement` \| `leave-application` \| `leave-management`. Route map `/leave` → `leave-application` for `canAccessRoute` (sidebar shows Guide when any leave resource is granted).

Sidebar: **Leave Management → Leave** collapsible → **Guide** (first), Types, Entitlement, Application, Management.

---

## 2. Domain models (`prisma/schema.prisma`)

```
Staff 1──* LeaveEntitlement *──1 LeaveType
Staff 1──* LeaveApplication *──1 LeaveType
LeaveApplication
  └─ shifts[] (embedded LeaveApplicationShift)
  └─ optional lieuShiftId / lieuShiftLabel (soft link to RosterAllocation)
LieuLeaveGrant (ledger: allocationId → Lieu entitlement credit)
```

| Model | Purpose |
|-------|---------|
| **LeaveType** | Code, name, paid/approval/half-day/carry-forward policy, `status` 0\|1, **`isLieuLeave`** (at most one type, any status; grants need published) |
| **LeaveEntitlement** | Unique `(staffId, leaveTypeId, fromDate, toDate)`; stored `entitled` / `used` / `remaining` / `carryForward` (`Float`) |
| **LeaveApplication** | Form + workflow; `formNumber` unique; `days` Float; optional `halfDaySession` (`AM`\|`PM`); status workflow; optional `lieuShiftId` / `lieuShiftLabel` |
| **LeaveApplicationShift** | Embedded rows from Process Shift (label + from/to) |
| **LieuLeaveGrant** | One row per granted allocation; PH sync credits/reverses Lieu entitlement (+1 / reverse) |

### Locked product decisions

| Topic | Decision |
|-------|----------|
| Approver | `approverId` = Auth **User.id** (not Staff). Optional `approverName` denormalized for lists |
| Entitlement usage | **Store** `used` / `remaining`; update in a transaction on approve / cancel-after-approve |
| Entitlement period | **From / To dates** (`fromDate`, `toDate`) — not calendar year |
| Day precision | **Float** — whole and half days (`0.5`, `1`, `1.5`). Prefer multiples of `0.5` in Zod |
| Out with cancel | Independent **`outWithCancel` boolean** — not derived from `status === 'cancelled'` |
| CF policy storage | `carryForwardAllowed: false` → **`maxCarryForwardDays = null`** (N/A), not `0`. `0` means CF allowed with a zero max |
| Entitlement caps | On create/update: `entitled ≤ maxDaysPerYear` (when set); if CF off → `carryForward = 0`; if CF on → `carryForward ≤ maxCarryForwardDays` (when set) |
| Lieu type UI | Same `/leave-types` register. **Add New** = normal (no Lieu switch). **Add Lieu** only if none exists → `/leave-types/add-lieu`. If exists → **Edit Lieu (code)**. Cannot convert normal ↔ Lieu via edit |
| Lieu type policy | Paid Yes; half-day No; CF No + max CF null; **no max days/year** (bank from PH grants) |
| Lieu on Entitlement | **Exclude** Lieu from entitlement form leave-type dropdown. Manual create/edit of Lieu entitlements is **blocked** (service). PH Grant Lieu creates/credits the calendar-year bank. Register / balances / filters may still show Lieu rows (read-only; no Edit) |
| Delete guards | Leave Type / Entitlement / Application / LieuGrant FKs use **`onDelete: Restrict`** + service asserts. Prefer unpublish Leave Type when in use |
| Application delete | Hard-delete only **`pending` \| `rejected` \| `cancelled`**. **Block** hard-delete of **`approved`** — use **Cancel** (reverses `used`). Bulk delete same policy |
| `requiresApproval` | **`false` (No):** on create, auto-approve in the same transaction (deduct entitlement; approver = acting user). **`true` (Yes):** stay `pending` until Management/row approve. Field is live on Leave Type; wire-up is Phase 5b |
| Worked while on leave | Roster **INT-L2** soft warn + Continue when duty overlaps pending/approved leave. Leave approve/auto-approve: soft warn + Continue if published/amended duties already exist in range. **No auto reverse** from roster/attendance — if leave should not stand, HR **Cancels** the application manually |
| Year-end rollover | **Out of scope** for Types/Entitlement v1 — `maxCarryForwardDays` caps brought-in CF on the **next** period when that flow is built later |

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

- On **approve** (or **auto-approve** when leave type `requiresApproval = false`): `used += application.days`, recompute `remaining` for the entitlement whose period covers the application (staff + leave type + date overlap).
- On **cancel** (if previously approved): subtract days; do not go below `0`. **Cancel** is the only undo for spent leave.
- Reject of a pending app: no entitlement change.
- Delete of `pending` / `rejected` / `cancelled`: no `used` change (pending reserve drops because those apps disappear).
- **Do not** hard-delete `approved` without reversing `used` — block delete; force Cancel first.
- Form balance card / snapshots auto-sync from live entitlement. Thin **Recalculate** on the Leave Balance card refreshes staff + type balances from live entitlements (does not change Save rules; days still follow form dates; snapshots write on Save only).

#### Caps from Leave Type (entitlement create/update)

| Rule | When |
|------|------|
| `entitled ≤ maxDaysPerYear` | `maxDaysPerYear` is not null |
| `carryForward` must be `0` | `carryForwardAllowed` is false |
| `carryForward ≤ maxCarryForwardDays` | CF allowed and `maxCarryForwardDays` is not null |

`maxCarryForwardDays` is **not** extra days inside the same from–to window; it caps days brought into a period as `carryForward` (typically after a prior period ends).

#### Delete restrictions

| Record | Block delete when |
|--------|-------------------|
| Leave Type | Any entitlement, application, or `LieuLeaveGrant` for that type |
| Leave Entitlement | Any `LieuLeaveGrant` on that row, or pending/approved application for same staff + type overlapping the entitlement period |
| Leave Application | Status is **`approved`** (use Cancel). Allow delete for **`pending` \| `rejected` \| `cancelled`** only. Bulk delete: same allow-list; fail or skip any `approved` in the selection |

### 3.2 Application days

- **Full-day mode:** inclusive calendar days from `fromDate`/`toDate` (whole days only; no 2.5 yet).
- **Half-day mode** (when leave type `allowHalfDay`): single date + required session `AM` (Morning) / `PM` (Afternoon); store `days = 0.5`, `halfDaySession`, and equal `fromDate`/`toDate`.
- Form **Recalculate** refreshes live balance UI only. `entitleSnapshot` / `utilizedSnapshot` / `balanceSnapshot` are written on **Save** from the current card — audit only, not source of truth.

### 3.3 Process Shift / Lieu Shift

- **Process Shift:** Loads that staff’s **published / amended** `RosterAllocation` duties for the leave `fromDate`–`toDate` (half-day filters via AM/PM overlap). Table shows Shift / Dept / From / To; Shift links to Duty Roster (`?dutyDate&staffId&allocationId`) when the user has Roster access. Fills embedded `shifts[]` (label, times, department, allocationId) as a **read-only snapshot** on Save — does **not** create/edit/delete roster cells.
- **Process Lieu Shift** answers a different question: which **already-worked** duty (usually public-holiday) this leave is **in return for**.

#### Locked — Process Lieu Shift (Nov 2026)

| Topic | Decision |
|-------|----------|
| Source duties | Staff’s allocations with **`grantLieuLeave = true`** and status ∈ `published` \| `amended` \| `approved` |
| Window | **`LIEU_SOURCE_LOOKBACK_DAYS` (90) civil days** before leave `fromDate` (Asia/Colombo); duty date **&lt; fromDate**. Require leave date(s) first — constant in `types/leave.ts` |
| Cardinality | **One** lieu source per leave application (`lieuShiftId` + `lieuShiftLabel`) |
| Reuse | **No** — one allocation → at most one leave app with status `pending` or `approved`. Cancel / reject frees it. Save re-validates |
| Phase A | Pick + snapshot only (button loads options → combobox → Save). **No** entitlement / roster write |
| Phase B | See locked table below |

`LeaveType` / `LeaveEntitlement` do **not** need redesign for Phase A.

#### Locked — Process Lieu Shift Phase B (Nov 2026)

| Topic | Decision |
|-------|----------|
| Leave type | `LeaveType.isLieuLeave`. **At most one** Lieu type (any status). UI: **Add Lieu** / edit Lieu form (no Lieu switch on normal Add/Edit). Locked Lieu policy: paid=yes, half-day=no, CF=off, no max days/year |
| Grant moment | When allocation has `grantLieuLeave` and status ∈ `published` \| `amended` \| `approved` — **once** per allocation (`LieuLeaveGrant` ledger) |
| Entitlement period | Calendar year of duty date (Asia/Colombo): **1 Jan–31 Dec**; create/find Lieu entitlement for that staff/year. In-app Leave Guide §C documents this; PH form shows a preview card when Grant Lieu is on |
| Grant amount | **+1.0** day to `entitled` (recompute `remaining`) |
| Application | `lieuShiftId` only with Lieu leave type; Lieu type **requires** `lieuShiftId`. Approve consumes Lieu entitlement as today |
| Reverse | Un-flag / ineligible status / delete duty: reverse unused grant (`entitled -= days`) if no **approved** leave linked to that allocation. Pending leave with that `lieuShiftId` is cleared on reverse. Cancel-after-approve restores `used` as existing leave rules |

### 3.4 Out with cancel

Filter list and form control use the boolean field. Status remains the workflow field.

### 3.5 Approval required (`LeaveType.requiresApproval`)

| Value | Behaviour (Phase 5b) |
|-------|----------------------|
| **Yes** (`true`) | Create → `pending`. Approver field as today. Deduct entitlement only on approve |
| **No** (`false`) | Create → **auto-approve** in one transaction (same deduct + `approverId`/`approvedAt` as approve; acting user as approver). Approver control optional/hidden on form. Edit remains pending-only |

### 3.6 Leave vs roster duty overlap

| Direction | Behaviour |
|-----------|-----------|
| Duty written when pending/approved leave covers that day | Roster **INT-L2**: soft warn + Continue (already live). Cell `isLeave` ≠ Leave Application |
| Approve / auto-approve when published/amended duties already exist in leave range | Leave soft warn + Continue (Phase 5b) |
| Staff actually worked and leave should not count | **Manual Cancel** on the leave application — restores `used`. Roster/attendance must **not** auto-cancel or auto-refund leave |

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
| **5** | Application UX polish | Process Shift / Lieu, half-day, balance card, edit via row |
| **5b** | Application finish | Delete policy, auto-approve, duty soft-warn, Recalculate (auto-sync + thin button) |
| **6** | Leave Management | Real pending/balances/calendar queries |
| **7** | Hardening | Permissions matrix, exports, smoke, bulk delete policy |
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
| [x] Separate Add Lieu path; normal form has no Lieu switch; single Lieu type + locked Lieu policy |

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
| [x] Caps from Leave Type on create/update (`maxDaysPerYear` / CF rules); CF field when allowed |
| [x] Delete blocked when entitlement in use (lieu grants or pending/approved overlapping apps) |

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

**Note:** Process Shift reads published/amended roster duties into embedded `shifts[]` on Save. Process Lieu Shift reads `grantLieuLeave` duties into `lieuShiftId` / label. Entitlement credit happens on the Roster PH grant (Phase B), not on picking the lieu shift.

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
| [x] Approve increases `used` and decreases `remaining` for the matching staff/type/period entitlement |
| [x] Cancel after approve reverses usage (floor at 0) |
| [x] Reject pending does not change entitlement |
| [x] Double-approve / invalid transition is rejected safely |

**Blocks:** Trustworthy management dashboard numbers.

---

### Phase 5 — Application UX polish

**Goal:** Form behaviours match product screens.

| Work |
|------|
| [x] Process Shift → populate `shifts[]` from published/amended roster duties |
| [x] Process Lieu Shift Phase A → load `grantLieuLeave` duties → `lieuShiftId` / label (unique; 90-day window) |
| [x] Process Lieu Shift Phase B → `LeaveType.isLieuLeave` + `LieuLeaveGrant` ledger; PH sync grant/reverse; Lieu type required with lieu shift |
| [x] Leave Balance card on form from live entitlement aggregate (auto-sync; snapshots on save) |
| [x] Edit flow: row Edit → load left form (pending only). Staff-code → **View** dialog (not edit) |
| [x] Half-day mode: checkbox + single date + Morning/Afternoon (`halfDaySession`); no multi-day fractions yet |
| [x] Recalculate — keep auto-sync + thin **Recalculate** on Leave Balance card (refresh live balances; Save still owns snapshots) |

---

### Phase 5b — Leave Application finish (upcoming)

**Goal:** Close correctness gaps before calling Application “done”. Implement in this order.

#### A — Correctness

| Work |
|------|
| [x] Delete only `pending` \| `rejected` \| `cancelled`; **block** hard-delete of `approved` (UI + service) |
| [x] Bulk delete same allow-list; clear error if selection includes `approved` |
| [x] Entitlement: allowed deletes do not change `used`; **Cancel** remains the only undo for approved |
| [x] `requiresApproval = false` → create auto-approves + deducts in one transaction; approver = acting user |
| [x] Approver display shows auto-on-save hint when type does not require approval (read-only field) |
| [x] Activity log for auto-approve (`leave.application.auto_approved`) |

#### B — Leave ↔ duty overlap

| Work |
|------|
| [x] Soft warn + Continue on **approve** / **auto-approve** when published/amended duties already exist in the leave date range |
| [x] Worked-on-leave remediation: **manual Cancel** only — no auto reverse from roster or attendance (documented) |
| [x] Roster INT-L2 soft warn + Continue (already live) — Continue ≠ cancel leave |

#### C — Polish / checklist catch-up

| Work |
|------|
| [x] Decide Recalculate: auto-sync + thin button; update form + this guide |
| [x] Document staff-code = View; edit = row action only (Phase 5) |
| [x] Multi-day fractions (`2.5`) stay **out of v1** |

#### D — Hardening (overlaps Phase 7)

| Work |
|------|
| [x] Export columns match live fields (application + leave types; entitlement already aligned) |
| [ ] Smoke: type (approval Yes/No) → entitlement → apply → approve/auto-approve → cancel → delete pending |
| [ ] Permission matrix: view-only vs full CRUD on `leave-application` |

**Defer (not Phase 5b):** year-end CF rollover; gate pass / Phase 8; auto-refund leave when Present punch exists.

---

### Phase 6 — Leave Management dashboard

**Goal:** Replace placeholders with queries on real applications/entitlements.

| Work |
|------|
| [x] Count cards (on leave today, pending, approved/rejected month) |
| [x] Pending approvals list → Phase 4 actions |
| [x] My leave balances (session user’s staff link via Auth `User.staffId`) |
| [x] Calendar from approved applications in range |
| [x] Gate pass — keep placeholder until Phase 8 |

---

### Phase 7 — Hardening

| Work |
|------|
| [x] Bulk delete applications — policy from Phase 5b (`pending` \| `rejected` \| `cancelled` only) |
| [x] Export columns match live fields (application: half-day + lieu + datetimes; leave types: Lieu + audit) |
| [ ] Auth User Group can grant all leave resources (HRM matrix or extended Channeling RESOURCES) |
| [ ] Smoke: create type → entitlement → apply → approve / auto-approve → cancel → balances |
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
  leave-management.service.ts
  lieu-leave-grant.service.ts

app/actions/leave-actions/
  leave-type.actions.ts
  leave-entitlement.actions.ts
  leave-application.actions.ts
  leave-management.actions.ts

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
9. **Do not** credit Annual (or any non-`isLieuLeave` type) from PH Grant Lieu — only the Lieu leave type bank. Do not put Lieu = Yes on Annual — use **Add Lieu**.
10. Grant Lieu on Roster ≠ Leave Application; spending requires Process Lieu Shift + approve.
11. **Do not** store `maxCarryForwardDays = 0` to mean “CF off” — use `carryForwardAllowed: false` and `null`.
12. **Do not** delete Leave Types / Entitlements that are in use — unpublish or clear dependents first (`onDelete: Restrict` + service asserts).
13. **Do not** hard-delete **approved** leave applications — **Cancel** first so `used` / `remaining` reverse.
14. **Do not** treat Roster INT-L2 Continue as cancelling leave — if staff worked and leave should not count, Cancel from Leave Application / Management.
15. **Do not** leave `requiresApproval = false` as display-only — Phase 5b must auto-approve on create.

---

## 10. Related docs

- `apps/hrm/docs/HRM_DEVELOPMENT_GUIDELINES.md` — architecture, Staff reference, workflow
- `apps/hrm/docs/OVERTIME_MANAGER_GUIDE.md` — UI-first shell, then dynamic phases
- `apps/hrm/docs/ROSTER_SHIFTS_MANAGER_GUIDE.md` — Shift Roster; cell `isLeave` ≠ Leave Application. **INT-L2 (done):** soft warn + Continue when leave overlaps duty day; **Continue ≠ cancel leave** (manual Cancel in Leave if entitlement should reverse). **Lieu:** PH `grantLieuLeave` → `LieuLeaveGrant` → Lieu entitlement; spend via Process Lieu Shift. See also `HR_ADMINISTRATION_GUIDE.md` §32.
- `apps/hrm/docs/PERMISSION_FLOW.md` — route/resource gating and Auth grants
- `apps/hrm/prisma/schema.prisma` — source of truth for leave collections

---

## 11. Remaining work (this phase vs next)

Types, Entitlement, Application (incl. Phase 5b A+B), Management, and Lieu grant/spend are live. Split below is what is left for production close-out vs deferred product work.

### 11.1 This phase (finish leave v1 / production)

| # | Task | Where |
|---|------|--------|
| 1 | **Smoke** — type (approval Yes/No) → entitlement → apply → approve / auto-approve → cancel → delete pending → balances correct | Cross-module |
| 2 | **Lieu smoke** — Add Lieu type → PH Grant Lieu → bank +1 → Process Lieu Shift apply → approve → bank −1; reverse grant paths | Lieu + PH + Application |
| 3 | **Permission matrix** — view-only vs full CRUD for leave resources | Types / Entitlement / Application / Management |
| 4 | **Auth User Group** can grant all leave resources (`leave-types`, `leave-entitlement`, `leave-application`, `leave-management`) | Permissions |

**Done this close-out:** Recalculate; export columns aligned to live fields. Remaining is smoke + permissions.

### 11.2 Next phase (after v1 / deferred)

| # | Task | Notes |
|---|------|--------|
| 1 | **Year-end carry-forward rollover** | Entitlement / CF policy automation |
| 2 | **Gate pass** model + Management section | Phase 8 |
| 3 | **Shift / roster masters** + optional FKs on application | Keep label snapshots |
| 4 | **Approval history** collection | Audit trail beyond current status fields |
| 5 | **Financial-year helpers** | Only if product needs FY labels on top of from/to |
| 6 | **Multi-day fractions** (e.g. `2.5` days) | Explicitly out of v1 |
| 7 | **Auto-refund leave** when Present punch exists | No auto reverse from attendance |
| 8 | **`sendToPayroll`** engine wiring | Still flag-only on PH duties |

**Rule of thumb:** anything needed to trust balances and ship leave to production → §11.1. Policy automation, gate pass, and deeper integrations → §11.2.
