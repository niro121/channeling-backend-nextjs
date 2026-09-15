import React from "react"
import { checkRouteAccess } from "@/lib/server-permissions"
import { redirect, notFound } from "next/navigation"
import { getLedgerReceipt } from "@/app/actions/ledger/get-ledger-receipt.action"
import { BackButton } from "@/components/common/back-button"
import { LedgerReceiptView } from "../../ledger-receipt-view"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function LedgerEditPage({ params }: PageProps) {
  const canView = await checkRouteAccess("/ledger")
  if (!canView) {
    redirect("/unauthorized-access")
  }

  const { id } = await params
  const result = await getLedgerReceipt(id)

  if (!result.success || !result.data) {
    notFound()
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Edit Ledger Transaction</h2>
        <BackButton href="/ledger" />
      </div>
      <div className="h-full flex-1 flex-col space-y-8">
        <LedgerReceiptView receipt={result.data} />
      </div>
    </div>
  )
}
