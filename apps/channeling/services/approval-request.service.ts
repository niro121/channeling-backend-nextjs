import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"
import { logActivityNonBlocking } from "@/lib/activity-log"
import { createNotification } from "@/services/notification.service"
import { requireActiveShift, getCurrentShift } from "@/services/shift.service"
import { isShiftRequirementError } from "@/lib/shift-requirement-error"
import { hasPermission } from "@/lib/permissions"
import { userTypes } from "@/lib/roles"
import type { Permissions } from "@/types/user-group"
import { NOTIFICATION_TYPES, REFERENCE_TYPES } from "@/types/notification"
import {
  APPROVAL_ACTION,
  APPROVAL_REQUEST_STATUS,
  APPROVAL_REQUEST_TYPE,
  OPEN_APPROVAL_STATUSES,
  type ApprovalPaymentLineSnapshot,
  type ApprovalRequestListItem,
  type ApprovalRequestStatus,
  type ApprovalRequestType,
  type BankDepositSnapshot,
  type BookingApprovalSummary,
} from "@/types/approval-request"
import type { RefundChannelInput } from "@/services/channel-booking/refund-channel.service"
import {
  createLedgerReceipt,
  validateBankDepositReady,
} from "@/services/ledger/create-ledger-receipt.service"
import { resolveBankDepositSlipSnapshot } from "@/services/bank-deposit-slip.service"

export type ApprovalFailure = { success: false; errorCode: string; message: string }
export type ApprovalActionResult =
  | { success: true; data?: { id: string; receiptId?: string; receiptNoString?: string } }
  | ApprovalFailure

export type RequestChannelApprovalInput = {
  booking_id: string
  type: ApprovalRequestType
  refund_to?: number
  professional_fee?: number
  hospital_fee?: number
  payment_lines?: ApprovalPaymentLineSnapshot[]
  remarks: string
}

const OPEN_STATUS = [...OPEN_APPROVAL_STATUSES]

function isBankDepositType(type: string): boolean {
  return type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT
}

function labelForType(type: ApprovalRequestType | string): string {
  if (type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL) return "cancel"
  if (type === APPROVAL_REQUEST_TYPE.CHANNEL_REFUND) return "refund"
  if (type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT) return "bank deposit"
  return "request"
}

function activityAction(type: ApprovalRequestType | string, event: "requested" | "approved" | "rejected" | "withdrawn" | "completed"): string {
  if (type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT) return `ledger.deposit.${event}`
  const kind = type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL ? "cancel" : "refund"
  return `booking.${kind}.${event}`
}

function approvePermissionForType(type: ApprovalRequestType | string): string {
  if (type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL) return APPROVAL_ACTION.APPROVE_CHANNEL_CANCEL
  if (type === APPROVAL_REQUEST_TYPE.CHANNEL_REFUND) return APPROVAL_ACTION.APPROVE_CHANNEL_REFUND
  return APPROVAL_ACTION.APPROVE_BANK_DEPOSIT
}

function depositSnapshot(raw: unknown): BankDepositSnapshot {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return raw as BankDepositSnapshot
}

function formatRs(amount: number): string {
  return `Rs. ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function mapSummary(row: {
  id: string
  type: string
  status: number
  requestedById: string
  amount: number
  remarks: string
  refundTo: number | null
  professionalFee: number
  hospitalFee: number
  rejectReason: string | null
  createdAt: Date
  requestedBy?: { name: string | null } | null
}): BookingApprovalSummary {
  return {
    id: row.id,
    type: row.type as ApprovalRequestType,
    status: row.status as ApprovalRequestStatus,
    requestedById: row.requestedById,
    requestedByName: row.requestedBy?.name?.trim() || "Unknown",
    amount: row.amount,
    remarks: row.remarks,
    refundTo: row.refundTo,
    professionalFee: row.professionalFee,
    hospitalFee: row.hospitalFee,
    rejectReason: row.rejectReason,
    createdAt: row.createdAt,
  }
}

export async function findOpenApprovalForBooking(bookingId: string) {
  return prisma.approvalRequest.findFirst({
    where: { bookingId, status: { in: OPEN_STATUS } },
    include: { requestedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function findLatestClosedApprovalForBooking(bookingId: string) {
  return prisma.approvalRequest.findFirst({
    where: {
      bookingId,
      status: { in: [APPROVAL_REQUEST_STATUS.REJECTED, APPROVAL_REQUEST_STATUS.WITHDRAWN] },
    },
    include: { requestedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function getBookingApprovalSummaries(bookingId: string): Promise<{
  openApproval: BookingApprovalSummary | null
  latestClosedApproval: BookingApprovalSummary | null
}> {
  const [open, closed] = await Promise.all([
    findOpenApprovalForBooking(bookingId),
    findLatestClosedApprovalForBooking(bookingId),
  ])
  return {
    openApproval: open ? mapSummary(open) : null,
    latestClosedApproval: closed ? mapSummary(closed) : null,
  }
}

export async function countOpenApprovalsForUser(userId: string): Promise<number> {
  return prisma.approvalRequest.count({
    where: { requestedById: userId, status: { in: OPEN_STATUS } },
  })
}

export async function openApprovalsBlockingShiftMessage(userId: string): Promise<string | null> {
  const count = await countOpenApprovalsForUser(userId)
  if (count <= 0) return null
  return `You have ${count} open approval request${count === 1 ? "" : "s"}. Complete, withdraw, or wait for rejection before ending your shift.`
}

export async function assertNoOpenApproval(bookingId: string): Promise<ApprovalFailure | null> {
  const open = await findOpenApprovalForBooking(bookingId)
  if (!open) return null
  const kind = labelForType(open.type as ApprovalRequestType)
  return {
    success: false,
    errorCode: "approval_pending",
    message: `This booking has an open ${kind} request. Finish, withdraw, or wait for rejection before continuing.`,
  }
}

export async function requireApprovedRequestForPaidAction(
  bookingId: string,
  userId: string | null,
  type: ApprovalRequestType
): Promise<ApprovalFailure | { success: true; requestId: string }> {
  if (!userId) {
    return { success: false, errorCode: "unauthorized", message: "You must be signed in." }
  }
  const open = await findOpenApprovalForBooking(bookingId)
  if (!open || open.type !== type || open.status !== APPROVAL_REQUEST_STATUS.APPROVED) {
    const kind = labelForType(type)
    return {
      success: false,
      errorCode: "approval_required",
      message: `This ${kind} must be approved before it can be completed.`,
    }
  }
  if (open.requestedById !== userId) {
    return {
      success: false,
      errorCode: "not_requester",
      message: `Only ${open.requestedBy?.name?.trim() || "the requester"} can complete this ${labelForType(type)}. Request again after this one is withdrawn or rejected.`,
    }
  }
  return { success: true, requestId: open.id }
}

export async function markApprovalCompleted(requestId: string, userId: string): Promise<void> {
  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: APPROVAL_REQUEST_STATUS.COMPLETED,
      completedAt: new Date(),
    },
  })
  const row = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    select: { bookingId: true, type: true, amount: true, remarks: true, refundTo: true },
  })
  if (!row) return
  const isDeposit = isBankDepositType(row.type)
  logActivityNonBlocking({
    userId,
    action: activityAction(row.type, "completed"),
    entityType: isDeposit ? "ApprovalRequest" : "Booking",
    entityId: isDeposit ? requestId : row.bookingId ?? requestId,
    importance: "high",
    metadata: {
      requestId,
      amount: row.amount,
      remarks: row.remarks,
      refundTo: row.refundTo,
    },
  })
}

async function getUsersWithApprovePermission(
  action: string,
  excludeUserId: string
): Promise<string[]> {
  const groups = await prisma.userGroup.findMany({
    where: { status: 1 },
    select: { id: true, permissions: true },
  })
  const groupIds = groups
    .filter((g) => {
      const p = g.permissions as Permissions | null
      return p?.approvals?.[action] === true
    })
    .map((g) => g.id)

  const users = await prisma.user.findMany({
    where: {
      status: 1,
      OR: [
        { userType: userTypes.admin },
        ...(groupIds.length > 0 ? [{ userGroupId: { in: groupIds } }] : []),
      ],
    },
    select: { id: true },
  })
  return [...new Set(users.map((u) => u.id).filter((id) => id !== excludeUserId))]
}

async function notifyUsers(userIds: string[], input: {
  type: string
  title: string
  message: string
  referenceId: string
}): Promise<void> {
  await Promise.all(
    userIds.map((userId) =>
      createNotification({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        referenceType: REFERENCE_TYPES.ApprovalRequest,
        referenceId: input.referenceId,
      })
    )
  )
}

export async function requestChannelApproval(
  input: RequestChannelApprovalInput,
  userId: string
): Promise<ApprovalActionResult> {
  try {
    await requireActiveShift(userId)
  } catch (e) {
    if (isShiftRequirementError(e)) {
      return { success: false, errorCode: e.code, message: e.message }
    }
    throw e
  }

  const remarks = input.remarks.trim()
  if (!remarks) {
    return { success: false, errorCode: "remarks_required", message: "Remarks are required." }
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
    include: { session: { select: { refundable: true } } },
  })
  if (!booking) {
    return { success: false, errorCode: "not_found", message: "Booking not found." }
  }
  if (booking.status !== 1) {
    return {
      success: false,
      errorCode: "not_paid",
      message: "Only paid bookings need approval. Unpaid bookings can be canceled directly.",
    }
  }
  if ((booking.refund ?? 0) !== 0) {
    return { success: false, errorCode: "already_refunded", message: "This booking has already been canceled or refunded." }
  }
  if (booking.session?.refundable === 0) {
    return { success: false, errorCode: "non_refundable_session", message: "This is a non-refundable session." }
  }
  if (booking.doctorPayment === true) {
    return {
      success: false,
      errorCode: "doctor_already_paid",
      message: "Refund and cancel are not allowed because the doctor has already been paid for this booking.",
    }
  }

  const existing = await findOpenApprovalForBooking(booking.id)
  if (existing) {
    return {
      success: false,
      errorCode: "approval_pending",
      message: `This booking already has an open ${labelForType(existing.type as ApprovalRequestType)} request.`,
    }
  }

  let amount = booking.amount
  const professionalFee = Number(input.professional_fee ?? 0)
  const hospitalFee = Number(input.hospital_fee ?? 0)
  if (input.type === APPROVAL_REQUEST_TYPE.CHANNEL_REFUND) {
    if (professionalFee > 0 && hospitalFee > 0) {
      return {
        success: false,
        errorCode: "invalid_input",
        message: "Refund only one fee at a time: professional or hospital, not both.",
      }
    }
    amount = professionalFee + hospitalFee
    if (amount <= 0) {
      return { success: false, errorCode: "invalid_input", message: "Select at least one refundable amount." }
    }
  }

  const currentShift = await getCurrentShift(userId)
  const row = await prisma.approvalRequest.create({
    data: {
      type: input.type,
      status: APPROVAL_REQUEST_STATUS.PENDING,
      bookingId: booking.id,
      requestedById: userId,
      shiftId: currentShift?.id ?? null,
      amount,
      remarks,
      refundTo: input.refund_to ?? 0,
      professionalFee,
      hospitalFee,
      paymentLines: (input.payment_lines ?? null) as object | undefined,
    },
    include: { requestedBy: { select: { name: true } } },
  })

  const kind = labelForType(input.type)
  const requesterName = row.requestedBy?.name?.trim() || "A cashier"
  logActivityNonBlocking({
    userId,
    action: activityAction(input.type, "requested"),
    entityType: "Booking",
    entityId: booking.id,
    importance: "high",
    metadata: {
      requestId: row.id,
      amount,
      remarks,
      refundTo: row.refundTo,
      professionalFee,
      hospitalFee,
    },
  })

  const managerIds = await getUsersWithApprovePermission(approvePermissionForType(input.type), userId)
  await notifyUsers(managerIds, {
    type: NOTIFICATION_TYPES.ApprovalRequested,
    title: `New channel ${kind} request`,
    message: `${requesterName} requested a ${kind} of ${formatRs(amount)}. Review it in Approval Center.`,
    referenceId: row.id,
  })

  return { success: true, data: { id: row.id } }
}

export async function requestBankDepositApproval(
  input: {
    amount: number
    remarks: string
    bankAccountId: string
    locationId: string
    userLocationId: string | null
    slipImageKey?: string | null
    slipImageContentType?: string | null
    slipImageName?: string | null
  },
  userId: string
): Promise<ApprovalActionResult> {
  try {
    await requireActiveShift(userId)
  } catch (err) {
    if (isShiftRequirementError(err)) {
      return { success: false, errorCode: "shift_required", message: err.message }
    }
    throw err
  }

  const remarks = input.remarks.trim()
  if (!remarks) {
    return { success: false, errorCode: "invalid_input", message: "Remarks are required." }
  }

  const ready = await validateBankDepositReady({
    createdBy: userId,
    amount: input.amount,
    bankAccountId: input.bankAccountId,
    branchId: input.locationId,
    userLocationId: input.userLocationId,
  })
  if (!ready.success) return ready

  const bankAccount = await prisma.bankAccount.findFirst({
    where: { id: input.bankAccountId, status: 1 },
    select: { id: true, name: true, accountNumber: true },
  })
  if (!bankAccount) {
    return { success: false, errorCode: "VALIDATION", message: "Selected bank account is not active or not found." }
  }

  const slip = await resolveBankDepositSlipSnapshot({
    userId,
    slipImageKey: input.slipImageKey,
    slipImageContentType: input.slipImageContentType,
    slipImageName: input.slipImageName,
  })
  if (!slip.success) {
    return { success: false, errorCode: slip.errorCode, message: slip.message }
  }

  const currentShift = await getCurrentShift(userId)
  const snapshot: BankDepositSnapshot = {
    bank_name: bankAccount.name,
    account_number: bankAccount.accountNumber,
    ...slip.snapshot,
  }

  const row = await prisma.approvalRequest.create({
    data: {
      type: APPROVAL_REQUEST_TYPE.BANK_DEPOSIT,
      status: APPROVAL_REQUEST_STATUS.PENDING,
      requestedById: userId,
      shiftId: currentShift?.id ?? null,
      amount: input.amount,
      remarks,
      bankAccountId: bankAccount.id,
      locationId: input.locationId,
      paymentLines: snapshot as object,
    },
    include: { requestedBy: { select: { name: true } } },
  })

  const requesterName = row.requestedBy?.name?.trim() || "A cashier"
  logActivityNonBlocking({
    userId,
    action: activityAction(APPROVAL_REQUEST_TYPE.BANK_DEPOSIT, "requested"),
    entityType: "ApprovalRequest",
    entityId: row.id,
    importance: "high",
    metadata: { requestId: row.id, amount: input.amount, remarks, bankAccountId: bankAccount.id },
  })

  const managerIds = await getUsersWithApprovePermission(APPROVAL_ACTION.APPROVE_BANK_DEPOSIT, userId)
  await notifyUsers(managerIds, {
    type: NOTIFICATION_TYPES.ApprovalRequested,
    title: "New bank deposit request",
    message: `${requesterName} requested a bank deposit of ${formatRs(input.amount)} to ${bankAccount.name}. Review it in Approval Center.`,
    referenceId: row.id,
  })

  return { success: true, data: { id: row.id } }
}

export async function withdrawApprovalRequest(
  requestId: string,
  userId: string
): Promise<ApprovalActionResult> {
  const row = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: { select: { name: true } } },
  })
  if (!row) {
    return { success: false, errorCode: "not_found", message: "Request not found." }
  }
  if (row.requestedById !== userId) {
    return { success: false, errorCode: "forbidden", message: "You can only withdraw your own request." }
  }
  if (isBankDepositType(row.type)) {
    if (row.status !== APPROVAL_REQUEST_STATUS.PENDING) {
      return { success: false, errorCode: "invalid_state", message: "This request cannot be withdrawn." }
    }
  } else if (row.status !== APPROVAL_REQUEST_STATUS.PENDING && row.status !== APPROVAL_REQUEST_STATUS.APPROVED) {
    return { success: false, errorCode: "invalid_state", message: "This request cannot be withdrawn." }
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: { status: APPROVAL_REQUEST_STATUS.WITHDRAWN, withdrawnAt: new Date() },
  })

  const kind = labelForType(row.type)
  const isDeposit = isBankDepositType(row.type)
  logActivityNonBlocking({
    userId,
    action: activityAction(row.type, "withdrawn"),
    entityType: isDeposit ? "ApprovalRequest" : "Booking",
    entityId: isDeposit ? requestId : row.bookingId ?? requestId,
    importance: "high",
    metadata: { requestId, amount: row.amount, remarks: row.remarks, refundTo: row.refundTo },
  })

  const managerIds = await getUsersWithApprovePermission(approvePermissionForType(row.type), userId)
  const requesterName = row.requestedBy?.name?.trim() || "A cashier"
  await notifyUsers(managerIds, {
    type: NOTIFICATION_TYPES.ApprovalWithdrawn,
    title: isDeposit ? "Bank deposit request withdrawn" : `Channel ${kind} request withdrawn`,
    message: `${requesterName} withdrew a ${kind} request for ${formatRs(row.amount)}.`,
    referenceId: row.id,
  })

  return { success: true, data: { id: row.id } }
}

export async function approveApprovalRequest(
  requestId: string,
  userId: string,
  permissions: Permissions | null | undefined,
  isAdmin: boolean
): Promise<ApprovalActionResult> {
  const row = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: { select: { name: true } } },
  })
  if (!row) {
    return { success: false, errorCode: "not_found", message: "Request not found." }
  }
  if (row.status !== APPROVAL_REQUEST_STATUS.PENDING) {
    return { success: false, errorCode: "invalid_state", message: "Only pending requests can be approved." }
  }
  if (row.requestedById === userId) {
    return { success: false, errorCode: "forbidden", message: "You cannot approve your own request." }
  }
  const needed = approvePermissionForType(row.type)
  if (!isAdmin && !hasPermission(permissions, "approvals", needed)) {
    return { success: false, errorCode: "forbidden", message: "You do not have permission to approve this request." }
  }

  if (isBankDepositType(row.type)) {
    if (!row.bankAccountId || !row.locationId) {
      return { success: false, errorCode: "invalid_state", message: "This deposit request is missing bank or branch details." }
    }
    try {
      await requireActiveShift(row.requestedById)
    } catch (err) {
      if (isShiftRequirementError(err)) {
        return {
          success: false,
          errorCode: "shift_required",
          message: "The requester must have an open shift before this deposit can be posted.",
        }
      }
      throw err
    }
    const posted = await createLedgerReceipt({
      transactionType: "BANK_DEPOSIT",
      branchId: row.locationId,
      userLocationId: row.locationId,
      bankAccountId: row.bankAccountId,
      amount: row.amount,
      remarks: row.remarks,
      createdBy: row.requestedById,
    })
    if (!posted.success) return posted

    const now = new Date()
    await prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: APPROVAL_REQUEST_STATUS.COMPLETED,
        approvedAt: now,
        approvedById: userId,
        completedAt: now,
        receiptId: posted.receiptId,
      },
    })

    logActivityNonBlocking({
      userId,
      action: activityAction(row.type, "approved"),
      entityType: "ApprovalRequest",
      entityId: requestId,
      importance: "high",
      metadata: {
        requestId,
        amount: row.amount,
        remarks: row.remarks,
        receiptId: posted.receiptId,
        receiptNo: posted.receiptNoString,
      },
    })
    logActivityNonBlocking({
      userId,
      action: activityAction(row.type, "completed"),
      entityType: "ApprovalRequest",
      entityId: requestId,
      importance: "high",
      metadata: { requestId, receiptId: posted.receiptId, receiptNo: posted.receiptNoString },
    })

    await createNotification({
      userId: row.requestedById,
      type: NOTIFICATION_TYPES.ApprovalApproved,
      title: "Your bank deposit was approved",
      message: `Your bank deposit of ${formatRs(row.amount)} was posted as receipt ${posted.receiptNoString}.`,
      referenceType: REFERENCE_TYPES.ApprovalRequest,
      referenceId: row.id,
    })

    return { success: true, data: { id: row.id, receiptId: posted.receiptId, receiptNoString: posted.receiptNoString } }
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: APPROVAL_REQUEST_STATUS.APPROVED,
      approvedAt: new Date(),
      approvedById: userId,
    },
  })

  const kind = labelForType(row.type)
  logActivityNonBlocking({
    userId,
    action: activityAction(row.type, "approved"),
    entityType: "Booking",
    entityId: row.bookingId ?? requestId,
    importance: "high",
    metadata: { requestId, amount: row.amount, remarks: row.remarks, refundTo: row.refundTo },
  })

  await createNotification({
    userId: row.requestedById,
    type: NOTIFICATION_TYPES.ApprovalApproved,
    title: `Your channel ${kind} was approved`,
    message: `Your ${kind} of ${formatRs(row.amount)} was approved. Complete it on the booking before ending your shift.`,
    referenceType: REFERENCE_TYPES.ApprovalRequest,
    referenceId: row.id,
  })

  return { success: true, data: { id: row.id } }
}

export async function rejectApprovalRequest(
  requestId: string,
  userId: string,
  reason: string,
  permissions: Permissions | null | undefined,
  isAdmin: boolean
): Promise<ApprovalActionResult> {
  const rejectReason = reason.trim()
  if (!rejectReason) {
    return { success: false, errorCode: "remarks_required", message: "A rejection reason is required." }
  }
  const row = await prisma.approvalRequest.findUnique({
    where: { id: requestId },
    include: { requestedBy: { select: { name: true } } },
  })
  if (!row) {
    return { success: false, errorCode: "not_found", message: "Request not found." }
  }
  if (isBankDepositType(row.type)) {
    if (row.status !== APPROVAL_REQUEST_STATUS.PENDING) {
      return { success: false, errorCode: "invalid_state", message: "This request cannot be rejected." }
    }
  } else if (row.status !== APPROVAL_REQUEST_STATUS.PENDING && row.status !== APPROVAL_REQUEST_STATUS.APPROVED) {
    return { success: false, errorCode: "invalid_state", message: "This request cannot be rejected." }
  }
  if (row.requestedById === userId) {
    return { success: false, errorCode: "forbidden", message: "You cannot reject your own request." }
  }
  const needed = approvePermissionForType(row.type)
  if (!isAdmin && !hasPermission(permissions, "approvals", needed)) {
    return { success: false, errorCode: "forbidden", message: "You do not have permission to reject this request." }
  }

  await prisma.approvalRequest.update({
    where: { id: requestId },
    data: {
      status: APPROVAL_REQUEST_STATUS.REJECTED,
      rejectedAt: new Date(),
      rejectedById: userId,
      rejectReason,
    },
  })

  const kind = labelForType(row.type)
  const isDeposit = isBankDepositType(row.type)
  logActivityNonBlocking({
    userId,
    action: activityAction(row.type, "rejected"),
    entityType: isDeposit ? "ApprovalRequest" : "Booking",
    entityId: isDeposit ? requestId : row.bookingId ?? requestId,
    importance: "high",
    metadata: {
      requestId,
      amount: row.amount,
      remarks: row.remarks,
      refundTo: row.refundTo,
      reason: rejectReason,
    },
  })

  await createNotification({
    userId: row.requestedById,
    type: NOTIFICATION_TYPES.ApprovalRejected,
    title: isDeposit ? "Your bank deposit was rejected" : `Your channel ${kind} was rejected`,
    message: `Your ${kind} of ${formatRs(row.amount)} was rejected: ${rejectReason}`,
    referenceType: REFERENCE_TYPES.ApprovalRequest,
    referenceId: row.id,
  })

  return { success: true, data: { id: row.id } }
}

export type ApprovalListTypeFilter = "all" | ApprovalRequestType
export type ApprovalListStatusFilter = "open" | "all"
export type ApprovalListView = "attend" | "mine"

export type ListApprovalRequestsInput = {
  view?: ApprovalListView
  type?: ApprovalListTypeFilter
  status?: ApprovalListStatusFilter
  dateFrom?: string | null
  dateTo?: string | null
  page?: number
  limit?: number
  userId: string
  permissions: Permissions | null | undefined
  isAdmin: boolean
}

export type ApprovalAccess = {
  canOpen: boolean
  canSeeMine: boolean
  canAttend: boolean
  canSeeCancels: boolean
  canSeeRefunds: boolean
  canSeeDeposits: boolean
  canApproveCancel: boolean
  canApproveRefund: boolean
  canApproveBankDeposit: boolean
}

export function getApprovalAccess(
  permissions: Permissions | null | undefined,
  isAdmin: boolean
): ApprovalAccess {
  if (isAdmin) {
    return {
      canOpen: true,
      canSeeMine: true,
      canAttend: true,
      canSeeCancels: true,
      canSeeRefunds: true,
      canSeeDeposits: true,
      canApproveCancel: true,
      canApproveRefund: true,
      canApproveBankDeposit: true,
    }
  }
  const canApproveCancel = hasPermission(permissions, "approvals", APPROVAL_ACTION.APPROVE_CHANNEL_CANCEL)
  const canApproveRefund = hasPermission(permissions, "approvals", APPROVAL_ACTION.APPROVE_CHANNEL_REFUND)
  const canApproveBankDeposit = hasPermission(permissions, "approvals", APPROVAL_ACTION.APPROVE_BANK_DEPOSIT)
  const canView = hasPermission(permissions, "approvals", APPROVAL_ACTION.VIEW)
  const canEditBooking = hasPermission(permissions, "channel-booking", "edit")
  const canAddLedger = hasPermission(permissions, "ledger", "add")
  const canSeeCancels = canView || canApproveCancel
  const canSeeRefunds = canView || canApproveRefund
  const canSeeDeposits = canView || canApproveBankDeposit
  return {
    canOpen: canView || canApproveCancel || canApproveRefund || canApproveBankDeposit || canEditBooking || canAddLedger,
    canSeeMine: canEditBooking || canAddLedger || canView || canApproveCancel || canApproveRefund || canApproveBankDeposit,
    canAttend: canSeeCancels || canSeeRefunds || canSeeDeposits,
    canSeeCancels,
    canSeeRefunds,
    canSeeDeposits,
    canApproveCancel,
    canApproveRefund,
    canApproveBankDeposit,
  }
}

function dateRangeWhere(dateFrom?: string | null, dateTo?: string | null): Prisma.ApprovalRequestWhereInput | null {
  const from = dateFrom?.trim()
  const to = dateTo?.trim()
  if (!from && !to) return null
  const createdAt: Prisma.DateTimeFilter = {}
  if (from) createdAt.gte = new Date(`${from}T00:00:00.000Z`)
  if (to) createdAt.lte = new Date(`${to}T23:59:59.999Z`)
  return { createdAt }
}

function buildListWhere(
  access: ApprovalAccess,
  userId: string,
  view: ApprovalListView,
  type: ApprovalListTypeFilter,
  status: ApprovalListStatusFilter,
  dateFrom?: string | null,
  dateTo?: string | null
): Prisma.ApprovalRequestWhereInput | null {
  const includeCancel = type === "all" || type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL
  const includeRefund = type === "all" || type === APPROVAL_REQUEST_TYPE.CHANNEL_REFUND
  const includeDeposit = type === "all" || type === APPROVAL_REQUEST_TYPE.BANK_DEPOSIT
  const types: string[] = []
  if (includeCancel && (view === "mine" || access.canSeeCancels)) types.push(APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL)
  if (includeRefund && (view === "mine" || access.canSeeRefunds)) types.push(APPROVAL_REQUEST_TYPE.CHANNEL_REFUND)
  if (includeDeposit && (view === "mine" || access.canSeeDeposits)) types.push(APPROVAL_REQUEST_TYPE.BANK_DEPOSIT)
  if (types.length === 0) return null

  const typeWhere: Prisma.ApprovalRequestWhereInput =
    types.length === 1 ? { type: types[0] } : { type: { in: types } }

  let visibility: Prisma.ApprovalRequestWhereInput
  if (view === "attend") {
    if (!access.canAttend) return null
    visibility = {
      AND: [
        typeWhere,
        { requestedById: { not: userId } },
        { status: APPROVAL_REQUEST_STATUS.PENDING },
      ],
    }
  } else {
    if (!access.canSeeMine) return null
    visibility = {
      AND: [
        typeWhere,
        { requestedById: userId },
        status === "all" ? {} : { status: { in: OPEN_STATUS } },
      ],
    }
  }

  const dates = dateRangeWhere(dateFrom, dateTo)
  return dates ? { AND: [visibility, dates] } : visibility
}

export async function listApprovalRequests(
  input: ListApprovalRequestsInput
): Promise<
  | { success: true; data: ApprovalRequestListItem[]; total: number; page: number; limit: number; access: ApprovalAccess }
  | (ApprovalFailure & { data: []; total: 0; page: number; limit: number; access: ApprovalAccess | null })
> {
  const access = getApprovalAccess(input.permissions, input.isAdmin)
  const limit = Math.min(50, Math.max(10, Math.floor(input.limit ?? 20)))
  const requestedPage = Math.max(1, Math.floor(input.page ?? 1))
  if (!access.canOpen) {
    return { success: false, errorCode: "forbidden", message: "Permission denied", data: [], total: 0, page: 1, limit, access: null }
  }

  const type = input.type ?? "all"
  const status = input.status ?? "open"
  const view: ApprovalListView = input.view ?? (access.canAttend ? "attend" : "mine")

  const where = buildListWhere(access, input.userId, view, type, status, input.dateFrom, input.dateTo)
  if (!where) {
    return { success: false, errorCode: "forbidden", message: "Permission denied", data: [], total: 0, page: 1, limit, access }
  }

  const total = await prisma.approvalRequest.count({ where })
  const pageCount = Math.max(1, Math.ceil(total / limit))
  const page = Math.min(requestedPage, pageCount)

  const rows = await prisma.approvalRequest.findMany({
    where,
    include: {
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      rejectedBy: { select: { name: true } },
      bankAccount: { select: { name: true, accountNumber: true } },
      receipt: { select: { id: true, receiptNoString: true } },
      booking: {
        select: {
          id: true,
          title: true,
          name: true,
          appointmentNo: true,
          receiptNoString: true,
          bookingid_string: true,
          session: {
            select: {
              date: true,
              startTime: true,
              doctor: { select: { title: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  })

  const data: ApprovalRequestListItem[] = rows.map((row) => {
    const snap = depositSnapshot(row.paymentLines)
    const isDeposit = isBankDepositType(row.type)
    const sess = row.booking?.session
    const sessionDate = sess?.date
      ? new Date(sess.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—"
    const doctor = sess?.doctor
      ? `${sess.doctor.title ?? ""} ${sess.doctor.name ?? ""}`.trim()
      : "—"
    const patientName = `${row.booking?.title ?? ""} ${row.booking?.name ?? ""}`.trim() || "—"
    const bankLabel =
      row.bankAccount?.name ||
      snap.bank_name ||
      "Bank deposit"
    const bankSub = [
      row.bankAccount?.accountNumber || snap.account_number,
      snap.slip_ref ? `Slip ${snap.slip_ref}` : null,
      row.receipt?.receiptNoString,
    ]
      .filter(Boolean)
      .join(" · ")
    return {
      ...mapSummary(row),
      bookingId: row.bookingId,
      patientName,
      appointmentNo: row.booking?.appointmentNo ?? null,
      billNo: row.booking?.receiptNoString ?? row.booking?.bookingid_string ?? row.receipt?.receiptNoString ?? row.id,
      sessionLabel: isDeposit ? bankSub : `${doctor} · ${sessionDate}`,
      detailTitle: isDeposit ? bankLabel : patientName,
      detailSub: isDeposit
        ? bankSub
        : `Appt ${String(row.booking?.appointmentNo ?? 0).padStart(2, "0")} · ${row.booking?.receiptNoString ?? row.booking?.bookingid_string ?? row.booking?.id ?? "—"}`,
      receiptId: row.receiptId,
      receiptNoString: row.receipt?.receiptNoString ?? null,
      slipImageUrl: isDeposit && snap.slip_image_key ? `/api/approval-attachments/${row.id}` : null,
      requestedAt: row.createdAt,
      approvedAt: row.approvedAt,
      approvedByName: row.approvedBy?.name ?? null,
      rejectedAt: row.rejectedAt,
      rejectedByName: row.rejectedBy?.name ?? null,
    }
  })

  return { success: true, data, total, page, limit, access }
}

export function snapshotToRefundInput(row: {
  bookingId: string
  type: string
  remarks: string
  refundTo: number | null
  professionalFee: number
  hospitalFee: number
  paymentLines: unknown
}): RefundChannelInput {
  return {
    booking_id: row.bookingId,
    refund_type: row.type === APPROVAL_REQUEST_TYPE.CHANNEL_CANCEL ? 0 : 1,
    professional_fee: row.professionalFee,
    hospital_fee: row.hospitalFee,
    refund_to: row.refundTo ?? 0,
    payment_lines: (row.paymentLines as ApprovalPaymentLineSnapshot[] | null) ?? undefined,
    remarks: row.remarks,
  }
}

export async function getApprovedRequestSnapshotForExecute(
  bookingId: string,
  userId: string,
  type: ApprovalRequestType
) {
  const gate = await requireApprovedRequestForPaidAction(bookingId, userId, type)
  if (!gate.success) return gate
  const row = await prisma.approvalRequest.findUnique({ where: { id: gate.requestId } })
  if (!row) {
    return { success: false as const, errorCode: "not_found", message: "Request not found." }
  }
  if (!row.bookingId) {
    return { success: false as const, errorCode: "not_found", message: "Request is not tied to a booking." }
  }
  return {
    success: true as const,
    requestId: row.id,
    input: snapshotToRefundInput({ ...row, bookingId: row.bookingId }),
  }
}
