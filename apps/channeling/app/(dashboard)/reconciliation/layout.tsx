import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function ReconciliationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const canView = await checkRouteAccess("/reconciliation")
  if (!canView) redirect("/unauthorized-access")
  return <>{children}</>
}
