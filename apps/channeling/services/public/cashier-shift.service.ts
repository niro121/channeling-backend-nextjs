import { SHIFT_STATUS } from "@/types/shift"
import { FLOAT_REQUEST_STATUS } from "@/types/float-request"
import { getCashierFloatBalance } from "@/services/accounting/balance.service"
import {
  getApprovedFloatRequestByUserId,
  getPendingFloatRequestByUserId,
} from "@/services/float-request.service"
import { getCurrentShift, pauseShift, resumeShift } from "@/services/shift.service"

export type PublicCashierShift = {
  id: string
  userId: string
  status: number
  statusLabel: "active" | "paused" | "handover_pending"
  locationId: string | null
  locationName: string | null
  locationCode: string | null
  startedAt: string
  endsAt: string
  expired: boolean
  canPause: boolean
  canResume: boolean
  floatBalanceCents: number
  floatRequest: {
    status: "pending" | "approved"
    floatNo: string | null
    amountCents: number
  } | null
}

function statusLabel(status: number): PublicCashierShift["statusLabel"] | null {
  if (status === SHIFT_STATUS.ACTIVE) return "active"
  if (status === SHIFT_STATUS.PAUSED) return "paused"
  if (status === SHIFT_STATUS.HANDOVER_PENDING) return "handover_pending"
  return null
}

export async function getPublicCashierShift(
  userId: string
): Promise<{ success: true; shift: PublicCashierShift | null } | { success: false; message: string }> {
  const id = userId.trim()
  if (!id) return { success: false, message: "Channeling user id is required." }

  const shift = await getCurrentShift(id)
  if (!shift) return { success: true, shift: null }

  const label = statusLabel(Number(shift.status))
  if (!label) return { success: true, shift: null }

  const endsAt = new Date(shift.endsAt)
  const expired = endsAt.getTime() <= Date.now()
  const [floatBalanceCents, pending, approved] = await Promise.all([
    getCashierFloatBalance(id).catch(() => 0),
    getPendingFloatRequestByUserId(id),
    getApprovedFloatRequestByUserId(id),
  ])

  const openFloat = pending ?? approved
  const floatStatus =
    openFloat && Number(openFloat.status) === FLOAT_REQUEST_STATUS.APPROVED ? "approved" : openFloat ? "pending" : null

  return {
    success: true,
    shift: {
      id: shift.id,
      userId: id,
      status: Number(shift.status),
      statusLabel: label,
      locationId: shift.locationId ?? shift.location?.id ?? null,
      locationName: shift.location?.name ?? null,
      locationCode: shift.location?.code ?? null,
      startedAt: new Date(shift.startedAt).toISOString(),
      endsAt: endsAt.toISOString(),
      expired,
      canPause: label === "active" && !expired,
      canResume: label === "paused" && !expired,
      floatBalanceCents,
      floatRequest:
        openFloat && floatStatus
          ? {
              status: floatStatus,
              floatNo: openFloat.floatNoString ?? null,
              amountCents: Number(openFloat.amountRequested ?? 0),
            }
          : null,
    },
  }
}

export async function pausePublicCashierShift(userId: string) {
  const current = await getPublicCashierShift(userId)
  if (!current.success) return current
  if (!current.shift) return { success: false as const, message: "No open shift. Start the shift in Channeling." }
  if (!current.shift.canPause) {
    return { success: false as const, message: "This shift cannot be paused. End it from Channeling." }
  }
  const result = await pauseShift(current.shift.id, current.shift.userId)
  if (!result.success) return { success: false as const, message: result.message ?? "Could not pause the shift." }
  return getPublicCashierShift(userId)
}

export async function resumePublicCashierShift(userId: string) {
  const current = await getPublicCashierShift(userId)
  if (!current.success) return current
  if (!current.shift) return { success: false as const, message: "No open shift. Start the shift in Channeling." }
  if (!current.shift.canResume) {
    return { success: false as const, message: "This shift cannot be resumed. End it from Channeling." }
  }
  const result = await resumeShift(current.shift.id, current.shift.userId)
  if (!result.success) return { success: false as const, message: result.message ?? "Could not resume the shift." }
  return getPublicCashierShift(userId)
}
