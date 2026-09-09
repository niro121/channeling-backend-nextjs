import { ShiftGate } from "./shift-gate"
import {
  getBulkCashierShiftMaxHours,
  getDefaultShiftMaxHours,
} from "@/lib/shift-duration"

export default function ChannelBookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ShiftGate
      shiftMaxHours={getDefaultShiftMaxHours()}
      bulkCashierShiftMaxHours={getBulkCashierShiftMaxHours()}
    >
      {children}
    </ShiftGate>
  )
}
