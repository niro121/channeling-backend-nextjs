import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function HandoversLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const canView = await checkRouteAccess("/handovers")
  if (!canView) redirect("/unauthorized-access")
  return <>{children}</>
}
