# HRM App Development Guidelines

Use this document when building or extending features in `apps/hrm`.  
**Staff Manager** (`app/(dashboard)/staff`) is the reference implementation for list + tabbed CRUD managers.

Leave features: see **`LEAVE_MANAGER_GUIDE.md`** (models, UI map, business rules, build order).  
Overtime features: see **`OVERTIME_MANAGER_GUIDE.md`** (UI-first shell, then dynamic phases).  
Roster & Shifts: see **`ROSTER_SHIFTS_MANAGER_GUIDE.md`** (UI-first Shift Roster, then dynamic phases).

Related Channeling docs (patterns only; do not copy Channeling’s single-form staff UI into HRM):

- `apps/channeling/docs/COMPONENT_AUDIT_SKELETON.md`
- `apps/channeling/docs/STAFF_COMPONENT_AUDIT.md`
- `apps/channeling/docs/ROLES_PERMISSIONS_USER_GROUPS_GUIDE.md`

---

## 1. Mental model

HRM is a **separate Next.js app** in the monorepo with its own domain database.

| Concern | Where it lives |
|---------|----------------|
| Auth users, sessions, permissions, API clients | `@archmage/db-auth` (`AUTH_DATABASE_URL`) |
| HRM domain data (Staff, ActivityLog, Sequence, …) | HRM MongoDB (`DATABASE_URL`) via local Prisma |
| Channeling staff (subset of identity fields) | Channeling app + DB, reached over **HTTP public API** |
| Shared UI / types / constants | `@archmage/ui`, `@archmage/shared` |

**Staff is a superset of Channeling staff.**  
Channeling-aligned scalar fields sync both ways. HR-only nested details stay in HRM only.

```
Auth User.staffId  ──────────────►  HRM Staff.id
HRM Staff.migrateSourceId  ◄─────►  Channeling Staff.id
```

---

## 2. Layered architecture (required)

```
UI (pages / Formik forms / DataTable)
  → Server Actions  (permissions, activity log, revalidate, Channeling orchestration)
    → Services      (Zod validation, Prisma / HTTP)
      → HRM MongoDB | Channeling public API | Auth DB (audit name resolution)
```

| Layer | Responsibility | Do **not** |
|-------|----------------|------------|
| **Pages** | Route access, load data, compose layout | Call Prisma or external APIs directly |
| **Forms / TabLayout** | Client validation, map payloads, sync dialogs | Embed business rules that belong in services |
| **Actions** | `requirePermission`, strip audit fields, call services, push/pull Channeling, `logActivityNonBlocking`, `revalidatePath` | Heavy Zod / Prisma logic |
| **Services** | Zod, Prisma CRUD, code generation, HTTP clients | Toast / redirect / permission checks |
| **Mappers / helpers** | Form ↔ payload; Channeling field sets & change detection | Side effects (DB writes) |

---

## 3. Staff Manager reference structure

### 3.1 File layout

```
apps/hrm/
  app/(dashboard)/staff/
    page.tsx                      # List (server component)
    columns.tsx
    record-actions.tsx
    sync-staff-button.tsx
    tab-layout.tsx                # Shared tabs + Save / Save & Close
    general-form.tsx              # Channeling-aligned + hrDetails scalars
    hr-detail-form.tsx            # personnelDetails (+ overlapping identity)
    employment-form.tsx           # employmentDetails (HRM-only)
    additional-detail-content.tsx # Read-only audit
    add/page.tsx
    [id]/edit/page.tsx

  app/actions/staff-actions/
    staff.actions.ts

  services/staff-services/
    staff.service.ts                 # HRM CRUD + Zod
    staff-channeling-push.service.ts # HRM → Channeling orchestration
    channeling-staff-write.service.ts
    channeling-staff.service.ts      # GET list (pull)
    staff-sync.service.ts            # Upsert pull into HRM

  lib/mappers/
    staff-general-form.mapper.ts
    staff-hr-details.mapper.ts
    staff-personnel-details.mapper.ts
    staff-employment-details.mapper.ts

  lib/helpers/
    staff-channeling-fields.helper.ts
    staff-channeling-dialog.helper.ts
    resolve-auth-users.helper.ts

  types/
    staff.ts
    staff-personnel-options.ts
    staff-employment-options.ts
    channeling-staff.ts

  prisma/schema.prisma
  lib/prisma.ts                   # Isolated generated client
```

### 3.2 Tab ownership

| Tab | Enabled when | Owns | Syncs to Channeling? |
|-----|--------------|------|----------------------|
| **General** | Always | Channeling scalars + most `hrDetails` | Yes (dialog-driven) |
| **HR Details** | After create (`isEditPage`) | Identity overlap + `personnelDetails` | Identity fields only (optional) |
| **Employment** | After create | `employmentDetails` only | **No** |
| **Additional Details** | After create | Read-only audit (code, created/updated) | N/A |

**Create flow rule:** user must save **General** first → redirect to `/staff/{id}/edit` → other tabs unlock.

**Shared footer:** `CustomFormSubmitBtns` submits the **active** tab via registered form action bridges. Hide Save on read-only tabs.

### 3.3 Channeling field boundary

Only these fields travel to/from Channeling (`CHANNELING_STAFF_FIELDS`):

`code`, `title`, `name`, `nic`, `dateOfBirth`, `gender`, `contactMobile`, `address`, `dateJoined`, `status`

Everything else (EPF/ETF, personnel, employment/payroll/welfare, legacy code, RFID, emails, etc.) is **HRM-only**.

When adding fields:

1. Decide: Channeling-aligned vs HRM-only.
2. If Channeling-aligned → update helper schema, push mapper, Channeling public API contract, and forms that edit those fields.
3. If HRM-only → Prisma type + HRM form/tab + mapper only. Do **not** push.

---

## 4. How to develop new HRM modules

Use Staff as the template. Prefer the same vertical slice every time.

### 4.1 Decide manager shape

| Shape | When to use | Example |
|-------|-------------|---------|
| **Single form** | Small entity, one payload, no external sync tabs | Future leave type |
| **Tabbed manager** (Staff pattern) | Large entity, multi-domain details, optional external sync | Staff, future Employee profile |

For tabbed managers:

- One `tab-layout.tsx` owns tabs + shared Save.
- Each tab is its own Formik form with `onRegisterActions`.
- Nested data → Prisma embedded types + dedicated update action per tab when payloads differ.

### 4.2 File / route skeleton (new entity)

```
app/(dashboard)/[entity]/
  page.tsx
  columns.tsx
  record-actions.tsx
  filter-section.tsx          # optional
  [entity]-form.tsx           # or tab-layout + *-form.tsx
  add/page.tsx
  [id]/edit/page.tsx

app/actions/[entity]-actions/
  [entity].actions.ts

services/[entity]-services/
  [entity].service.ts
  # optional: *-sync / *-push if external system involved

types/[entity].ts
lib/mappers/[entity]-*.mapper.ts   # when forms are non-trivial
```

Wire the route in:

1. `lib/permissions.ts` → `ROUTE_TO_RESOURCE`
2. Sidebar / mobile nav
3. Auth permission resource (shared permissions model) if new resource name

### 4.3 Checklist — List

- [ ] Server component page; `checkRouteAccess('/[entity]')` + redirect
- [ ] Data via **action → service**; params from URL `searchParams` (`page`, `limit`, `keyword`, filters)
- [ ] Server-side pagination and search (URL change → refetch)
- [ ] Table columns + `record-actions` (edit link, delete + confirm)
- [ ] Add → `/[entity]/add`
- [ ] Enrich audit users via `resolve-auth-users` when showing created/updated by

### 4.4 Checklist — Form / tabs

- [ ] Client: **Formik + Yup**
- [ ] Service: **Zod** before Prisma writes
- [ ] Map server validation errors back to Formik `setErrors` / `setTouched`
- [ ] Strip `createdBy` / `updatedBy` / timestamps from client payloads in actions
- [ ] Set audit fields from session on create/update
- [ ] Toast + redirect (or stay on edit) after success
- [ ] `revalidatePath` for the list (and edit if needed)

### 4.5 Checklist — Permissions & activity

- [ ] Every action: `requirePermission(resource, 'view'|'add'|'edit'|'delete')`
- [ ] Log meaningful activity keys (see Staff: `.created`, `.updated`, `.deleted`, …)
- [ ] Use `logActivityNonBlocking` so logging never breaks the happy path
- [ ] Gate writes with `ACTIVITY_LOG_ENABLED`

### 4.6 Checklist — Codes & Prisma

- [ ] New collections in `apps/hrm/prisma/schema.prisma`
- [ ] Isolated client: regenerate with `db:generate` (output under `lib/generated/prisma-client`)
- [ ] Record codes via `Sequence` + `generateRecordCode` when the entity needs a human code
- [ ] Never put auth `User` models in the HRM schema; resolve users through `@archmage/db-auth`

---

## 5. Channeling integration rules

Apply only when the entity (or a field subset) must stay in sync with Channeling.

| Operation | Expected behaviour |
|-----------|--------------------|
| **Create + sync** | Push after HRM create; on Channeling failure → **rollback HRM** (Staff create does this) |
| **Update + sync** | Prompt when Channeling fields changed or record not linked; Channeling failure → **warning**, keep HRM |
| **Delete** | Explicit dialog: Continue = HRM + Channeling; Cancel path may be HRM-only — keep copy clear |
| **Pull (Refresh)** | Upsert by `migrateSourceId` then `code`; overwrite Channeling-aligned scalars only; do not wipe HR-only nests |

Infrastructure:

- OAuth client credentials → `CHANNELING_BASE_URL` + `lib/api.ts`
- Credentials from Channeling Admin → API Clients
- Env: see `apps/hrm/.env.example`

Do **not** share Prisma clients across apps. Cross-app writes go through public APIs.

---

## 6. Validation & mapping conventions

1. **Yup** = UX validation on the client.  
2. **Zod** = source of truth on the server (service layer).  
3. Prefer **mappers** over inline field mapping when a form has many fields or nested objects.  
4. Keep option lists in `types/*-options.ts` (or shared constants from `@archmage/shared` when Channeling-aligned).  
5. Reuse shared validations (`lib/validations/nic.ts`, `phone-mobile.ts`) instead of duplicating regexes.

---

## 7. UI / UX conventions

- Prefer `@archmage/ui` components (table, fields, dialogs, tabs, toasts).
- List toolbar: search, primary Add, secondary actions (export, sync) aligned with Staff.
- Accordion sections inside large tabs (Staff General / HR / Employment).
- Loading: layout navigation wrapper; avoid one-off loading pages per entity unless needed.
- Status labels: keep list and form wording consistent (Active/Inactive vs Published/Unpublished — pick one per entity and stick to it).

---

## 8. Dual-database rules

| Rule | Why |
|------|-----|
| Auth data only via `@archmage/db-auth` | Single identity across Channeling / DPAY / HRM |
| Domain data only in HRM Prisma | Isolation; generated client path avoids clashing with other apps’ `@prisma/client` |
| `User.staffId` is a plain ObjectId string | No cross-DB Prisma relation |
| Audit display names resolved in helpers | Auth users are not in HRM DB |

---

## 9. Planned module map (permissions already reserved)

`ROUTE_TO_RESOURCE` already anticipates future areas. Add pages/services only when the product needs them; still register permissions before shipping UI.

| Route | Resource key |
|-------|----------------|
| `/staff` | `staff` *(implemented)* |
| `/employees` | `employees` |
| `/departments` | `departments` |
| `/positions` | `positions` |
| `/leave-requests` | `leave-requests` |
| `/leave-types` | `leave-types` |
| `/attendance` | `attendance` |
| `/payroll` | `payroll` |
| `/salary-structures` | `salary-structures` |
| `/reports` | `reports` |
| `/users`, `/user-groups` | `users` |
| `/admin/api-clients` | `api-clients` |

When starting a new route: implement the vertical slice in §4, then add nav + permission grants in Auth.

---

## 10. Development workflow (recommended)

1. **Model first** — Prisma types / collection + generate client.  
2. **Types & Zod** — payload types and service schema.  
3. **Service CRUD** — no UI yet; keep functions pure of HTTP/cookies.  
4. **Actions** — permissions, audit, revalidate, optional sync.  
5. **UI** — list → add/edit (or tabs) → record actions.  
6. **Sync (if any)** — helpers, dialogs, push/pull services last.  
7. **Permissions & activity** — verify with a non-admin user.  
8. **Smoke** — create → edit each tab → delete; with and without Channeling sync when relevant.

Local env: copy `apps/hrm/.env.example`. Run HRM on port **3001**. Channeling must be reachable for sync features.

---

## 11. Known pitfalls (do not repeat)

1. **Overlapping fields** — General and HR Details both edit some identity/`hrDetails` fields. Prefer a single owner tab for each field going forward.  
2. **Pagination params** — always pass request `page` / `limit` into the service; do not replace them with env defaults when the client sent values.  
3. **Empty option arrays** — ship real options (or shared lookups) before release; empty `[]` selects are placeholders only.  
4. **Delete dialog semantics** — “Cancel” must not silently delete HRM-only unless the copy says so clearly.  
5. **Create vs update sync defaults** — create may default `syncToChanneling: true`; updates should be explicit via the dialog.  
6. **Do not duplicate Channeling’s single `staff-form`** — HRM uses the tabbed manager for a reason.  
7. **Avoid unused deps / dead sync paths** — remove or finish commented “NO NEED” Channeling per-id sync before adding more.  
8. **Shared `Staff` type in `@archmage/shared` is Channeling-shaped** — HRM nested shapes live in `apps/hrm/types/staff.ts`.

---

## 12. Quick decision tree

```
New HRM feature?
 ├─ Needs Channeling data? ── yes ── define field boundary + push/pull + migrateSourceId
 │                              no ── HRM Prisma only
 ├─ Large multi-domain record? ── yes ── TabLayout + per-tab forms/actions (Staff pattern)
 │                                 no ── Single Formik form
 └─ Always: Action → Service → Zod → Prisma; permissions + activity log
```

---

## 13. Definition of done (feature PR)

- [ ] Matches folder/layer layout above  
- [ ] Permissions on route + every mutating action  
- [ ] Yup (client) + Zod (service)  
- [ ] Activity log keys for meaningful events  
- [ ] List/search/pagination via URL params  
- [ ] Audit fields set server-side  
- [ ] Channeling sync (if any) documented in the PR and limited to the field boundary  
- [ ] No Prisma / secrets in client components  
- [ ] `.env.example` updated if new env vars are required  
