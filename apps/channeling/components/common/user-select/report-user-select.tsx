"use client"

import * as React from "react"
import { SearchableUserSelect } from "./searchable-user-select"

export type ReportUserOption = { id: string; name: string }

type Props = {
  /** Usually the server-provided list (without the __all__ option). */
  userOptions: ReportUserOption[]
  value: string
  onChange: (value: string) => void
  /** Label text shown above the select. */
  label?: string
  /** Trigger placeholder. */
  placeholder?: string
  /** Width class wrapper (default matches existing reports). */
  widthClassName?: string
  /** Include the "All Users" option (default: true). */
  includeAllUsers?: boolean
}

export function ReportUserSelect({
  userOptions,
  value,
  onChange,
  label = "Select User",
  placeholder = "Select user",
  widthClassName = "w-[200px]",
  includeAllUsers = true,
}: Props) {
  const options = React.useMemo(
    () => (includeAllUsers ? [{ id: "__all__", name: "All Users" }, ...userOptions] : userOptions),
    [includeAllUsers, userOptions]
  )

  return (
    <div className="flex-shrink-0">
      <label className="text-sm font-semibold mb-2 block">{label}</label>
      <div className={widthClassName}>
        <SearchableUserSelect
          options={options}
          value={value}
          onChange={onChange}
          label="user"
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

