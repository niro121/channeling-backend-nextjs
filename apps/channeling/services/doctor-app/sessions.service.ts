import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
import { resolveDoctorProfileForUser } from "@/lib/helpers/auth/doctor-login"
import {
  getPublicSessionsByDoctorCode,
  type PublicSessionDto,
} from "@/services/public/sessions.service"

export type GetDoctorAppSessionsResult =
  | { success: true; status: 200; sessions: PublicSessionDto[] }
  | {
      success: false
      status: 401 | 404 | 400 | 500
      error: string
      message?: string
    }

/**
 * Sessions for the logged-in doctor app user (resolved from account link or username = doctor code).
 */
export async function getDoctorAppSessions(
  userId: string,
  fromDateParam?: string | null
): Promise<GetDoctorAppSessionsResult> {
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

  const result = await getPublicSessionsByDoctorCode(profile.code, fromDateParam)

  if (!result.success) {
    const status =
      result.code === "invalid_request"
        ? 400
        : result.code === "not_found"
          ? 404
          : 500
    return {
      success: false,
      status,
      error: result.code,
      message: result.message,
    }
  }

  return { success: true, status: 200, sessions: result.data }
}
