"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  title?: string
  description: React.ReactNode
}

export function ReportEmptyStateCard({
  title = "No data",
  description,
}: Props) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}

