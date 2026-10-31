import { ChannelRoomDashboardClient } from "./channel-room-dashboard-client"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function ChannelRoomDashboardPage() {
  const canView = await checkRouteAccess("/channel-room-dashboard")
  if (!canView) {
    redirect("/unauthorized-access")
  }
  return <ChannelRoomDashboardClient />
}
