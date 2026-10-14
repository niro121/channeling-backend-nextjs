import { redirect } from "next/navigation"
import { checkRouteAccess } from "@/lib/server-permissions"
import { MonitorDashboard } from "./monitor-dashboard"

export default async function AdminMonitorPage() {
  const canView = await checkRouteAccess("/admin/monitor")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Server monitor</h1>
        <p className="text-muted-foreground text-sm">
          Socket connections, memory, and uptime. Values in red are in the danger zone.
        </p>
      </div>
      <MonitorDashboard />
    </div>
  )
}
