import { ChannelRoomSessionClient } from "./channel-room-session-client"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect } from "next/navigation"

export default async function ChannelRoomSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const canView = await checkRouteAccess("/channel-room-dashboard")
  if (!canView) {
    redirect("/unauthorized-access")
  }
  const { sessionId } = await params
  return <ChannelRoomSessionClient sessionId={sessionId} />
}
