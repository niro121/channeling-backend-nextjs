"use server"

import { getActiveShift, getCurrentShift, getActiveShiftsWithUserAndLocation, getShifts, getShiftById, getShiftUserOptions, getHandoverUserOptions, startShift as startShiftService, pauseShift as pauseShiftService, resumeShift as resumeShiftService, endShift as endShiftService, canEndShiftWithoutHandover as canEndShiftWithoutHandoverService } from "@/services/shift.service"
import {
  processShiftHandover,
  approveHandover,
  rejectHandover,
  cancelHandover,
  getHandoversToMe,
  getHandoversApprovedByMeNotReconciled,
  getCompletedHandoversToMe,
  getHandoverByIdForRecipient,
  getHandoversReceivedByShift,
  getIncludableHandoversForSender,
  getIncludedHandoversChain,
  getNonCashHeldInReconciliation,
} from "@/services/shift-handover.service"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { getAccountBalance } from "@/services/accounting/balance-calc.service"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { HANDOVER_STATUS } from "@/types/handover"

// Shift creation: single "shift" resource; view permission allows all shift actions (start, pause, resume, end).
// Use under Channel Booking: grant "Shift (Channel Booking)" view to allow shift features.
const SHIFT_RESOURCE = "shift"

export async function getActiveShiftAction() {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return getActiveShift(session.user.id)
}

export async function getCurrentShiftAction() {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return getCurrentShift(session.user.id)
}

/** Current user's default location (userLocation) for starting a shift. */
export async function getMyDefaultLocationForShiftAction(): Promise<{ locationId: string; locationName: string } | null> {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { userLocationId: true, userLocation: { select: { id: true, name: true } } },
  })
  if (!user?.userLocation?.id) return null
  return { locationId: user.userLocation.id, locationName: user.userLocation.name }
}

export async function startShiftAction(locationId?: string | null) {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const shift = await startShiftService(session.user.id, locationId ?? undefined)
  revalidatePath("/channel-booking")
  return shift
}

export async function pauseShiftAction(shiftId: string) {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await pauseShiftService(shiftId, session.user.id)
  if (!result.success) throw new Error(result.message)
  revalidatePath("/channel-booking")
  return result
}

export async function resumeShiftAction(shiftId: string) {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await resumeShiftService(shiftId, session.user.id)
  if (!result.success) throw new Error(result.message)
  revalidatePath("/channel-booking")
  return result
}

export async function endShiftAction(shiftId: string) {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await endShiftService(shiftId, session.user.id)
  if (!result.success) throw new Error(result.message)
  revalidatePath("/channel-booking")
  return result
}

/** Whether the current user can end their shift with no handover (empty till, nothing to forward). */
export async function canEndShiftWithoutHandoverAction(): Promise<{
  success: true
  allowed: boolean
  reason?: string
}> {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await canEndShiftWithoutHandoverService(session.user.id)
  return { success: true, ...result }
}

/** User options for handover recipient (active users excluding current). */
export async function getHandoverUserOptionsAction() {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: true, data: [] }
  const options = await getHandoverUserOptions(session.user.id)
  return { success: true, data: options }
}

/** Single payload for submit shift handover (one arg = no serialization drop). */
export type SubmitShiftHandoverPayload = {
  shiftId: string
  toUserId: string
  amounts: {
    cashCents: number
    cardCents: number
    slipCents: number
    checkCents: number
    creditCents: number
    eWalletCents: number
  }
  discrepancyReason?: string
  enteredBreakdown?: {
    cashDenominations?: { value: number; count: number }[]
    cardEntries?: { reference: string; amountCents: number }[]
    slipEntries?: { reference: string; amountCents: number }[]
    checkEntries?: { reference: string; amountCents: number }[]
    creditEntries?: { reference: string; amountCents: number }[]
    eWalletEntries?: { reference: string; amountCents: number }[]
  }
  includedHandoverIds?: string[]
}

/** Submit shift handover: create PENDING handover, set shift to handover pending. Journal created only when recipient approves. */
export async function submitShiftHandoverAction(payload: SubmitShiftHandoverPayload) {
  const { shiftId, toUserId, amounts, discrepancyReason, enteredBreakdown, includedHandoverIds } = payload
  console.log("[submitShiftHandoverAction] payload.includedHandoverIds:", includedHandoverIds, "length:", includedHandoverIds?.length)
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await processShiftHandover(
    shiftId,
    session.user.id,
    toUserId,
    amounts,
    discrepancyReason,
    enteredBreakdown,
    includedHandoverIds
  )
  if (!result.success) throw new Error(result.error)
  revalidatePath("/channel-booking")
  revalidatePath("/shifts")
  revalidatePath("/handovers")
  return result
}

/** Approve and receive handover (recipient only). Records approver and datetime, optional comments; creates journal to recipient till, ends shift. Send to reconciliation is a separate step after approval. */
export async function approveHandoverAction(handoverId: string, approvalComments?: string) {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await approveHandover(handoverId, session.user.id, approvalComments)
  if (!result.success) throw new Error(result.error)
  revalidatePath("/channel-booking")
  revalidatePath("/shifts")
  revalidatePath("/handovers")
  revalidatePath("/reconciliation")
  return result
}

/** Reject handover (recipient only). Requires reason. Shift returns to active. */
export async function rejectHandoverAction(handoverId: string, rejectReason: string) {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await rejectHandover(handoverId, session.user.id, rejectReason)
  if (!result.success) throw new Error(result.error)
  revalidatePath("/channel-booking")
  revalidatePath("/shifts")
  revalidatePath("/handovers")
  return result
}

/** Cancel handover (sender only). Shift returns to active. */
export async function cancelHandoverAction(handoverId: string) {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await cancelHandover(handoverId, session.user.id)
  if (!result.success) throw new Error(result.error)
  revalidatePath("/channel-booking")
  revalidatePath("/shifts")
  revalidatePath("/handovers")
  return result
}

/** Handovers pending for current user (handed over to me). */
export async function getHandoversToMeAction(): Promise<
  { success: true; data: Awaited<ReturnType<typeof getHandoversToMe>> } | { success: false; data: []; message: string }
> {
  try {
    await requirePermission("handover", "view")
  } catch (err) {
    return { success: false, data: [], message: err instanceof Error ? err.message : "Access denied." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: true, data: [] }
  const list = await getHandoversToMe(session.user.id)
  return { success: true, data: list }
}

/** Handovers approved by me that are not yet sent to reconciliation. Requires Submit For Reconciliation permission. */
export async function getHandoversApprovedByMeNotReconciledAction(): Promise<
  | { success: true; data: Awaited<ReturnType<typeof getHandoversApprovedByMeNotReconciled>> }
  | { success: false; data: []; message: string }
> {
  try {
    await requirePermission("handover", "view")
    await requirePermission("reconciliation", "submit-for-reconciliation")
  } catch (err) {
    return { success: false, data: [], message: err instanceof Error ? err.message : "Access denied." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: true, data: [] }
  const list = await getHandoversApprovedByMeNotReconciled(session.user.id)
  return { success: true, data: list }
}

/** Completed handovers received by me (approved or rejected) for history / reports. */
export async function getCompletedHandoversToMeAction(params?: {
  page?: number
  limit?: number
  dateFrom?: string | null
  dateTo?: string | null
  fromUserId?: string | null
}): Promise<
  | { success: true; data: Awaited<ReturnType<typeof getCompletedHandoversToMe>>["data"]; totalRecords: number }
  | { success: false; data: []; totalRecords: 0; message: string }
> {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: [], totalRecords: 0, message: "Unauthorized" }
  const result = await getCompletedHandoversToMe(session.user.id, params ?? {})
  return { success: true, data: result.data, totalRecords: result.totalRecords }
}

/** Active users for Completed-tab "Handed over by" filter (excludes current user). */
export async function getHandoverFromUserFilterOptionsAction(): Promise<
  | { success: true; data: { id: string; name: string }[] }
  | { success: false; data: []; message: string }
> {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: [], message: "Unauthorized" }
  const options = await getHandoverUserOptions(session.user.id)
  return { success: true, data: options }
}

/** Handovers the current user (sender) has received and not yet forwarded. Shown in end-shift dialog so sender can include them in the chain. */
export async function getIncludableHandoversForSenderAction(): Promise<
  | { success: true; data: Awaited<ReturnType<typeof getIncludableHandoversForSender>> }
  | { success: false; data: []; message: string }
> {
  try {
    await requirePermission(SHIFT_RESOURCE, "view")
  } catch (err) {
    return { success: false, data: [], message: err instanceof Error ? err.message : "Access denied." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: [], message: "Unauthorized" }
  const list = await getIncludableHandoversForSender(session.user.id)
  return { success: true, data: list }
}

/** Non-cash amounts held in open reconciliation (still on till but not transferable to next bulk). */
export async function getNonCashHeldInReconciliationAction(): Promise<
  | { success: true; data: Awaited<ReturnType<typeof getNonCashHeldInReconciliation>> }
  | { success: false; data: null; message: string }
> {
  try {
    await requirePermission(SHIFT_RESOURCE, "view")
  } catch (err) {
    return { success: false, data: null, message: err instanceof Error ? err.message : "Access denied." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: null, message: "Unauthorized" }
  const data = await getNonCashHeldInReconciliation(session.user.id)
  return { success: true, data }
}

/** Handovers received by this shift (toShiftId = shiftId). Used to prepopulate non-cash entries in end-shift handover dialog. */
export async function getHandoversReceivedByShiftAction(shiftId: string) {
  try {
    await requirePermission(SHIFT_RESOURCE, "view")
  } catch (err) {
    return { success: false, data: [], message: err instanceof Error ? err.message : "Access denied." }
  }
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: [], message: "Unauthorized" }
  const list = await getHandoversReceivedByShift(shiftId)
  // Debug: also return handovers you approved (toUserId = you) so we can see if toShiftId matches current shift
  const handoversIApproved = await prisma.shiftHandover.findMany({
    where: { toUserId: session.user.id, status: 1 },
    select: { id: true, toShiftId: true, createdAt: true, fromUserId: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  return {
    success: true,
    data: list,
    debug: {
      requestedShiftId: shiftId,
      handoversReceivedByThisShift: list.length,
      handoversIApproved: handoversIApproved.map((h) => ({ id: h.id, toShiftId: h.toShiftId, createdAt: h.createdAt })),
    },
  }
}

/** Handover detail for recipient: handover + till breakdown + included handovers chain for verification. */
export async function getHandoverDetailAction(handoverId: string) {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: null, error: "Unauthorized" }
  const handover = await getHandoverByIdForRecipient(handoverId, session.user.id)
  if (!handover) return { success: false, data: null, error: "Handover not found or you are not the recipient." }

  const actorIds = [
    handover.approvedBy,
    handover.rejectedBy,
    handover.cancelledBy,
    (handover as { reconciliationAssignedToUserId?: string | null }).reconciliationAssignedToUserId,
  ].filter((id): id is string => typeof id === "string" && id.trim() !== "")
  const uniqueActorIds = [...new Set(actorIds)]

  const [tillBreakdown, includedHandovers, actors] = await Promise.all([
    handover.status === HANDOVER_STATUS.PENDING
      ? getTillBalanceBreakdown(handover.fromUserId)
      : Promise.resolve(null),
    getIncludedHandoversChain((handover as { includedHandoverIds?: unknown }).includedHandoverIds),
    uniqueActorIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: uniqueActorIds } },
          select: { id: true, name: true, staff: { select: { code: true } } },
        })
      : Promise.resolve([] as { id: string; name: string | null; staff: { code: string } | null }[]),
  ])

  const actorById = new Map(actors.map((u) => [u.id, u]))
  const approvedByUser = handover.approvedBy ? actorById.get(handover.approvedBy) ?? null : null
  const rejectedByUser = handover.rejectedBy ? actorById.get(handover.rejectedBy) ?? null : null
  const cancelledByUser = handover.cancelledBy ? actorById.get(handover.cancelledBy) ?? null : null
  const assignedId = (handover as { reconciliationAssignedToUserId?: string | null }).reconciliationAssignedToUserId
  const reconciliationAssignedToUser = assignedId ? actorById.get(assignedId) ?? null : null

  return {
    success: true,
    data: {
      handover,
      tillBreakdown,
      includedHandovers,
      approvedByUser,
      rejectedByUser,
      cancelledByUser,
      reconciliationAssignedToUser,
    },
  }
}

/** List shifts for manager view. Requires shifts view permission. */
export async function getShiftsAction(params: {
  page?: string | number
  limit?: string | number
  dateFrom?: string | null
  dateTo?: string | null
  userId?: string | null
}) {
  await requirePermission("shifts", "view")
  const page = params.page != null ? Number(params.page) : 0
  const limit = params.limit != null ? Number(params.limit) : Number(process.env.DEFAULT_PER_PAGE ?? "10")
  const { data, totalRecords } = await getShifts({
    page,
    limit,
    dateFrom: params.dateFrom ?? null,
    dateTo: params.dateTo ?? null,
    userId: params.userId ?? null,
  })
  return { success: true, data, totalRecords }
}

/** Get one shift by id for detail page. Requires shifts view permission. */
export async function getShiftByIdAction(id: string) {
  await requirePermission("shifts", "view")
  const shift = await getShiftById(id)
  return { success: true, data: shift }
}

/** User options for shifts filter dropdown. Requires shifts view permission. */
export async function getShiftUserOptionsAction() {
  await requirePermission("shifts", "view")
  const options = await getShiftUserOptions()
  return { success: true, data: options }
}

/** Active shifts with user, location, and float balance for bulk cashier dashboard. */
export async function getActiveShiftsWithFloatAction() {
  await requirePermission("bulk-cashier", "bulk-cashier-dashboard")
  const shifts = await getActiveShiftsWithUserAndLocation()
  type ShiftRow = Awaited<ReturnType<typeof getActiveShiftsWithUserAndLocation>>[number]
  if (shifts.length === 0) return []

  const userIds = [...new Set(shifts.map((s: ShiftRow) => String(s.userId)))] as string[]
  const accounts = await prisma.account.findMany({
    where: { type: "CASH", userId: { in: userIds }, isActive: true },
    select: { id: true, userId: true },
  })
  const userIdToAccountId = new Map(accounts.map((a) => [a.userId, a.id]))
  const uniqueAccountIds = [...new Set(accounts.map((a) => a.id))]
  const balances = await Promise.all(uniqueAccountIds.map((id) => getAccountBalance(id)))
  const accountIdToBalance = new Map(uniqueAccountIds.map((id, i) => [id, balances[i] ?? 0]))

  return shifts.map((s: ShiftRow) => {
    const accountId = userIdToAccountId.get(s.userId)
    const balanceCents = accountId ? accountIdToBalance.get(accountId) ?? 0 : 0
    return {
      id: s.id,
      userId: s.userId,
      userName: s.user.name,
      userEmail: s.user.email ?? null,
      locationId: s.locationId,
      locationName: s.location?.name ?? null,
      startedAt: s.startedAt,
      endsAt: s.endsAt,
      floatBalanceCents: balanceCents,
    }
  })
}
