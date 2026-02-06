import { redirect } from "next/navigation"
import { checkRouteAccess } from "@/lib/server-permissions"
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

  return <ChannelBookingView />
}
