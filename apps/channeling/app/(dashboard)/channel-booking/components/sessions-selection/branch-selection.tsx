"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import type { BranchOption } from "./session-date-utils"

const ALL_BRANCHES_VALUE = "__all__"

function BranchColorDot({ color }: { color?: string | null }) {
  if (!color) {
    return (
      <span
        className="inline-block size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground/50"
        aria-hidden
      />
    )
  }
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full border border-black/10"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  )
}

function BranchLabel({
  name,
  color,
}: {
  name: string
  color?: string | null
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left">
      <BranchColorDot color={color} />
      <span className="truncate leading-none">{name}</span>
    </div>
  )
}

export type BranchSelectionProps = {
  options: BranchOption[]
  value: string | null
  onChange: (locationId: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** When set, adds an "all branches" option that clears the filter (value → null). */
  allOptionLabel?: string
}

export function BranchSelection({
  options,
  value,
  onChange,
  placeholder = "Select branch",
  disabled,
  className,
  allOptionLabel,
}: BranchSelectionProps) {
  const selectValue = value
    ? value
    : allOptionLabel
      ? ALL_BRANCHES_VALUE
      : undefined

  const canClear = Boolean(allOptionLabel && value && !disabled)
  const selected = value ? options.find((o) => o.id === value) : null

  return (
    <div
      className={cn(
        "flex h-8 w-full min-w-0 items-center overflow-hidden rounded-md border border-input bg-background",
        className
      )}
    >
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (!v || v === ALL_BRANCHES_VALUE) onChange(null)
          else onChange(v)
        }}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-2 py-0 text-xs shadow-none",
            "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0",
            // Keep label row intact (SelectTrigger line-clamps direct spans)
            "[&>span]:line-clamp-none"
          )}
        >
          {selected ? (
            <BranchLabel name={selected.name} color={selected.color} />
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {allOptionLabel && (
            <SelectItem value={ALL_BRANCHES_VALUE}>{allOptionLabel}</SelectItem>
          )}
          {options.map((opt) => (
            <SelectItem key={opt.id} value={opt.id}>
              <BranchLabel name={opt.name} color={opt.color} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canClear && (
        <button
          type="button"
          aria-label="Clear branch filter"
          className="inline-flex h-full w-8 shrink-0 items-center justify-center border-l border-input text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}
