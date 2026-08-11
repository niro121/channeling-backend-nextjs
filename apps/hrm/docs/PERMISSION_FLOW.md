# HRM Permission Flow

How route and action permissions work in `apps/hrm`, from Auth user groups through session checks to UI gating.

Related: Channeling’s deeper guides under `apps/channeling/docs/` (`PERMISSION_QUICK_REFERENCE.md`, `ADDING_NEW_COMPONENT_WITH_PERMISSIONS.md`, `ROLES_PERMISSIONS_USER_GROUPS_GUIDE.md`). HRM uses the same shared permission model with its own resource list and route map.

---

## 1. Overview

Permissions are **resource × action** flags stored on a **User Group** in the Auth DB (`@archmage/db-auth`). At login they are copied onto the NextAuth session. Every gate (sidebar, page, action, client button) reads that session object.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  User Group     │────▶│  Auth User       │────▶│  NextAuth       │
│  .permissions   │     │  .userGroupId    │     │  session.user   │
│  { resource:    │     │                  │     │  .permissions   │
│    { view, add, │     └──────────────────┘     │  .userType      │
│      edit,      │                              └────────┬────────┘
│      delete } } │                                       │
└─────────────────┘                                       ▼
                              ┌───────────────────────────────────────┐
                              │  Gates (all use same helpers)         │
                              │  • Sidebar / mobile nav (client)      │
                              │  • Page `checkRouteAccess` (server)   │
                              │  • Actions `requirePermission`        │
                              │  • UI buttons `usePermissions()`      │
                              └───────────────────────────────────────┘
```

**Admin bypass:** `userType === admin` always passes. Non-admins need matching `permissions[resource][action] === true`.

---

## 2. Data shape

Shared types live in `@archmage/shared` (re-exported from `apps/hrm/types/user-group.ts`).

| Concept | Values |
|--------|--------|
| Actions | `view`, `add`, `edit`, `delete` (`PERMISSION_ACTIONS`) |
| Permissions object | `{ [resourceId]: { view?: boolean, add?: boolean, edit?: boolean, delete?: boolean } }` |

Example (staff with view + add only):

```json
{
  "staff": { "view": true, "add": true, "edit": false, "delete": false },
  "leave-types": { "view": true }
}
```

HRM resources are declared in `apps/hrm/types/user-group.ts` → `RESOURCES`. That list drives the User Group permission matrix UI.

---

## 3. Session hydration

On successful login (`apps/hrm/lib/auth.ts`):

1. User is loaded with `userGroup`.
2. `permissions: user.userGroup?.permissions` is returned from the credentials provider.
3. JWT callback stores `token.permissions`.
4. Session callback exposes `session.user.permissions` and `session.user.userType`.

Changing a group’s permissions does **not** update existing sessions until the user signs in again (or the JWT is otherwise refreshed).

---

## 4. Core helpers

| Layer | File | Role |
|-------|------|------|
| Pure logic | `lib/permissions.ts` | `ROUTE_TO_RESOURCE`, `hasPermission`, `canAccessRoute`, `canPerformAction` |
| Server | `lib/server-permissions.ts` | Session + admin bypass → `checkRouteAccess`, `checkPermission`, `requirePermission` |
| Client hook | `components/hooks/use-permissions.tsx` | Same checks from `useSession()` |
| Sidebar | `app/(dashboard)/desktop-sidebar.tsx` | `hasAccess(path)` → `canAccessRoute` |

### Route access

```ts
// lib/permissions.ts (simplified)
canAccessRoute(permissions, route) {
  const resource = ROUTE_TO_RESOURCE[route];
  if (!resource) return true; // unmapped routes are open
  const action = ROUTE_REQUIRED_ACTION[route] ?? 'view';
  return hasPermission(permissions, resource, action);
}
```

**Important:** If a path is missing from `ROUTE_TO_RESOURCE`, `canAccessRoute` returns `true`. Always map a route before shipping UI that should be gated.

Default route action is **`view`**. Override per route via `ROUTE_REQUIRED_ACTION` when needed.

### Server page guard

```ts
const canView = await checkRouteAccess('/leave-entitlement');
if (!canView) redirect('/unauthorized-access');
```

`checkRouteAccess` loads the server session; admins pass; otherwise `canAccessRoute` runs.

### Action / mutation guard

```ts
await requirePermission('leave-entitlement', 'add'); // throws if denied
```

### Client UI

```ts
const { has, canAccess, isAdmin } = usePermissions();
if (has('leave-types', 'delete')) { /* show delete */ }
```

---

## 5. End-to-end request flow

```
User navigates to /leave-management
        │
        ├─① Sidebar (client)
        │     hasAccess('/leave-management')
        │     → admin? yes → show link
        │     → else canAccessRoute(session.permissions, path)
        │     → needs permissions['leave-management'].view
        │
        ├─② Page (RSC)
        │     checkRouteAccess('/leave-management')
        │     → false → redirect /unauthorized-access
        │
        └─③ Later: server action / button
              requirePermission('leave-management', 'edit')
              or usePermissions().has('leave-management', 'edit')
```

Sidebar alone is **not** security; the page (and actions) must enforce the same rules.

---

## 6. Checklist: add a new gated page

Do these in order so the resource appears in Auth UI and every gate agrees.

### 1. Resource catalog

`apps/hrm/types/user-group.ts` → `RESOURCES`:

```ts
{ id: 'leave-application', name: 'Leave Application' },
```

### 2. Route → resource map

`apps/hrm/lib/permissions.ts` → `ROUTE_TO_RESOURCE`:

```ts
'/leave-application': 'leave-application',
```

### 3. Sidebar (and mobile nav if present)

```tsx
{hasAccess('/leave-application') && (
  <NavLink href="/leave-application" label="Application" ... />
)}
```

Include the path in any `SidebarCollapsible` `paths` array so the group auto-expands on that route.

### 4. Page guard

```tsx
const canView = await checkRouteAccess('/leave-application');
if (!canView) redirect('/unauthorized-access');
```

### 5. Breadcrumb (UX only)

`app/(dashboard)/breadcrumbs.tsx` — label for the path segment. Does not enforce access.

### 6. Mutations / buttons

- Server actions: `requirePermission(resource, 'add' | 'edit' | 'delete')`
- Client controls: `usePermissions().has(resource, action)`

### 7. Grant in Auth

Assign **view** (and other actions) on the User Group for that resource, then have users re-login.

---

## 7. Current HRM route → resource map

From `lib/permissions.ts` / `RESOURCES` (keep these in sync when editing).

| Route | Resource id | Display name (RESOURCES) |
|-------|-------------|--------------------------|
| `/staff` | `staff` | *(mapped; ensure Auth group has staff if used)* |
| `/employees` | `employees` | Employees |
| `/departments` | `departments` | Departments |
| `/positions` | `positions` | Positions |
| `/leave-requests` | `leave-requests` | Leave Requests |
| `/leave-types` | `leave-types` | Leave Types |
| `/leave-entitlement` | `leave-entitlement` | Leave Entitlement |
| `/leave-management` | `leave-management` | Leave Management |
| `/leave-application` | `leave-application` | Leave Application |
| `/overtime-requests` | `overtime-requests` | OT Requests |
| `/overtime-extra-time` | `overtime-requests` | OT Requests (same grant) |
| `/overtime-day-off-ph-shift` | `overtime-requests` | OT Requests (same grant) |
| `/attendance` | `attendance` | Attendance |
| `/payroll` | `payroll` | Payroll |
| `/salary-structures` | `salary-structures` | Salary Structures |
| `/reports` | `reports` | Reports |
| `/users` | `users` | Users & User Groups |
| `/user-groups` | `users` | (same resource) |
| `/admin/api-clients` | `api-clients` | *(route mapped; add to RESOURCES if matrix UI needed)* |

`getResourceFromRoute` also resolves prefix matches (e.g. `/staff/add` → `staff` when `/staff` is mapped).

---

## 8. HTTP method → action (API-style)

`METHOD_TO_ACTION` in `lib/permissions.ts`:

| Method | Action |
|--------|--------|
| `GET` | `view` |
| `POST` | `add` |
| `PUT` / `PATCH` | `edit` |
| `DELETE` | `delete` |

Use when mapping REST handlers to the same permission matrix as UI actions.

---

## 9. Responsibility split

| Concern | Enforces access? | Notes |
|---------|------------------|--------|
| User Group matrix | Source of truth | Auth DB |
| Session `permissions` | Snapshot at login | Stale until re-auth |
| Sidebar `hasAccess` | UX only | Hide links |
| `checkRouteAccess` on page | Yes | Block deep links |
| `requirePermission` in actions | Yes | Block mutations |
| `usePermissions` in client | UX | Hide/disable controls; still protect on server |
| Breadcrumbs | No | Labels only |

---

## 10. Common pitfalls

1. **Forgot `ROUTE_TO_RESOURCE`** → route stays open (`canAccessRoute` → `true`).
2. **Resource in map but not in `RESOURCES`** → harder to grant via User Group UI.
3. **Sidebar only** → users can still open the URL; always add the page `checkRouteAccess`.
4. **Client-only checks** → always mirror with `requirePermission` in server actions.
5. **Permission changed in Auth** → existing sessions still have old flags until re-login.
6. **Admin testing** → admins always pass; use a non-admin group to verify gating.

---

## 11. Minimal reference (Leave Application)

Files touched for a gated leave page:

1. `types/user-group.ts` — `RESOURCES` entry  
2. `lib/permissions.ts` — `ROUTE_TO_RESOURCE`  
3. `app/(dashboard)/desktop-sidebar.tsx` — `hasAccess(...)`  
4. `app/(dashboard)/(leave)/leave-application/page.tsx` — `checkRouteAccess` + redirect  
5. `app/(dashboard)/breadcrumbs.tsx` — path label  
6. Auth User Group — grant `leave-application.view` (etc.)
