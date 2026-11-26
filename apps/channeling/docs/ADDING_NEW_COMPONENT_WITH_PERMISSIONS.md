# Guide: Adding a New Component with Permission Checks

This guide shows you how to add a new component and integrate it with the permission system.

## Step 1: Add Resource to User Group Types

Add your new resource to the `RESOURCES` array in `types/user-group.ts`:

```typescript
// types/user-group.ts
export const RESOURCES = [
  // ... existing resources
  { id: "your-resource-id", name: "Your Resource Name" },
] as const;
```

**Example:** If you're adding a "Products" component:
```typescript
{ id: "products", name: "Products" },
```

## Step 2: Add Route Mapping

Add the route-to-resource mapping in `lib/permissions.ts`:

```typescript
// lib/permissions.ts
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  // ... existing mappings
  "/your-route": "your-resource-id",
}
```

**Example:** For Products component:
```typescript
"/products": "products",
```

## Step 3: Add Permission Checks in Your Component

### A. Page Level (Server Component)

```typescript
// app/(dashboard)/your-component/page.tsx
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function YourComponentPage() {
  // Check if user can view this resource
  const canView = await checkRouteAccess("/your-route")
  
  if (!canView) {
    redirect("/unauthorized-access")
  }

  // Your page content here
  return <div>Your Component</div>
}
```

### B. Server Actions

```typescript
// app/actions/your-component.actions.ts
"use server"

import { requirePermission } from "@/lib/server-permissions"

export async function createYourComponent(data: YourComponentData) {
  // Check add permission
  await requirePermission("your-resource-id", "add")
  
  // Your create logic here
}

export async function updateYourComponent(id: string, data: YourComponentData) {
  // Check edit permission
  await requirePermission("your-resource-id", "edit")
  
  // Your update logic here
}

export async function deleteYourComponent(id: string) {
  // Check delete permission
  await requirePermission("your-resource-id", "delete")
  
  // Your delete logic here
}
```

### C. Client Components (UI Elements)

```typescript
// app/(dashboard)/your-component/your-component-form.tsx
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"
import { Button } from "@/components/ui/button"

export default function YourComponentForm() {
  const { has } = usePermissions()

  return (
    <div>
      {/* Show add button only if user has add permission */}
      {has("your-resource-id", "add") && (
        <Button>Add New</Button>
      )}
      
      {/* Show edit button only if user has edit permission */}
      {has("your-resource-id", "edit") && (
        <Button>Edit</Button>
      )}
      
      {/* Show delete button only if user has delete permission */}
      {has("your-resource-id", "delete") && (
        <Button variant="destructive">Delete</Button>
      )}
    </div>
  )
}
```

### D. List Page with Actions

```typescript
// app/(dashboard)/your-component/page.tsx
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import YourComponentActions from "./your-component-actions"

export default async function YourComponentPage() {
  const canView = await checkRouteAccess("/your-route")
  
  if (!canView) {
    redirect("/unauthorized-access")
  }

  return (
    <div>
      <YourComponentActions />
      {/* Your list content */}
    </div>
  )
}
```

```typescript
// app/(dashboard)/your-component/your-component-actions.tsx
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function YourComponentActions() {
  const { has } = usePermissions()

  return (
    <div className="flex justify-end gap-2">
      {has("your-resource-id", "add") && (
        <Link href="/your-route/add">
          <Button>Add New</Button>
        </Link>
      )}
    </div>
  )
}
```

### E. Record Actions (Edit/Delete in Table)

```typescript
// app/(dashboard)/your-component/record-actions.tsx
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"

export default function YourComponentRecordActions({ row }: any) {
  const { has } = usePermissions()
  const item = row.original

  return (
    <DataTableRowActions>
      {has("your-resource-id", "edit") && (
        <DropdownMenuItem onClick={() => {/* Edit logic */}}>
          Edit
        </DropdownMenuItem>
      )}
      {has("your-resource-id", "delete") && (
        <DropdownMenuItem onClick={() => {/* Delete logic */}}>
          Delete
        </DropdownMenuItem>
      )}
    </DataTableRowActions>
  )
}
```

## Step 4: Add to Navigation (Optional)

If you want to add it to the sidebar navigation, update `app/(dashboard)/layout.tsx`:

```typescript
// In DesktopNav and MobileNav functions
<NavLink
  href={hasAccess('/your-route') ? '/your-route' : 'unauthorized-access'}
  label="Your Component"
  icon={<YourIcon className="h-5 w-5" />}
/>
```

## Complete Example: Adding a "Products" Component

### 1. Update `types/user-group.ts`:
```typescript
export const RESOURCES = [
  // ... existing
  { id: "products", name: "Products" },
] as const;
```

### 2. Update `lib/permissions.ts`:
```typescript
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  // ... existing
  "/products": "products",
}
```

### 3. Create `app/(dashboard)/products/page.tsx`:
```typescript
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import { getAllProducts } from "@/app/actions/product.actions"
import ProductsList from "./products-list"

export default async function ProductsPage() {
  const canView = await checkRouteAccess("/products")
  
  if (!canView) {
    redirect("/unauthorized-access")
  }

  const { data } = await getAllProducts()

  return <ProductsList data={data} />
}
```

### 4. Create `app/actions/product.actions.ts`:
```typescript
"use server"

import { requirePermission } from "@/lib/server-permissions"
import { saveProduct, updateProduct, deleteProduct } from "@/services/product.service"

export async function createProduct(data: ProductData) {
  await requirePermission("products", "add")
  // ... create logic
}

export async function updateProductAction(id: string, data: ProductData) {
  await requirePermission("products", "edit")
  // ... update logic
}

export async function deleteProductAction(id: string) {
  await requirePermission("products", "delete")
  // ... delete logic
}
```

### 5. Create `app/(dashboard)/products/products-list.tsx`:
```typescript
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProductsList({ data }: { data: any[] }) {
  const { has } = usePermissions()

  return (
    <div>
      {has("products", "add") && (
        <Link href="/products/add">
          <Button>Add Product</Button>
        </Link>
      )}
      {/* List content */}
    </div>
  )
}
```

## Summary Checklist

When adding a new component, make sure to:

- [ ] Add resource to `RESOURCES` in `types/user-group.ts`
- [ ] Add route mapping in `ROUTE_TO_RESOURCE` in `lib/permissions.ts`
- [ ] Add permission check in page component (server-side)
- [ ] Add permission checks in server actions (`requirePermission`)
- [ ] Add permission checks in client components (`usePermissions` hook)
- [ ] Protect add/edit/delete buttons with permission checks
- [ ] (Optional) Add to navigation menu

That's it! The permission system will automatically:
- Show the resource in User Group permissions form
- Protect routes via middleware
- Allow admins to grant permissions to user groups
