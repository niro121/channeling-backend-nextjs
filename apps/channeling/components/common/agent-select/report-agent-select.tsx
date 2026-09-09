"use client"

import * as React from "react"
import { Combobox } from "@/components/common/combobox"

export type ReportAgentOption = { id: string; name: string }

type Props = {
  agentOptions: ReportAgentOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  /** Include the "All Agents" option (default: true). */
  includeAllAgents?: boolean
  /** The value used for "All Agents" (default: "__all__"). */
  allAgentsValue?: string
  /** When true, show clear icon when selection differs from default. */
  clearable?: boolean
}

export function ReportAgentSelect({
  agentOptions,
  value,
  onChange,
  label = "Agent",
  includeAllAgents = true,
  allAgentsValue = "__all__",
  clearable = false,
}: Props) {
  const options = React.useMemo(() => {
    const base = includeAllAgents ? [{ id: allAgentsValue, name: "All Agents" }, ...agentOptions] : agentOptions
    // avoid duplicate __all__ if caller already included it
    const seen = new Set<string>()
    return base.filter((o) => {
      if (seen.has(o.id)) return false
      seen.add(o.id)
      return true
    })
  }, [agentOptions, includeAllAgents, allAgentsValue])

  return (
    <Combobox
      label={label}
      options={options}
      value={value}
      defaultValue={allAgentsValue}
      clearable={clearable}
      onChange={(v) => onChange(v ?? allAgentsValue)}
    />
  )
}

