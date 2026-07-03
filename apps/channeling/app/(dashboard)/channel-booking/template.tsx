/**
 * Template re-mounts on navigation (unlike layout which persists).
 * Keeps channel-booking state fresh when re-entering the page.
 */
export default function ChannelBookingTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
