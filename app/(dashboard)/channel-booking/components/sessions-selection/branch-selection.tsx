"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BranchOption } from "./session-date-utils"

export type BranchSelectionProps = {
  options: BranchOption[]
  value: string | null
  onChange: (locationId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function BranchSelection({
  options,
  value,
  onChange,
  placeholder = "Select branch",
  disabled,
  className,
}: BranchSelectionProps) {
  return (
    <Select
      value={value ?? ""}
      onValueChange={(v) => onChange(v || null)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
