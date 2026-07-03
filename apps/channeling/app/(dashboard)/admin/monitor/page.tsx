import { redirect } from "next/navigation"
import { fetchServerSession } from "@/lib/session"
import { userTypes } from "@/lib/roles"
import { MonitorDashboard } from "./monitor-dashboard"

export default async function AdminMonitorPage() {
  const session = await fetchServerSession()
  if (!session?.user) {
    redirect("/login")
  }
  const userType = (session.user as { userType?: number }).userType
  if (userType !== userTypes.admin) {
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
