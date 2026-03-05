"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableSelector } from "@/components/common/searchable-selector"
import type { ReferenceSelectOption } from "@/types/reference"

const SEARCHABLE_THRESHOLD = 10

export type ReferenceSelectProps = {
  options: ReferenceSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
  className?: string
  /** Optional "all" option value (e.g. __all__); when set, first option in dropdown is "All ..." with this value. */
  allOptionValue?: string
  allOptionLabel?: string
  disabled?: boolean
}

/**
 * Reference dropdown (agencies, locations, doctors, staff).
 * Uses searchable selector when options.length > 10, otherwise plain Select.
 * Options must already be sorted alphabetically and have name = "Name (CODE)" format.
 */
export function ReferenceSelect({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label = "Select",
  required,
  className,
  allOptionValue,
  allOptionLabel,
  disabled,
}: ReferenceSelectProps) {
  const useSearchable = options.length > SEARCHABLE_THRESHOLD
  const selectOptions = useSearchable
    ? options.map((o) => ({ id: o.id, name: o.name }))
    : options
  const optionsWithAll =
    useSearchable && allOptionValue != null
      ? [
          { id: allOptionValue, name: allOptionLabel ?? `All ${label}` },
          ...selectOptions,
        ]
      : selectOptions

  if (useSearchable) {
    return (
      <SearchableSelector
        label={allOptionLabel ?? (allOptionValue != null ? `All ${label}` : label)}
        options={optionsWithAll}
        value={value}
        onChange={onChange}
        defaultValue={allOptionValue}
        className={className}
        disabled={disabled}
        placeholder={placeholder}
      />
    )
  }

  return (
    <Select
      value={value || (allOptionValue ? allOptionValue : undefined)}
      onValueChange={onChange}
      required={required}
      disabled={disabled}
    >
      <SelectTrigger className={className} id={label ? `ref-select-${label.replace(/\s/g, "-")}` : undefined}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allOptionValue != null && (
          <SelectItem value={allOptionValue}>
            {allOptionLabel ?? `All ${label}`}
          </SelectItem>
        )}
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
