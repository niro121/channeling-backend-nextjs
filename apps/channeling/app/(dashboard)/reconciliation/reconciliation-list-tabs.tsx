"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReconciliationListTab } from "@/services/reconciliation.service"

const TABS: { value: ReconciliationListTab; label: string }[] = [
  { value: "reconciliation", label: "Reconciliation" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export function ReconciliationListTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") as ReconciliationListTab) || "reconciliation"
  const limit = searchParams.get("limit") || "20"
  const validTab = TABS.some((t) => t.value === tab) ? tab : "reconciliation"

  const onTabChange = (value: string) => {
    const params = new URLSearchParams()
    params.set("tab", value)
    params.set("page", "1")
    params.set("limit", limit)
    router.replace(`/reconciliation?${params.toString()}`)
  }

  return (
    <Tabs value={validTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        {TABS.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="cursor-pointer">
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
