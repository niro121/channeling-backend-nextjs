import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { checkRouteAccess } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { ChannelBookingView } from "./components/channel-booking-view"

/**
 * Channel Booking page – server component.
 * Handles auth only; UI lives in client ChannelBookingView (context + lazy-loaded components).
 */
export default async function ChannelBookingPage() {
  const canView = await checkRouteAccess("/channel-booking")
  if (!canView) {
    redirect("/unauthorized-access")
  }
  const session = await getServerSession(authOptions)
  if (session?.user?.id) {
    logActivityNonBlocking({
      userId: session.user.id,
      action: "channel-booking.visited",
      entityType: "ChannelBooking",
      importance: "low",
    })
  }

  return <ChannelBookingView />
}
