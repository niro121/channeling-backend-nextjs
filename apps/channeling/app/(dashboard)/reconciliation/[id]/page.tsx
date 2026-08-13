import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userTypes } from "@/lib/roles"
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

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.userType === userTypes.admin
  const assignedTo = result.reconciliationAssignedToUserId
  const canActAsReconciler =
    isAdmin || !assignedTo || assignedTo === session?.user?.id

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
    <ReconciliationDocumentView
      topLevelHandoverId={id}
      chain={chain}
      canActAsReconciler={canActAsReconciler}
    />
  )
}
