"use client"

import * as React from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown, X } from "lucide-react"
import type { SearchableUserOption } from "./searchable-user-select"

type SearchableUserMultiSelectProps = {
  options: SearchableUserOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  disabled?: boolean
  label?: string
  className?: string
  /** Max chips before "+N more". Default 3. */
  maxCount?: number
}

function sortByName(options: SearchableUserOption[]): SearchableUserOption[] {
  return [...options].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  )
}

/**
 * Searchable multi-user select with chip badges in the trigger.
 * Empty `value` means no specific cashiers selected (caller may treat as All Users).
 */
export function SearchableUserMultiSelect({
  options,
  value,
  onChange,
  placeholder = "All Users",
  disabled = false,
  label = "user",
  className,
  maxCount = 3,
}: SearchableUserMultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const sorted = React.useMemo(() => sortByName(options), [options])
  const selectedSet = React.useMemo(() => new Set(value), [value])
  const selectedOptions = React.useMemo(
    () => sorted.filter((o) => selectedSet.has(o.id)),
    [sorted, selectedSet]
  )

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  const clear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
          className={cn(
            "flex h-auto min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-sm font-normal ring-offset-background hover:bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            selectedOptions.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1 min-w-0 pr-2">
            {selectedOptions.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              <>
                {selectedOptions.slice(0, maxCount).map((opt) => (
                  <Badge
                    key={opt.id}
                    variant="secondary"
                    className="max-w-[10rem] gap-1 font-normal"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(opt.id)
                    }}
                  >
                    <span className="truncate">{opt.name}</span>
                    <X className="h-3 w-3 shrink-0 opacity-70" />
                  </Badge>
                ))}
                {selectedOptions.length > maxCount && (
                  <Badge variant="outline" className="font-normal">
                    +{selectedOptions.length - maxCount} more
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {selectedOptions.length > 0 && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={clear}
                aria-label="Clear selection"
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label}…`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear_all__"
                onSelect={() => {
                  onChange([])
                }}
              >
                <span className="text-muted-foreground">All Users</span>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4 shrink-0",
                    selectedOptions.length === 0 ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              {sorted.map((option) => {
                const isSelected = selectedSet.has(option.id)
                return (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => toggle(option.id)}
                  >
                    <span className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate">{option.name}</span>
                      {option.isBulkCashier && (
                        <Badge variant="secondary" className="text-xs font-normal shrink-0">
                          Bulk Cashier
                        </Badge>
                      )}
                    </span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
