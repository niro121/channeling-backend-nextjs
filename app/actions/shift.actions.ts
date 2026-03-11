"use server"

import { getActiveShift, getCurrentShift, getActiveShiftsWithUserAndLocation, getShifts, getShiftById, getShiftUserOptions, getHandoverUserOptions, startShift as startShiftService, pauseShift as pauseShiftService, resumeShift as resumeShiftService, endShift as endShiftService } from "@/services/shift.service"
import {
  processShiftHandover,
  approveHandover,
  rejectHandover,
  cancelHandover,
  getHandoversToMe,
  getHandoverByIdForRecipient,
} from "@/services/shift-handover.service"
import { getTillBalanceBreakdown } from "@/services/accounting/balance.service"
import { getAccountBalance } from "@/services/accounting/balance-calc.service"
import prisma from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"

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

/** User options for handover recipient (active users excluding current). */
export async function getHandoverUserOptionsAction() {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: true, data: [] }
  const options = await getHandoverUserOptions(session.user.id)
  return { success: true, data: options }
}

/** Submit shift handover: create PENDING handover, set shift to handover pending. Journal created only when recipient approves. */
export async function submitShiftHandoverAction(
  shiftId: string,
  toUserId: string,
  amounts: {
    cashCents: number
    cardCents: number
    slipCents: number
    checkCents: number
    creditCents: number
    eWalletCents: number
  },
  discrepancyReason?: string,
  enteredBreakdown?: {
    cashDenominations?: { value: number; count: number }[]
    cardEntries?: { reference: string; amountCents: number }[]
    slipEntries?: { reference: string; amountCents: number }[]
    checkEntries?: { reference: string; amountCents: number }[]
    creditEntries?: { reference: string; amountCents: number }[]
    eWalletEntries?: { reference: string; amountCents: number }[]
  }
) {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await processShiftHandover(shiftId, session.user.id, toUserId, amounts, discrepancyReason, enteredBreakdown)
  if (!result.success) throw new Error(result.error)
  revalidatePath("/channel-booking")
  revalidatePath("/shifts")
  revalidatePath("/handovers")
  return result
}

/** Approve and receive handover (bulk cashier only). Records approver and datetime, optional comments; creates journal to bulk cashier till, ends shift. */
export async function approveHandoverAction(handoverId: string, approvalComments?: string) {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const result = await approveHandover(handoverId, session.user.id, approvalComments)
  if (!result.success) throw new Error(result.error)
  revalidatePath("/channel-booking")
  revalidatePath("/shifts")
  revalidatePath("/handovers")
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
export async function getHandoversToMeAction() {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: true, data: [] }
  const list = await getHandoversToMe(session.user.id)
  return { success: true, data: list }
}

/** Handover detail for recipient: handover + till breakdown (expected vs entered) for verification. */
export async function getHandoverDetailAction(handoverId: string) {
  await requirePermission("handover", "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { success: false, data: null, error: "Unauthorized" }
  const handover = await getHandoverByIdForRecipient(handoverId, session.user.id)
  if (!handover) return { success: false, data: null, error: "Handover not found or not pending for you." }
  const tillBreakdown = await getTillBalanceBreakdown(handover.fromUserId)
  return {
    success: true,
    data: {
      handover,
      tillBreakdown,
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
