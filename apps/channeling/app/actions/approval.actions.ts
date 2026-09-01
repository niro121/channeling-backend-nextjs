"use server"

import { z } from "zod"
import { fetchServerSession } from "@/lib/session"
import { requirePermission, checkRouteAccess } from "@/lib/server-permissions"
import { userTypes } from "@/lib/roles"
import {
  APPROVAL_REQUEST_TYPE,
  type ApprovalRequestType,
} from "@/types/approval-request"
import {
  approveApprovalRequest,
  getApprovalAccess,
  listApprovalRequests,
  rejectApprovalRequest,
  requestChannelApproval,
  withdrawApprovalRequest,
  getApprovedRequestSnapshotForExecute,
  type ApprovalListView,
  type ApprovalListTypeFilter,
} from "@/services/approval-request.service"
import { refundChannelService } from "@/services/channel-booking/refund-channel.service"

const paymentLineSchema = z.object({
  payment_method: z.number().int().min(0),
  amount: z.number().positive(),
  bank: z.object({ id: z.string(), name: z.string().optional() }).optional().nullable(),
  slip_ref: z.string().optional(),
  slip_date: z.string().optional(),
  card: z.string().optional(),
})

const requestSchema = z.object({
  booking_id: z.string().min(1),
  type: z.enum([APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL, APPROVAL_REQUEST_TYPE.CHANNEL_REFUND]),
  refund_to: z.number().int().min(0).optional(),
  professional_fee: z.number().min(0).optional(),
  hospital_fee: z.number().min(0).optional(),
  payment_lines: z.array(paymentLineSchema).optional(),
  remarks: z.string().min(1).refine((s) => s.trim().length > 0, "Remarks are required"),
})

async function getActor() {
  const session = await fetchServerSession()
  const userId = session?.user?.id
  if (!userId) {
    return { error: { success: false as const, errorCode: "unauthorized", message: "You must be signed in." } }
  }
  return {
    userId,
    permissions: session?.user?.permissions,
    isAdmin: session?.user?.userType === userTypes.admin,
  }
}

export async function getApprovalAccessAction() {
  const canOpen = await checkRouteAccess("/approvals")
  if (!canOpen) {
    return { success: false as const, errorCode: "forbidden", message: "Permission denied" }
  }
  const actor = await getActor()
  if ("error" in actor) return actor.error
  return { success: true as const, access: getApprovalAccess(actor.permissions, actor.isAdmin) }
}

export async function requestChannelApprovalAction(raw: unknown) {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return { success: false as const, errorCode: "forbidden", message: "Permission denied" }
  }
  const actor = await getActor()
  if ("error" in actor) return actor.error
  const parsed = requestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false as const, errorCode: "invalid_input", message: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  return requestChannelApproval(
    { ...parsed.data, type: parsed.data.type as ApprovalRequestType },
    actor.userId
  )
}

export async function withdrawApprovalRequestAction(requestId: string) {
  const canOpen = await checkRouteAccess("/approvals")
  if (!canOpen) {
    return { success: false as const, errorCode: "forbidden", message: "Permission denied" }
  }
  const actor = await getActor()
  if ("error" in actor) return actor.error
  if (!requestId?.trim()) {
    return { success: false as const, errorCode: "invalid_input", message: "Request id is required." }
  }
  return withdrawApprovalRequest(requestId, actor.userId)
}

export async function approveApprovalRequestAction(requestId: string) {
  const canOpen = await checkRouteAccess("/approvals")
  if (!canOpen) {
    return { success: false as const, errorCode: "forbidden", message: "Permission denied" }
  }
  const actor = await getActor()
  if ("error" in actor) return actor.error
  if (!requestId?.trim()) {
    return { success: false as const, errorCode: "invalid_input", message: "Request id is required." }
  }
  return approveApprovalRequest(requestId, actor.userId, actor.permissions, actor.isAdmin)
}

export async function rejectApprovalRequestAction(requestId: string, reason: string) {
  const canOpen = await checkRouteAccess("/approvals")
  if (!canOpen) {
    return { success: false as const, errorCode: "forbidden", message: "Permission denied" }
  }
  const actor = await getActor()
  if ("error" in actor) return actor.error
  if (!requestId?.trim()) {
    return { success: false as const, errorCode: "invalid_input", message: "Request id is required." }
  }
  return rejectApprovalRequest(requestId, actor.userId, reason, actor.permissions, actor.isAdmin)
}

export async function listApprovalRequestsAction(input: {
  view?: ApprovalListView
  type?: ApprovalListTypeFilter
  status?: "open" | "all"
  dateFrom?: string | null
  dateTo?: string | null
  page?: number
  limit?: number
}) {
  try {
    const canOpen = await checkRouteAccess("/approvals")
    if (!canOpen) {
      return { success: false as const, errorCode: "forbidden", message: "Permission denied", data: [], total: 0, page: 1, limit: 20, access: null }
    }
    const actor = await getActor()
    if ("error" in actor) return { ...actor.error, data: [], total: 0, page: 1, limit: 20, access: null }
    return await listApprovalRequests({
      view: input.view,
      type: input.type,
      status: input.status,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      page: input.page,
      limit: input.limit,
      userId: actor.userId,
      permissions: actor.permissions,
      isAdmin: actor.isAdmin,
    })
  } catch (error) {
    console.error("listApprovalRequestsAction", error)
    return {
      success: false as const,
      errorCode: "list_failed",
      message: "Could not load approval requests.",
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      access: null,
    }
  }
}

export async function completeApprovedRefundAction(bookingId: string, type: ApprovalRequestType) {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return { success: false as const, errorCode: "forbidden", message: "Permission denied" }
  }
  const actor = await getActor()
  if ("error" in actor) return actor.error
  const snapshot = await getApprovedRequestSnapshotForExecute(bookingId, actor.userId, type)
  if (!snapshot.success) return snapshot
  return refundChannelService(snapshot.input, actor.userId)
}
