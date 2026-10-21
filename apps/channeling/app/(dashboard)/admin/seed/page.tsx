import { redirect } from "next/navigation"
import { checkRouteAccess } from "@/lib/server-permissions"
import { SeedActionsClient } from "./seed-actions-client"

export default async function AdminSeedPage() {
  const canView = await checkRouteAccess("/admin/seed")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Database seeds</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Trigger seed scripts from the admin UI. These operations modify or replace data; use with
          care. Seeds run only when <code className="rounded bg-muted px-1">SEED_HELPER=true</code> (or{" "}
          <code className="rounded bg-muted px-1">SEED_HELPER=1</code>) is set in .env.
        </p>
      </div>
      <SeedActionsClient />
    </div>
  )
}
