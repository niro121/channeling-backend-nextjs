"use client"

import * as React from "react"
import { SearchableUserMultiSelect } from "./searchable-user-multi-select"
import type { ReportUserOption } from "./report-user-select"

type Props = {
  userOptions: ReportUserOption[]
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  placeholder?: string
  widthClassName?: string
  maxCount?: number
}

export function ReportUserMultiSelect({
  userOptions,
  value,
  onChange,
  label = "Select User",
  placeholder = "All Users",
  widthClassName = "w-[280px]",
  maxCount = 3,
}: Props) {
  return (
    <div className="flex-shrink-0">
      <label className="text-sm font-semibold mb-2 block">{label}</label>
      <div className={widthClassName}>
        <SearchableUserMultiSelect
          options={userOptions}
          value={value}
          onChange={onChange}
          label="user"
          placeholder={placeholder}
          maxCount={maxCount}
        />
      </div>
    </div>
  )
}
