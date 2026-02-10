import { ShiftGate } from "./shift-gate"

const SHIFT_MAX_HOURS = Number(process.env.SHIFT_MAX_DURATION_HOURS) || 36

export default function ChannelBookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ShiftGate shiftMaxHours={SHIFT_MAX_HOURS}>
      {children}
    </ShiftGate>
  )
}
