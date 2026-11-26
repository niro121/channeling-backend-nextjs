# Permission Checks - Real Examples

This document shows real examples from the codebase of how permission checks are implemented.

## Example 1: Page Component (Server-Side)

**File:** `app/(dashboard)/users/page.tsx`

```typescript
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function Page({ searchParams }: SearchParams) {
    // Check if user can view users
    const canView = await checkRouteAccess("/users")
    if (!canView) {
        redirect("/unauthorized-access")
    }

    // ... rest of page logic
}
```

## Example 2: Server Actions

**File:** `app/actions/user.actions.ts`

```typescript
"use server"
import { requirePermission } from "@/lib/server-permissions"

// View permission check
export const getAllUsers = async (filter: GetUsersParams) => {
    await requirePermission("users", "view")
    // ... get users logic
}

// Add permission check
export const createNewUser = async (payload: User) => {
    await requirePermission("users", "add")
    // ... create logic
}

// Edit permission check
export const updateUser = async (id: string, payload: User, userPWD: string) => {
    await requirePermission("users", "edit")
    // ... update logic
}

// Delete permission check
export const deleteUser = async (id: string) => {
    await requirePermission("users", "delete")
    // ... delete logic
}
```

## Example 3: Client Component (Record Actions)

**File:** `app/(dashboard)/users/record-actions.tsx`

```typescript
"use client"
import { usePermissions } from "@/components/hooks/use-permissions"

export default function UserRecordActions({ row }: any) {
    const { has } = usePermissions()
    const user = row.original

    return (
        <DataTableRowActions>
            {has("users", "edit") && (
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    Edit
                </DropdownMenuItem>
            )}
            {has("users", "delete") && (
                <DropdownMenuItem onClick={() => showHideDeleteModal(true)}>
                    Delete
                </DropdownMenuItem>
            )}
        </DataTableRowActions>
    )
}
```

## Example 4: Add Button Protection

```typescript
"use client"
import { usePermissions } from "@/components/hooks/use-permissions"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function MyComponent() {
    const { has } = usePermissions()

    return (
        <div>
            {has("users", "add") && (
                <Link href="/users/add">
                    <Button>Add New User</Button>
                </Link>
            )}
        </div>
    )
}
```

## Quick Checklist for New Components

When adding a new component (e.g., "Products"):

1. ✅ Add to `types/user-group.ts`:
   ```typescript
   { id: "products", name: "Products" }
   ```

2. ✅ Add to `lib/permissions.ts`:
   ```typescript
   "/products": "products"
   ```

3. ✅ Protect page:
   ```typescript
   const canView = await checkRouteAccess("/products")
   if (!canView) redirect("/unauthorized-access")
   ```

4. ✅ Protect server actions:
   ```typescript
   await requirePermission("products", "add")  // for create
   await requirePermission("products", "edit") // for update
   await requirePermission("products", "delete") // for delete
   ```

5. ✅ Protect UI elements:
   ```typescript
   const { has } = usePermissions()
   {has("products", "add") && <AddButton />}
   ```

**That's it!** The resource will automatically appear in User Group permissions form! 🎉
