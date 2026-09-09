import moment from "moment"
import prisma from "@/lib/prisma"
import {
  listDoctorAppSessionsForUser,
  type DoctorAppSessionWithBookingsDto,
} from "@/services/doctor-app/list-doctor-app-sessions.service"

export type GetDoctorAppSessionByIdResult =
  | { success: true; status: 200; session: DoctorAppSessionWithBookingsDto }
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

  const targetSession = await prisma.session.findFirst({
    where: {
      id: trimmedSessionId,
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

  const day = moment(targetSession.date).format("YYYY-MM-DD")
  const listResult = await listDoctorAppSessionsForUser(userId, {
    fromDate: day,
    toDate: day,
  })

  if (!listResult.success) {
    return {
      success: false,
      status: listResult.status,
      error: listResult.error,
      message: listResult.message,
    }
  }

  const session = listResult.sessions.find((s) => s.id === trimmedSessionId)

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
