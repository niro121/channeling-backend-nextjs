"use client"

import React from "react"

export type ReportGenerationDetailsItem = {
  label: string
  value: React.ReactNode
  /** Optional column span on small screens. */
  smColSpan?: 1 | 2
  /** Optional column span on large screens. */
  lgColSpan?: 1 | 2 | 3 | 4
}

type Props = {
  title?: string
  items: ReportGenerationDetailsItem[]
}

export function ReportGenerationDetailsCard({
  title = "Report Generation Details",
  items,
}: Props) {
  return (
    <div className="rounded-md border border-primary/30 bg-primary/5 shadow-sm px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 border-l-2 border-primary pl-2">
        <p className="text-[11px] font-semibold tracking-wide text-primary">
          {title}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, idx) => (
          <div
            key={`${it.label}-${idx}`}
            className={[
              "space-y-0.5",
              it.smColSpan === 2 ? "sm:col-span-2" : "",
              it.lgColSpan != null ? `lg:col-span-${it.lgColSpan}` : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {it.label}
            </p>
            <div className="text-[11px] leading-tight font-medium">
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

