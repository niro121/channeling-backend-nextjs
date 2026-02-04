"use server"

import { getActiveShift, getCurrentShift, startShift as startShiftService, pauseShift as pauseShiftService, resumeShift as resumeShiftService, endShift as endShiftService } from "@/services/shift.service"
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

export async function startShiftAction() {
  await requirePermission(SHIFT_RESOURCE, "view")
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) throw new Error("Unauthorized")
  const shift = await startShiftService(session.user.id)
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
