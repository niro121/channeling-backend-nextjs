"use client"

import { useChannelBooking } from "../../context/channel-booking-context"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/**
 * Referred tab: optional Referred Doctor, Referred Agency, Referred Staff.
 * Selections are stored in context and saved with the booking when user clicks Book Now in New Booking Details.
 */
export function ReferredTab() {
  const {
    initialData,
    referredDoctorId,
    referredAgencyId,
    referredStaffId,
    setReferredDoctorId,
    setReferredAgencyId,
    setReferredStaffId,
  } = useChannelBooking()

  const doctors = initialData?.doctors ?? []
  const agencies = initialData?.agencies ?? []
  const staffOptions = initialData?.staffOptions ?? []

  const NONE = "__none__"

  return (
    <div className="space-y-3">
      <Select
        value={referredDoctorId ?? NONE}
        onValueChange={(v) => setReferredDoctorId(v === NONE ? null : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-md border border-input bg-background text-sm text-foreground">
          <SelectValue placeholder="Select Referred Doctor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">Select Referred Doctor</span>
          </SelectItem>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {[d.title, d.name].filter(Boolean).join(" ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={referredAgencyId ?? NONE}
        onValueChange={(v) => setReferredAgencyId(v === NONE ? null : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-md border border-input bg-background text-sm text-foreground">
          <SelectValue placeholder="Select Referred Agency" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">Select Referred Agency</span>
          </SelectItem>
          {agencies.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={referredStaffId ?? NONE}
        onValueChange={(v) => setReferredStaffId(v === NONE ? null : v)}
      >
        <SelectTrigger className="h-9 w-full rounded-md border border-input bg-background text-sm text-foreground">
          <SelectValue placeholder="Select Referred Staff" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>
            <span className="text-muted-foreground">Select Referred Staff</span>
          </SelectItem>
          {staffOptions.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} {s.code ? `(${s.code})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
