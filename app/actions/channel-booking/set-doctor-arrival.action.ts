"use server"

import { fetchServerSession } from "@/lib/session"
import { requirePermission } from "@/lib/server-permissions"
import {
  setDoctorArrivalService,
  type SetDoctorArrivalInput,
  type SetDoctorArrivalResult,
} from "@/services/channel-booking/set-doctor-arrival.service"

export type { SetDoctorArrivalResult }

export async function setDoctorArrivalAction(
  input: SetDoctorArrivalInput
): Promise<SetDoctorArrivalResult> {
  try {
    await requirePermission("channel-booking", "edit")
  } catch {
    return {
      success: false,
      errorCode: "forbidden",
      message: "Permission denied",
    }
  }

  const session = await fetchServerSession()
  const userId = session?.user?.id
  if (!userId) {
    return {
      success: false,
      errorCode: "unauthorized",
      message: "You must be logged in to set Doctor Arrival/Departure.",
    }
  }

  return setDoctorArrivalService(input, userId)
}
