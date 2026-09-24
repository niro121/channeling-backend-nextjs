# Roles, Permissions, and User Groups - Implementation Guide

This document explains how this application implements authorization using:

- `userType` (role-level access)
- `userGroup` (permission bundle)
- `permissions` (resource/action checks)

It is written so you can follow the same pattern in another application.

## 1) Core Authorization Model

The system uses **layered authorization**:

1. **Role (`userType`)**
   - Stored on `User.userType`
   - Current values:
     - `1` = admin
     - `2` = staff
   - Admin is a superuser and bypasses all permission checks.

2. **User Group (`User.userGroupId`)**
   - A user can belong to a group (`UserGroup`).
   - The group stores a permission matrix in JSON and optional group-level 2FA settings.

3. **Permissions JSON (`UserGroup.permissions`)**
   - Structure:
     - `resource -> action -> boolean`
   - Example:
     ```json
     {
       "users": { "view": true, "add": false, "edit": false, "delete": false },
       "bulk-cashier": { "float-view": true, "bulk-cashier-dashboard": true }
     }
     ```

4. **Runtime checks**
   - Middleware checks route access.
   - Server Actions/API use permission guards.
   - UI hides/disables menu items and buttons based on permissions.

---

## 2) Data Model (Prisma)

Main entities:

- `User`
  - `userType: Int`
  - `userGroupId: String?`
  - relation: `userGroup: UserGroup?`

- `UserGroup`
  - `permissions: Json`
  - `status: Int`
  - `twoFactorEnabled: Boolean`
  - `twoFactorMethods: String[]`

Implementation reference: `prisma/schema.prisma`.

---

## 3) Where Roles and Permissions Are Loaded

During login (`lib/auth.ts`):

1. User is fetched with `include: { userGroup: true }`.
2. `userGroup.permissions` is cast to `Permissions`.
3. `id`, `userType`, and `permissions` are returned from `authorize`.
4. JWT callback stores these in token.
5. Session callback exposes them as `session.user.*`.

This makes permissions available across middleware, server, and client.

Key types:

- `types/next-auth.d.ts` extends JWT/session with:
  - `id`
  - `userType`
  - `permissions`
- `types/user-group.ts` defines:
  - `Permissions`
  - `RESOURCES`
  - standard and custom actions

---

## 4) Restriction Flow (How Access Is Checked)

### A) Route-level protection (middleware)

File: `middleware.ts`

Flow:

1. Ignore static assets and public paths.
2. If no token -> redirect to `/login`.
3. If `userType === admin` -> allow all.
4. If user has `permissions`:
   - map URL path to resource via `getResourceFromRoute`.
   - evaluate with `canAccessRoute`.
5. If no permissions payload:
   - fallback to legacy `roleRights` mapping.
6. If denied -> rewrite to `/unauthorized-access`.

### B) Server-side guard

File: `lib/server-permissions.ts`

Use:

- `checkRouteAccess(route)`
- `checkPermission(resource, action)`
- `requirePermission(resource, action)` (throws on deny)

Pattern in actions:

- `await requirePermission("users", "add")`
- then execute DB logic

Example usage exists across many actions, e.g. `app/actions/user.actions.ts`, `app/actions/user-group.actions.ts`.

### C) Client-side/UI guard

File: `components/hooks/use-permissions.tsx`

Returns:

- `canAccess(route)`
- `has(resource, action)`
- `canPerform(resource, action)`
- `isAdmin`

Used in navigation and controls to hide unauthorized links/buttons:

- `app/(dashboard)/layout.tsx`
- `app/(dashboard)/desktop-sidebar.tsx`

---

## 5) How Route to Resource Mapping Works

File: `lib/permissions.ts`

- `ROUTE_TO_RESOURCE` maps path prefixes to resources.
- `ROUTE_REQUIRED_ACTION` optionally overrides default action for a route.
  - Default route check action = `view`
  - Example special routes can require custom action.
- `hasPermission(permissions, resource, action)` is the low-level checker.
- `canAccessRoute()` uses route mapping + required action.

This mapping is the bridge between URL-based navigation and resource permissions.

---

## 6) Action Types

The system supports:

1. **Standard actions**
   - `view`, `add`, `edit`, `delete`

2. **Resource-specific custom actions**
   - Example: `bulk-cashier` has actions like:
     - `float-view`
     - `float-approve`
     - `bulk-cashier-dashboard`
     - `float-request`
     - `my-till`

These are defined in `types/user-group.ts` under `RESOURCES`.

---

## 7) How User Groups Are Managed

### UI definition and selection

File: `app/(dashboard)/user-groups/user-group-form.tsx`

- Initializes permission matrix from `RESOURCES`.
- Supports standard and custom actions.
- Saves:
  - `name`, `description`, `status`
  - `permissions`
  - group-level 2FA settings

### Persistence/service

File: `services/user-group.service.ts`

- CRUD on `UserGroup`.
- Reads/writes `permissions` JSON directly.

### Assignment to users

Files:

- `types/user.ts` includes `userGroupId`.
- `app/actions/user.actions.ts` passes `userGroupId` in create/update.

So a user inherits effective permissions from their assigned group.

---

## 8) Admin and Legacy Behavior

### Admin override

In middleware, server-permissions, and client hooks:

- `userType === admin` always returns allow.

### Legacy fallback

If token has no `permissions`, middleware falls back to `roleRights` in `lib/roles.ts`.
This appears to be backward compatibility for older role-based routes.

---

## 9) How to Replicate This in Another App

Use this checklist:

1. Add a `UserGroup` table/collection with JSON permissions.
2. Add `userType` + optional `userGroupId` to `User`.
3. Define a central permission schema (`resource -> action -> boolean`).
4. On login, fetch user + group, inject permissions into JWT/session.
5. Add middleware that:
   - authenticates
   - maps route -> resource
   - checks permission
6. Add server guard helper (`requirePermission`) and use it in all mutations.
7. Add client permission hook for conditional UI rendering.
8. Keep route-to-resource and resource/action definitions centralized.
9. Reserve admin as explicit bypass role.
10. Keep a fallback strategy only if you are migrating old role logic.

---

## 10) Practical Restriction Rules in This App

A request/action is effectively allowed when:

- User is authenticated, and
- One of the following is true:
  - `userType` is admin, or
  - assigned group permission flag for `resource/action` is `true`, or
  - (legacy only) route allowed in roleRights when permissions payload is absent.

If none match, access is blocked (UI hidden/disabled, route denied, or server error thrown).

