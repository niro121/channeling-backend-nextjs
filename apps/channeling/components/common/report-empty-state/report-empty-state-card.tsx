"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  title?: string
  description: React.ReactNode
  variant?: "empty" | "error"
}

export function ReportEmptyStateCard({
  title = "No data",
  description,
  variant = "empty",
}: Props) {
  const isError = variant === "error"
  return (
    <Card className={isError ? "border-destructive/50 bg-destructive/5" : "border-dashed"}>
      <CardContent className="py-8">
        <div className="max-w-2xl">
          <p className={`text-sm font-medium ${isError ? "text-destructive" : "text-muted-foreground"}`}>
            {title}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

