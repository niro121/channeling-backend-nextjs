# Monorepo documentation

Shared architecture and cross-app guides for the Ruhunu backend ecosystem.

| Document | Description |
|----------|-------------|
| [Users and User Groups](./USERS_AND_USER_GROUPS.md) | Shared auth model (`@archmage/db-auth`), user types, permission groups, app scoping, and HRM implementation plan |
| [HR Administration Guide](../apps/hrm/docs/HR_ADMINISTRATION_GUIDE.md) | HR Administration group overview; **Holiday Calendar** module (domain, UI, permissions, build phases) |

## App-specific docs

| App | Location |
|-----|----------|
| HRM | `apps/hrm/docs/` — `PERMISSION_FLOW.md`, `HRM_DEVELOPMENT_GUIDELINES.md`, `LEAVE_MANAGER_GUIDE.md`, `OVERTIME_MANAGER_GUIDE.md`, `ROSTER_SHIFTS_MANAGER_GUIDE.md`; HR Admin entry point: [`docs/HR_ADMINISTRATION_GUIDE.md`](../apps/hrm/docs/HR_ADMINISTRATION_GUIDE.md) |
| Channeling | `apps/channeling/docs/` — `ROLES_PERMISSIONS_USER_GROUPS_GUIDE.md`, permission guides |
| DPAY | Uses HRM-style permission flow; see shared doc above |
