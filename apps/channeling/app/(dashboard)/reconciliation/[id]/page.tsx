import { notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { userTypes } from "@/lib/roles"
import { getReconciliationDocumentAction } from "@/app/actions/reconciliation.actions"
import { RECONCILIATION_STATUS } from "@/types/handover"
import { ReconciliationDocumentView, type HandoverTabData } from "./reconciliation-document-view"

type Props = {
  params: Promise<{ id: string }>
}

export default async function ReconciliationDocumentPage({ params }: Props) {
  const { id } = await params

  const result = await getReconciliationDocumentAction(id)

  if (!result.success || !("chain" in result)) {
    if (result.success === false && result.error === "Handover not found.") {
      notFound()
    }
    return (
      <div className="flex-1 space-y-2 p-8 pt-6">
        <h2 className="text-2xl font-bold tracking-tight">Reconciliation document</h2>
        <p className="text-sm text-muted-foreground">
          {result.success === false ? result.error : "This handover cannot be opened."}
        </p>
      </div>
    )
  }

  const session = await getServerSession(authOptions)
  const isAdmin = session?.user?.userType === userTypes.admin
  const assignedTo = result.reconciliationAssignedToUserId
  const isOpen = result.reconciliationStatus === RECONCILIATION_STATUS.IN_RECONCILIATION
  const canActAsReconciler =
    isOpen && (isAdmin || !assignedTo || assignedTo === session?.user?.id)

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
      cannotReconcileAt:
        r.cannotReconcileAt instanceof Date
          ? r.cannotReconcileAt.toISOString()
          : (r.cannotReconcileAt ?? null),
      cannotReconcileReason: r.cannotReconcileReason ?? null,
    })),
  }))

  return (
    <ReconciliationDocumentView
      topLevelHandoverId={id}
      chain={chain}
      canActAsReconciler={canActAsReconciler}
      reconciliationStatus={result.reconciliationStatus}
      reconciliationRejectReason={result.reconciliationRejectReason}
    />
  )
}
