# Permission System - Quick Reference

## Adding a New Component to Permission System

### Step 1: Add Resource (2 files to update)

**File 1: `types/user-group.ts`**
```typescript
export const RESOURCES = [
  // ... existing resources
  { id: "your-resource", name: "Your Resource" }, // Add here
] as const;
```

**File 2: `lib/permissions.ts`**
```typescript
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  // ... existing mappings
  "/your-route": "your-resource", // Add here
}
```

✅ **That's it!** The resource will automatically appear in the User Group permissions form. Sidebar links for that route are hidden when the user has no **view** permission.

### Current route → resource mappings (sidebar-gated)

| Route | Resource |
|-------|----------|
| `/users` | users |
| `/user-groups` | users |
| `/channel-booking` | channel-booking |
| `/sessions` | sessions |
| `/doctors` | doctors |
| `/doctor-sessions` | doctor-sessions |
| `/doctor-leaves` | doctor-leaves |
| `/specialities` | specialities |
| `/departments` | departments |
| `/patients` | patients |
| `/staff` | staff |
| `/tags` | tags |
| `/zones` | zones |
| `/rooms` | rooms |
| `/locations` | locations |
| `/agency-books` | agency-books |
| `/agencies` | agencies |
| `/discounts` | discounts |
| `/sms-playground` | sms-playground |
| `/reports` | reports |

---

## Permission Check Patterns

### Pattern 1: Server Component (Page)
```typescript
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function MyPage() {
  const canView = await checkRouteAccess("/my-route")
  if (!canView) redirect("/unauthorized-access")
  
  return <div>Page Content</div>
}
```

### Pattern 2: Server Action (Create)
```typescript
"use server"
import { requirePermission } from "@/lib/server-permissions"

export async function createItem(data: ItemData) {
  await requirePermission("resource-id", "add")
  // ... create logic
}
```

### Pattern 3: Server Action (Update)
```typescript
export async function updateItem(id: string, data: ItemData) {
  await requirePermission("resource-id", "edit")
  // ... update logic
}
```

### Pattern 4: Server Action (Delete)
```typescript
export async function deleteItem(id: string) {
  await requirePermission("resource-id", "delete")
  // ... delete logic
}
```

### Pattern 5: Client Component (Buttons)
```typescript
"use client"
import { usePermissions } from "@/components/hooks/use-permissions"

export function MyComponent() {
  const { has } = usePermissions()
  
  return (
    <>
      {has("resource-id", "add") && <Button>Add</Button>}
      {has("resource-id", "edit") && <Button>Edit</Button>}
      {has("resource-id", "delete") && <Button>Delete</Button>}
    </>
  )
}
```

### Pattern 6: Table Actions
```typescript
"use client"
import { usePermissions } from "@/components/hooks/use-permissions"

export function RecordActions({ row }: any) {
  const { has } = usePermissions()
  
  return (
    <DataTableRowActions>
      {has("resource-id", "edit") && (
        <DropdownMenuItem>Edit</DropdownMenuItem>
      )}
      {has("resource-id", "delete") && (
        <DropdownMenuItem>Delete</DropdownMenuItem>
      )}
    </DataTableRowActions>
  )
}
```

---

## Permission Actions

- `"view"` - Can view/list items (GET, list pages)
- `"add"` - Can create items (POST, add pages)
- `"edit"` - Can update items (PUT/PATCH, edit pages)
- `"delete"` - Can delete items (DELETE, delete actions)

---

## Important Notes

1. **Admin users** (userType = 1) automatically have all permissions
2. **Route protection** is automatic via middleware once you add the route mapping
3. **User Group form** automatically shows new resources once added to RESOURCES array
4. **No need to manually update** the user group form - it reads from RESOURCES

---

## Example: Complete Implementation

Let's say you're adding a "Products" component:

### 1. Add to `types/user-group.ts`:
```typescript
{ id: "products", name: "Products" },
```

### 2. Add to `lib/permissions.ts`:
```typescript
"/products": "products",
```

### 3. Protect your page:
```typescript
// app/(dashboard)/products/page.tsx
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function ProductsPage() {
  if (!await checkRouteAccess("/products")) {
    redirect("/unauthorized-access")
  }
  // ... rest of page
}
```

### 4. Protect your actions:
```typescript
// app/actions/product.actions.ts
export async function createProduct(data: any) {
  await requirePermission("products", "add")
  // ... create
}
```

### 5. Protect your UI:
```typescript
// In your component
const { has } = usePermissions()
{has("products", "add") && <AddButton />}
```

✅ Done! The "Products" resource will now appear in User Group permissions automatically!
