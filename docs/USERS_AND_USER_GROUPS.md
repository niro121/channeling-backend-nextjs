# Users and User Groups

Cross-app guide for authentication identity, authorization groups, and the planned HRM user-management model.

**Audience:** developers implementing or extending Users / User Groups in HRM, DPAY, or (future) Channeling on `@archmage/db-auth`.

---

## 1. Architecture overview

The ecosystem uses a **layered authorization model**:

```
┌─────────────────────────────────────────────────────────────────┐
│  userType (role)          Admin bypass OR staff login gate      │
├─────────────────────────────────────────────────────────────────┤
│  UserGroup (optional)     Permission bundle + 2FA policy        │
├─────────────────────────────────────────────────────────────────┤
│  permissions JSON         resource → action → boolean           │
├─────────────────────────────────────────────────────────────────┤
│  App gate (planned)       Which dashboard may this user enter?  │
└─────────────────────────────────────────────────────────────────┘
```

| Layer | Stored on | Purpose |
|-------|-----------|---------|
| **User** | Auth DB | Login identity (email, password, 2FA, status) |
| **userType** | `User.userType` | Platform role: admin, staff, doctor, api user |
| **UserGroup** | `User.userGroupId` → `UserGroup` | Fine-grained permissions for staff |
| **permissions** | `UserGroup.permissions` | Resource × action matrix (JSON) |
| **app** *(planned)* | `UserGroup.app` | Which app owns this group (`hrm`, `dpay`, `channeling`) |

**Important constraint:** each user has **one** group (`userGroupId`). Permissions for multiple apps cannot be merged from separate groups without schema changes.

---

## 2. Where auth data lives

| App | Auth storage | Package / DB |
|-----|--------------|--------------|
| **HRM** | Shared auth DB | `@archmage/db-auth` → `AUTH_DATABASE_URL` |
| **DPAY** | Shared auth DB | `@archmage/db-auth` → `AUTH_DATABASE_URL` |
| **Channeling** | Local auth tables *(today)* | `apps/channeling/prisma/schema.prisma` (same shape, separate MongoDB) |

HRM domain data (`Staff`, leave, overtime, …) lives in the **HRM app database** (`DATABASE_URL`). Auth users reference staff via plain ID:

```
Auth User.staffId  ──►  HRM Staff.id   (no cross-DB Prisma relation)
```

---

## 3. Auth DB schema

**Location:** `packages/db-auth/prisma/schema.prisma`  
**Client:** `@archmage/db-auth` (`authPrisma`)

### 3.1 Current schema

```prisma
model User {
  id       String  @id @default(auto()) @map("_id") @db.ObjectId
  name     String
  email    String  @unique
  username String?
  phone    String?

  password String
  userType Int     // 1 = admin, 2 = staff, 3 = doctor, 4 = api user
  status   Int     // 0 = inactive, 1 = active

  // 2FA
  twoFactorEnabled       Boolean   @default(false)
  twoFactorMethod        String?
  twoFactorSecret        String?
  twoFactorPendingSecret String?
  twoFactorTempCode      String?
  twoFactorExpires       DateTime?
  twoFactorVerified      Boolean   @default(false)

  mustChangePassword Boolean @default(false)

  // Cross-DB references (plain IDs)
  staffId        String? @db.ObjectId  // → HRM Staff.id
  doctorId       String? @db.ObjectId  // → Channeling Doctor.id
  userLocationId String? @db.ObjectId  // → Channeling Location.id (DPAY receipts)
  locationCode   String?               // Denormalized branch code

  userGroupId String?    @db.ObjectId
  userGroup   UserGroup? @relation(...)

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
}

model UserGroup {
  id          String  @id @default(auto()) @map("_id") @db.ObjectId
  name        String
  description String?
  status      Int     // 0 = inactive, 1 = active

  permissions Json    // { "resource": { "view": true, "add": true, ... } }

  twoFactorEnabled Boolean  @default(false)
  twoFactorMethods String[] // "1" = AUTH-APP, "2" = SMS, "3" = EMAIL

  users User[]

  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
}
```

### 3.2 Planned additive change (app scoping)

To let HRM manage **HRM-only** groups without affecting DPAY groups:

```prisma
model UserGroup {
  // ... existing fields ...

  /// App ownership. Optional for backward compatibility.
  /// Values: "hrm" | "dpay" | "channeling"
  app String?

  @@index([app])
  @@index([status])
}
```

| Rule | Rationale |
|------|-----------|
| Field is **optional** (`String?`) | Existing groups keep working; no forced migration |
| Additive only | DPAY/HRM builds stay compatible |
| Enforced in **app code**, not DB enum | New apps can be added without schema migration |

**Not planned in v1:** `User.allowedApps`, multi-group membership, or required `app`.

---

## 4. Shared app constants

Store app name strings in **`@archmage/shared`**, not in the Prisma schema.

```ts
// packages/shared/src/types/auth-apps.ts (planned)
export const AUTH_APPS = {
  hrm: "hrm",
  dpay: "dpay",
  channeling: "channeling",
} as const;

export type AuthApp = (typeof AUTH_APPS)[keyof typeof AUTH_APPS];
```

Each app imports the same constants when creating groups, filtering lists, and gating login.

| Layer | Responsibility |
|-------|------------------|
| Prisma schema | Persist `app` as plain string |
| `@archmage/shared` | Single source of truth for allowed values |
| App code | Filter CRUD + login checks by app constant |

---

## 5. User types (`userType`)

Defined in `packages/shared/src/types/roles.ts`:

| Value | Name | Dashboard login | Typical use |
|-------|------|-----------------|-------------|
| `1` | Admin | Yes | Platform superuser; bypasses all permission checks |
| `2` | Staff | Yes | Operators scoped by User Group permissions |
| `3` | Doctor | No *(doctor app)* | Channeling doctor mobile/API login |
| `4` | API User | No | Public API `createdBy` only |

```ts
export function isDashboardLoginUserType(userType: number): boolean {
  return userType === userTypes.admin || userType === userTypes.staff;
}
```

### Operational rules

| Who | userType | User group | HRM access |
|-----|----------|------------|------------|
| Platform admin | `admin` | Optional (ignored) | Full access |
| HRM operator | `staff` | HRM group (`app: "hrm"`) | Group permissions only |
| DPAY operator | `staff` | DPAY group (`app: "dpay"`) | Blocked at HRM login gate *(planned)* |
| Doctor | `doctor` | N/A | Cannot use HRM dashboard |

**Recommendation:** create HRM operators as `staff`, not `admin`. Reserve `admin` for platform operators who need cross-app access.

---

## 6. User Group permissions

### 6.1 JSON shape

Shared types: `packages/shared/src/types/user-group.ts`

```json
{
  "staff": { "view": true, "add": true, "edit": false, "delete": false },
  "leave-management": { "view": true, "edit": true },
  "users": { "view": true, "add": false, "edit": false, "delete": false }
}
```

| Concept | Values |
|---------|--------|
| Standard actions | `view`, `add`, `edit`, `delete` |
| Custom actions | Per-resource (e.g. Channeling `bulk-cashier.float-approve`) |
| Structure | `permissions[resourceId][actionId] === true` |

### 6.2 Resource catalogs are per app

Each app defines its own `RESOURCES` list for the User Group matrix UI:

| App | File |
|-----|------|
| HRM | `apps/hrm/types/user-group.ts` |
| DPAY | `apps/dpay/types/user-group.ts` |
| Channeling | `apps/channeling/types/user-group.ts` |

Permission **keys** in JSON are app-specific. A DPAY group should not grant HRM resources and vice versa. The planned `UserGroup.app` field prevents accidental cross-app assignment in UI.

### 6.3 Group-level 2FA

`UserGroup.twoFactorEnabled` and `twoFactorMethods` define whether members must complete 2FA at login and which methods are allowed. See `apps/channeling/docs/2FA_PROCEDURE.md`.

---

## 7. Authorization flow

### 7.1 Login → session

```
1. User submits credentials (NextAuth Credentials provider)
2. Load User + userGroup from auth DB
3. Validate password, userType, 2FA, mustChangePassword
4. (Planned) App gate: admin OR userGroup.app === current app
5. Copy userGroup.permissions into JWT / session
6. session.user = { id, userType, permissions }
```

**Session staleness:** changing a group’s permissions does not update active sessions until re-login.

### 7.2 Runtime checks

| Layer | Admin | Staff |
|-------|-------|-------|
| Middleware | Allow all | `canAccessRoute(permissions, path)` |
| Server actions | Allow all | `requirePermission(resource, action)` |
| Sidebar / buttons | Show all | Hide via `usePermissions()` / `hasAccess()` |

Admin bypass is implemented in `lib/server-permissions.ts` and middleware in HRM/DPAY/Channeling.

**Security note:** sidebar and client checks are UX only. Pages and server actions must enforce the same rules.

---

## 8. Planned HRM user-management model

### 8.1 Goals

1. HRM admins manage **HRM users and HRM user groups** from the HRM app.
2. Platform admins (`userType = admin`) retain full HRM access without needing a group.
3. HRM-only staff cannot access DPAY/Channeling dashboards *(requires app login gate in each app)*.
4. HRM must not list or edit groups belonging to other apps.

### 8.2 Who can manage users in HRM

| Actor | Can manage HRM groups | Can manage HRM staff users | Can create platform admins |
|-------|----------------------|----------------------------|----------------------------|
| Platform admin | Yes | Yes | Yes *(discouraged from HRM UI)* |
| HRM staff with `users.*` permission | Yes (`app: "hrm"` only) | Yes (staff + HRM groups) | No |

### 8.3 User Group CRUD rules (HRM)

| Operation | Filter / constraint |
|-----------|---------------------|
| List groups | `where: { app: AUTH_APPS.hrm }` (+ optionally `app: null` during migration) |
| Create group | Always set `app: AUTH_APPS.hrm` |
| Update group | Reject if existing `app !== "hrm"` |
| Delete group | Reject if `app !== "hrm"` or users still assigned |

### 8.4 User CRUD rules (HRM)

| Operation | Filter / constraint |
|-----------|---------------------|
| List users | Users in HRM groups and/or admins *(product decision)* |
| Create user | Default `userType: staff`; assign only HRM groups |
| Update user | Do not assign non-HRM groups |
| Link to employee | Set `staffId` → HRM `Staff.id` when applicable |

Not every HRM login user must be a Staff record (e.g. external HR clerk). When they are an employee, link via `staffId`.

### 8.5 Login gate (HRM)

After successful credential validation:

```ts
// Pseudocode — apps/hrm/lib/auth.ts
if (user.userType === userTypes.admin) allow();
else if (user.userGroup?.app === AUTH_APPS.hrm) allow();
else if (user.userGroup?.app == null) {
  // Migration-only: optional temporary allow or deny
}
else deny("No access to HRM");
```

Apply the same pattern in DPAY with `AUTH_APPS.dpay` when hardening cross-app login isolation.

### 8.6 Suggested seed groups (examples)

| Group | Target | Typical permissions |
|-------|--------|---------------------|
| HRM Administrators | Staff power users | All HRM resources including `users` |
| Leave Officers | Leave team | `leave-*`, `staff.view` |
| OT Officers | Overtime team | `overtime-requests`, `staff.view` |
| HR Viewers | Read-only HR | `view` on staff, leave, reports |

Platform admins do not need membership in “HRM Administrators”.

---

## 9. HRM permission resources

From `apps/hrm/types/user-group.ts` and `apps/hrm/lib/permissions.ts`:

| Resource id | Display name | Notes |
|-------------|--------------|-------|
| `employees` | Employees | |
| `departments` | Departments | |
| `positions` | Positions | |
| `leave-requests` | Leave Requests | |
| `leave-types` | Leave Types | |
| `leave-entitlement` | Leave Entitlement | |
| `leave-management` | Leave Management | |
| `leave-application` | Leave Application | |
| `overtime-requests` | OT Requests | Shared by all OT routes |
| `attendance` | Attendance | |
| `payroll` | Payroll | |
| `salary-structures` | Salary Structures | |
| `reports` | Reports | |
| `users` | Users & User Groups | Gates `/users` and `/user-groups` |

Route mapping example: `/leave-application` → `leave-application` (default action `view`).

Full permission flow details: **`apps/hrm/docs/PERMISSION_FLOW.md`**.

---

## 10. Channeling reference (today)

Channeling still stores `User` and `UserGroup` in its **own** database with the same permission pattern. Implementation reference:

- Guide: `apps/channeling/docs/ROLES_PERMISSIONS_USER_GROUPS_GUIDE.md`
- User CRUD: `apps/channeling/services/user.service.ts`
- User Group CRUD: `apps/channeling/services/user-group.service.ts`
- UI: `apps/channeling/app/(dashboard)/users/`, `user-groups/`

When Channeling migrates to `@archmage/db-auth`, reuse this document’s app-scoping model with `AUTH_APPS.channeling`.

---

## 11. Cross-app impact of auth schema changes

| Change type | Breaks other apps? | Notes |
|-------------|-------------------|-------|
| Add optional field (`app`) | No | Preferred approach |
| Add required field without default | Yes | Avoid |
| Rename / remove field | Yes | Coordinate all consumers |
| Regenerate `@archmage/db-auth` client | Rebuild apps using package | No source changes required for optional fields |

| Planned HRM work | Required in DPAY? | Required in Channeling? |
|------------------|-------------------|-------------------------|
| `UserGroup.app` field | No | No |
| HRM Users / Groups UI | No | No |
| HRM login app gate | No *(recommended for DPAY later)* | No |

**Security side effect:** new HRM staff users exist in the shared auth DB. Until DPAY adds its own app gate, they may still **authenticate** into DPAY but will lack DPAY permission keys. Add DPAY login gate when convenient.

---

## 12. Implementation checklist (HRM)

### Phase 1 — Schema and constants ✅

- [x] Add `UserGroup.app String?` to `packages/db-auth/prisma/schema.prisma`
- [x] Run `prisma db push` / migrate and `prisma generate`
- [x] Add `AUTH_APPS` to `packages/shared` and export from index

### Phase 2 — Auth gate

- [ ] HRM login: allow `admin` OR `userGroup.app === "hrm"`
- [ ] (Optional) DPAY login: same for `"dpay"`

### Phase 3 — User Group management

- [ ] Service: CRUD via `authPrisma`, filter by `app: "hrm"`
- [ ] UI: list / add / edit under `/user-groups` *(mirror Channeling pattern)*
- [ ] Permission matrix from HRM `RESOURCES`
- [ ] Server actions: `requirePermission("users", …)`

### Phase 4 — User management

- [ ] Service: CRUD via `authPrisma`, assign HRM groups only
- [ ] UI: list / add / edit under `/users`
- [ ] Optional `staffId` picker linked to HRM Staff
- [ ] Restrict creating `userType: admin` from HRM UI *(recommended)*

### Phase 5 — Migration / backfill

- [ ] Tag existing shared groups with correct `app` value
- [ ] Document legacy `app: null` handling during transition

---

## 13. Key files reference

| Concern | Path |
|---------|------|
| Auth schema | `packages/db-auth/prisma/schema.prisma` |
| Auth client | `packages/db-auth/src/index.ts` |
| Shared roles | `packages/shared/src/types/roles.ts` |
| Shared permission types | `packages/shared/src/types/user-group.ts` |
| HRM auth | `apps/hrm/lib/auth.ts` |
| HRM permissions | `apps/hrm/lib/permissions.ts`, `lib/server-permissions.ts` |
| HRM resources | `apps/hrm/types/user-group.ts` |
| HRM permission flow doc | `apps/hrm/docs/PERMISSION_FLOW.md` |
| Channeling user/group guide | `apps/channeling/docs/ROLES_PERMISSIONS_USER_GROUPS_GUIDE.md` |

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Auth DB** | MongoDB at `AUTH_DATABASE_URL`; shared by HRM and DPAY |
| **User** | Login account (email/password/2FA) |
| **User Group** | Named permission bundle assigned to one user |
| **Resource** | Permission namespace (e.g. `leave-management`) |
| **Action** | Operation on a resource (`view`, `add`, `edit`, `delete`, or custom) |
| **App scope** | Which dashboard owns a User Group (`hrm`, `dpay`, `channeling`) |
