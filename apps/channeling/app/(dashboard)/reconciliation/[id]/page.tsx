import { notFound } from "next/navigation"
import { getReconciliationDocumentAction } from "@/app/actions/reconciliation.actions"
import { ReconciliationDocumentView, type HandoverTabData } from "./reconciliation-document-view"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ReconciliationDocumentPage({ params }: Props) {
  const { id } = await params

  const result = await getReconciliationDocumentAction(id)

  if (!result.success || !("chain" in result)) {
    notFound()
  }

  const chain: HandoverTabData[] = result.chain.map((tab) => ({
    handover: {
      ...tab.handover,
      shift: {
        ...tab.handover.shift,
        startedAt:
          tab.handover.shift.startedAt instanceof Date
            ? tab.handover.shift.startedAt.toISOString()
            : String(tab.handover.shift.startedAt),
      },
      createdAt:
        tab.handover.createdAt instanceof Date
          ? tab.handover.createdAt.toISOString()
          : String(tab.handover.createdAt),
    },
    receipts: tab.receipts.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      reconciledAt:
        r.reconciledAt instanceof Date ? r.reconciledAt.toISOString() : (r.reconciledAt ?? null),
    })),
  }))

  return (
    <ReconciliationDocumentView topLevelHandoverId={id} chain={chain} />
  )
}
