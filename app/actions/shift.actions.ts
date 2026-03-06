"use server"

import { getActiveShift, getCurrentShift, getActiveShiftsWithUserAndLocation, getShifts, getShiftById, getShiftUserOptions, startShift as startShiftService, pauseShift as pauseShiftService, resumeShift as resumeShiftService, endShift as endShiftService } from "@/services/shift.service"
import { getCashierFloatBalance } from "@/services/accounting.service"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import prisma from "@/lib/prisma"

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
  const withFloat = await Promise.all(
    shifts.map(async (s: ShiftRow) => {
      const balanceCents = await getCashierFloatBalance(s.userId)
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
  )
  return withFloat
}
