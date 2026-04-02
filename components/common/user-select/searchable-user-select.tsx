"use client"

import * as React from "react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"

export type SearchableUserOption = {
  id: string
  name: string
  isBulkCashier?: boolean
}

type SearchableUserSelectProps = {
  options: SearchableUserOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Optional label for the trigger when nothing selected; also used in search placeholder */
  label?: string
  className?: string
}

/** Sorts options by name ascending (locale-aware). */
function sortByName(options: SearchableUserOption[]): SearchableUserOption[] {
  return [...options].sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" })
  )
}

export function SearchableUserSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  disabled = false,
  label = "user",
  className,
}: SearchableUserSelectProps) {
  const [open, setOpen] = React.useState(false)
  const sorted = React.useMemo(() => sortByName(options), [options])
  const selected = sorted.find((o) => o.id === value)
  const displayName = selected?.name || ""

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-normal ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            !displayName && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate flex items-center gap-2">
            {displayName || placeholder}
            {selected?.isBulkCashier && (
              <Badge variant="secondary" className="text-xs font-normal shrink-0">
                Bulk Cashier
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[12rem] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label}…`} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
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
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

