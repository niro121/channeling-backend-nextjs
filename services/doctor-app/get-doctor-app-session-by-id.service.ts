import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
import { resolveDoctorProfileForUser } from "@/lib/helpers/auth/doctor-login"
import type { PublicSessionDto } from "@/services/public/sessions.service"
import moment from "moment"
import { fetchDoctorAppSessionsForDoctor } from "@/services/doctor-app/doctor-app-sessions.repository"
import { mapDoctorAppSessionsToDto } from "@/services/doctor-app/doctor-app-sessions.mapper"

export type GetDoctorAppSessionByIdResult =
  | { success: true; status: 200; session: PublicSessionDto }
  | {
      success: false
      status: 401 | 404 | 400 | 500
      error: string
      message?: string
    }

/**
 * Mobile app: fetch one session (by id) for the logged-in doctor user.
 */
export async function getDoctorAppSessionByIdForUser(
  userId: string,
  sessionId: string
): Promise<GetDoctorAppSessionByIdResult> {
  const trimmedSessionId = sessionId.trim()
  if (!trimmedSessionId) {
    return {
      success: false,
      status: 400,
      error: "invalid_request",
      message: "sessionId is required",
    }
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, userType: DOCTOR_USER_TYPE, status: 1 },
    select: { id: true, username: true },
  })

  if (!user) {
    return { success: false, status: 401, error: "Unauthorized" }
  }

  const profile = await resolveDoctorProfileForUser(user)
  if (!profile) {
    return {
      success: false,
      status: 404,
      error: "not_linked",
      message:
        "No doctor profile linked to this user. Link an Account with doctorId or set username to the doctor code.",
    }
  }

  const targetSession = await prisma.session.findFirst({
    where: {
      id: trimmedSessionId,
      doctorId: profile.id,
      status: { in: [0, 1] },
    },
    select: {
      id: true,
      date: true,
    },
  })

  if (!targetSession) {
    return {
      success: false,
      status: 404,
      error: "not_found",
      message: "Session not found for this doctor",
    }
  }

  const dayStart = moment(targetSession.date).startOf("day").toDate()
  const dayEnd = moment(targetSession.date).endOf("day").toDate()
  const fetchResult = await fetchDoctorAppSessionsForDoctor(profile.id, {
    from: dayStart,
    to: dayEnd,
  })

  if (!fetchResult.success) {
    return {
      success: false,
      status: 500,
      error: "server_error",
      message: fetchResult.message,
    }
  }

  const mapped = mapDoctorAppSessionsToDto(fetchResult.data, {
    id: profile.id,
    code: profile.code,
    title: profile.title,
    name: profile.name,
  })
  const session = mapped.find((s) => s.id === trimmedSessionId)

  if (!session) {
    return {
      success: false,
      status: 404,
      error: "not_found",
      message: "Session not found for this doctor",
    }
  }

  return { success: true, status: 200, session }
}
