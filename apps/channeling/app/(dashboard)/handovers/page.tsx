"use client"

import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import HandoversPageClient from "./handovers-page-client"

export default function HandoversPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <HandoversPageClient />
    </Suspense>
  )
}
