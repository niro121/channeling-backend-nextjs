# Permission System Usage Guide

## Overview

The permission system allows you to control user access based on user groups and their assigned permissions. Permissions are loaded during login and stored in the session.

## How It Works

1. **User Groups**:** Each user group has permissions defined for different resources (users, doctors, patients, etc.)
2. **Permissions**: Each resource has 4 actions: `view`, `add`, `edit`, `delete`
3. **Session Storage**: Permissions are loaded during login and stored in the JWT token and session
4. **Route Protection**: Middleware checks permissions before allowing access to routes

## Route to Resource Mapping

Routes are automatically mapped to resources:
- `/users` → `users` resource
- `/doctors` → `doctors` resource
- `/patients` → `patients` resource
- etc.

## Usage Examples

### Client-Side (React Components)

```tsx
import { usePermissions } from "@/components/hooks/use-permissions"

function MyComponent() {
  const { canAccess, has, isAdmin } = usePermissions()

  // Check if user can access a route
  if (!canAccess("/users")) {
    return <div>Access Denied</div>
  }

  // Check if user has specific permission
  if (!has("users", "add")) {
    return <button disabled>Add User</button>
  }

  // Show/hide buttons based on permissions
  return (
    <div>
      {has("users", "add") && <button>Add User</button>}
      {has("users", "edit") && <button>Edit User</button>}
      {has("users", "delete") && <button>Delete User</button>}
    </div>
  )
}
```

### Server-Side (Server Actions / API Routes)

```tsx
import { checkPermission, requirePermission } from "@/lib/server-permissions"

// In a server action
export async function createUser(data: UserData) {
  // Check permission before proceeding
  await requirePermission("users", "add")
  
  // Your logic here
  // ...
}

// Or check without throwing
export async function getUser(id: string) {
  const canView = await checkPermission("users", "view")
  if (!canView) {
    throw new Error("Access denied")
  }
  
  // Your logic here
  // ...
}
```

### Middleware (Automatic Route Protection)

The middleware automatically checks permissions for routes. No additional code needed!

- Routes mapped to resources are automatically protected
- Admin users (userType 1) have access to all routes
- Users with user groups have permissions checked
- Routes not mapped (like `/welcome`) are allowed

### Navigation (Layout)

The layout automatically hides/shows navigation items based on permissions:

```tsx
// Already implemented in layout.tsx
const hasAccess = (path: string) => {
  if (userType === userTypes.admin) return true
  if (permissions) return canAccessRoute(permissions, path)
  return false
}
```

## Permission Actions

- **view**: Can view/list items (GET requests, list pages)
- **add**: Can create new items (POST requests, add pages)
- **edit**: Can update items (PUT/PATCH requests, edit pages)
- **delete**: Can delete items (DELETE requests, delete actions)

## Admin Users

Users with `userType === 1` (admin) automatically have all permissions and can access all routes. They bypass all permission checks.

## Adding New Resources

1. Add the resource to `types/user-group.ts` in the `RESOURCES` array
2. Add the route mapping to `lib/permissions.ts` in `ROUTE_TO_RESOURCE`
3. The permission system will automatically work for the new resource

## Example: Protecting a Server Action

```tsx
"use server"

import { requirePermission } from "@/lib/server-permissions"
import { createNewUser } from "./user.actions"

export async function createUserAction(userData: User) {
  // This will throw an error if user doesn't have permission
  await requirePermission("users", "add")
  
  return await createNewUser(userData)
}
```

## Example: Conditional UI Rendering

```tsx
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"

export function UserActions({ userId }: { userId: string }) {
  const { has } = usePermissions()

  return (
    <div>
      {has("users", "view") && <ViewButton userId={userId} />}
      {has("users", "edit") && <EditButton userId={userId} />}
      {has("users", "delete") && <DeleteButton userId={userId} />}
    </div>
  )
}
```
