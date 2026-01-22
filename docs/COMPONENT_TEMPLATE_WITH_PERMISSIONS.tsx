/**
 * TEMPLATE: Component with Permission Checks
 * 
 * Copy this template when creating a new component that needs permission checks.
 * Replace "your-resource" with your actual resource ID.
 */

// ============================================
// STEP 1: Add to types/user-group.ts
// ============================================
/*
export const RESOURCES = [
  // ... existing
  { id: "your-resource", name: "Your Resource Name" },
] as const;
*/

// ============================================
// STEP 2: Add to lib/permissions.ts
// ============================================
/*
export const ROUTE_TO_RESOURCE: Record<string, string> = {
  // ... existing
  "/your-route": "your-resource",
}
*/

// ============================================
// STEP 3: Page Component (Server)
// ============================================
/*
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function YourComponentPage() {
  // Check view permission
  const canView = await checkRouteAccess("/your-route")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  // Your page content
  return <div>Your Component</div>
}
*/

// ============================================
// STEP 4: Server Actions
// ============================================
/*
"use server"

import { requirePermission } from "@/lib/server-permissions"

export async function createYourResource(data: YourResourceData) {
  await requirePermission("your-resource", "add")
  // ... create logic
}

export async function updateYourResource(id: string, data: YourResourceData) {
  await requirePermission("your-resource", "edit")
  // ... update logic
}

export async function deleteYourResource(id: string) {
  await requirePermission("your-resource", "delete")
  // ... delete logic
}
*/

// ============================================
// STEP 5: Client Component with Buttons
// ============================================
/*
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function YourComponentActions() {
  const { has } = usePermissions()

  return (
    <div className="flex justify-end gap-2">
      {has("your-resource", "add") && (
        <Link href="/your-route/add">
          <Button>Add New</Button>
        </Link>
      )}
    </div>
  )
}
*/

// ============================================
// STEP 6: Record Actions (Table Row Actions)
// ============================================
/*
"use client"

import { usePermissions } from "@/components/hooks/use-permissions"
import { DataTableRowActions } from "@/components/common/custom-table-row-actions"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export default function YourComponentRecordActions({ row }: any) {
  const { has } = usePermissions()
  const item = row.original

  return (
    <DataTableRowActions>
      {has("your-resource", "edit") && (
        <DropdownMenuItem onClick={() => {/* Edit */}}>
          Edit
        </DropdownMenuItem>
      )}
      {has("your-resource", "delete") && (
        <DropdownMenuItem onClick={() => {/* Delete */}}>
          Delete
        </DropdownMenuItem>
      )}
    </DataTableRowActions>
  )
}
*/
