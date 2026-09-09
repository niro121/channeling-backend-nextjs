import { redirect } from "next/navigation"
import { checkRouteAccess } from "@/lib/server-permissions"
import { PublicApiPlayground } from "./playground-client"

export default async function PublicApiPlaygroundPage() {
  const canView = await checkRouteAccess("/admin/api-clients")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Public API Playground</h1>
        <p className="text-muted-foreground text-sm">
          Test the public API: get an access token with client credentials, then call the sessions endpoint. Use an API client from the list (client_id and client_secret).
        </p>
      </div>
      <PublicApiPlayground />
    </div>
  )
}
