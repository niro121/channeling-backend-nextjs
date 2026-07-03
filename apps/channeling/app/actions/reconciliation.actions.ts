"use server"

import { requirePermission } from "@/lib/server-permissions"
import {
  listHandoversForReconciliation,
  getReconciliationDocument,
  submitHandoverReconciliation,
  rejectHandoverReconciliation,
  sendHandoverToReconciliation,
  getReconciliationUserOptions,
  type SubmitReconciliationPayload,
  type ReconciliationListTab,
} from "@/services/reconciliation.service"
import { revalidatePath } from "next/cache"

export async function getReconciliationListAction(params: {
  page?: number
  limit?: number
  keyword?: string
  tab?: ReconciliationListTab
  dateFrom?: string | null
  dateTo?: string | null
  fromUserId?: string | null
  toUserId?: string | null
}) {
  await requirePermission("reconciliation", "view")
  return listHandoversForReconciliation({
    page: params.page,
    limit: params.limit,
    keyword: params.keyword,
    tab: params.tab,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    fromUserId: params.fromUserId,
    toUserId: params.toUserId,
  })
}

export async function getReconciliationUserOptionsAction() {
  await requirePermission("reconciliation", "view")
  const options = await getReconciliationUserOptions()
  return { success: true as const, data: options }
}

export async function getReconciliationDocumentAction(handoverId: string) {
  await requirePermission("reconciliation", "view")
  const { getServerSession } = await import("next-auth")
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  return getReconciliationDocument(handoverId, session?.user?.id ?? null)
}

export async function submitReconciliationAction(payload: SubmitReconciliationPayload) {
  await requirePermission("reconciliation", "approve-reconciliation")
  const { getServerSession } = await import("next-auth")
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false as const, error: "You must be signed in to submit reconciliation." }
  }
  const result = await submitHandoverReconciliation(payload, session.user.id)
  if (result.success) {
    revalidatePath("/reconciliation")
    revalidatePath(`/reconciliation/${payload.handoverId}`)
  }
  return result
}

export async function rejectReconciliationAction(handoverId: string, reason: string) {
  await requirePermission("reconciliation", "approve-reconciliation")
  const { getServerSession } = await import("next-auth")
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false as const, error: "You must be signed in to reject reconciliation." }
  }
  const result = await rejectHandoverReconciliation(handoverId, reason, session.user.id)
  if (result.success) {
    revalidatePath("/reconciliation")
    revalidatePath(`/reconciliation/${handoverId}`)
  }
  return result
}

/** Send an approved handover to reconciliation. Handover must be received by current user, top-level, not yet reconciled. Requires Submit For Reconciliation permission. */
export async function sendHandoverToReconciliationAction(handoverId: string) {
  await requirePermission("reconciliation", "submit-for-reconciliation")
  const { getServerSession } = await import("next-auth")
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { success: false as const, error: "You must be signed in to send to reconciliation." }
  }
  const result = await sendHandoverToReconciliation(handoverId, session.user.id)
  if (result.success) {
    revalidatePath("/reconciliation")
    revalidatePath("/handovers")
    revalidatePath(`/handovers/${handoverId}`)
  }
  return result
}
