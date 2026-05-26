import prisma from "@/lib/prisma"
import { DOCTOR_USER_TYPE } from "@/lib/doctor-app-auth"
import { resolveDoctorProfileForUser } from "@/lib/helpers/auth/doctor-login"
import type { PublicSessionDto } from "@/services/public/sessions.service"
import moment from "moment"
import {
  fetchDoctorAppSessionsForDoctor,
  type DoctorAppSessionsDateBounds,
} from "@/services/doctor-app/doctor-app-sessions.repository"
import { mapDoctorAppSessionsToDto } from "@/services/doctor-app/doctor-app-sessions.mapper"

export type ListDoctorAppSessionsResult =
  | { success: true; status: 200; sessions: PublicSessionDto[] }
  | {
      success: false
      status: 401 | 404 | 400 | 500
      error: string
      message?: string
    }

export type DoctorAppSessionsListQuery = {
  all?: boolean
  fromDate?: string | null
  toDate?: string | null
}

/**
 * Resolves date bounds for mobile doctor-app sessions.
 * Default: today only. all=true: open-ended from today (or fromDate).
 */
export function resolveDoctorAppSessionsListBounds(
  query: DoctorAppSessionsListQuery
): { ok: true; bounds: DoctorAppSessionsDateBounds } | { ok: false; message: string } {
  const all = query.all === true
  const fromDate = query.fromDate?.trim() ?? null
  const toDate = query.toDate?.trim() ?? null

  const parseDay = (value: string) => {
    const m = moment(value, "YYYY-MM-DD", true)
    return m.isValid() ? m : null
  }

  if (fromDate && !parseDay(fromDate)) {
    return { ok: false, message: "fromDate must be YYYY-MM-DD" }
  }
  if (toDate && !parseDay(toDate)) {
    return { ok: false, message: "toDate must be YYYY-MM-DD" }
  }
  if (toDate && !fromDate) {
    return { ok: false, message: "fromDate is required when toDate is provided" }
  }
  if (all && toDate) {
    return { ok: false, message: "toDate cannot be used with all=true" }
  }

  if (all) {
    const from = fromDate
      ? parseDay(fromDate)!.startOf("day").toDate()
      : moment().startOf("day").toDate()
    return { ok: true, bounds: { from } }
  }

  if (fromDate && toDate) {
    const fromM = parseDay(fromDate)!
    const toM = parseDay(toDate)!
    if (toM.isBefore(fromM, "day")) {
      return { ok: false, message: "toDate must be on or after fromDate" }
    }
    return {
      ok: true,
      bounds: {
        from: fromM.startOf("day").toDate(),
        to: toM.endOf("day").toDate(),
      },
    }
  }

  if (fromDate) {
    const day = parseDay(fromDate)!
    return {
      ok: true,
      bounds: {
        from: day.startOf("day").toDate(),
        to: day.clone().endOf("day").toDate(),
      },
    }
  }

  const today = moment().startOf("day")
  return {
    ok: true,
    bounds: {
      from: today.toDate(),
      to: today.clone().endOf("day").toDate(),
    },
  }
}

/**
 * Mobile app: list sessions by doctor code (today / range / all upcoming).
 */
export async function listDoctorAppSessionsByDoctorCode(
  doctorCode: string,
  query: DoctorAppSessionsListQuery = {}
): Promise<ListDoctorAppSessionsResult> {
  const resolved = resolveDoctorAppSessionsListBounds(query)
  if (!resolved.ok) {
    return {
      success: false,
      status: 400,
      error: "invalid_request",
      message: resolved.message,
    }
  }

  const doctor = await prisma.doctor.findUnique({
    where: { code: doctorCode },
    select: { id: true, code: true, title: true, name: true },
  })

  if (!doctor) {
    return {
      success: false,
      status: 404,
      error: "not_found",
      message: "Doctor not found for the given doctor code",
    }
  }

  const fetchResult = await fetchDoctorAppSessionsForDoctor(doctor.id, resolved.bounds)
  if (!fetchResult.success) {
    return {
      success: false,
      status: 500,
      error: "server_error",
      message: fetchResult.message,
    }
  }

  return {
    success: true,
    status: 200,
    sessions: mapDoctorAppSessionsToDto(fetchResult.data, doctor),
  }
}

/**
 * Mobile app: list sessions for the logged-in doctor user.
 */
export async function listDoctorAppSessionsForUser(
  userId: string,
  query: DoctorAppSessionsListQuery = {}
): Promise<ListDoctorAppSessionsResult> {
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

  return listDoctorAppSessionsByDoctorCode(profile.code, query)
}
