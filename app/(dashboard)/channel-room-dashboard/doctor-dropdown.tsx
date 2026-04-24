"use client"

import type { ChannelBookingDoctorOption } from "@/services/channel-booking/reference/get-doctors.service"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type DoctorDropdownProps = {
  doctors: ChannelBookingDoctorOption[]
  value: string
  onChange: (doctorId: string) => void
  disabled?: boolean
  label?: string
  placeholder?: string
}

/**
 * Reusable doctor dropdown for channel-room dashboard flows.
 */
export function DoctorDropdown({
  doctors,
  value,
  onChange,
  disabled,
  label = "Doctor",
  placeholder = "Select doctor",
}: DoctorDropdownProps) {
  return (
    <div className="space-y-1.5 min-w-[200px] flex-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {doctors.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {[d.title, d.name].filter(Boolean).join(" ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

