import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"
import SmsActivityContent from "./sms-activity-content"

export const dynamic = "force-dynamic"

export default async function SmsActivityReportPage() {
  const canView = await checkRouteAccess("/reports")
  if (!canView) redirect("/unauthorized-access")

  return (
    <div className="container mx-auto py-6">
      <SmsActivityContent />
    </div>
  )
}
