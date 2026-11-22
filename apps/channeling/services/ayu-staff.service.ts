import "server-only"
import prisma from "@/lib/prisma"
import { userTypes } from "@/lib/roles"

/**
 * Read-only staff profiles for Ayu (the Ruhunu caddie). The caddie links its own users to
 * channeling users by id and asks here, live, whether they are still active. Nothing is copied.
 *
 * Deliberately not "use server": these must never be callable as server actions.
 * Never select NIC, date of birth, address, password/2FA fields, group permissions or HR data.
 */

/** User.status value for an active user: login and session checks use `status !== 1` (lib/auth.ts jwt callback, lib/management-app-auth.ts). */
export const ACTIVE_USER_STATUS = 1
/** Staff.status and UserGroup.status: 1 = active (prisma/schema.prisma). */
const ACTIVE_STATUS = 1

const STAFF_USER_TYPES = [userTypes.admin, userTypes.staff]
const OBJECT_ID = /^[a-f\d]{24}$/i

export const AYU_SEARCH_MIN_CHARS = 2
export const AYU_SEARCH_MAX_LIMIT = 20
const AYU_SEARCH_DEFAULT_LIMIT = 10
export const AYU_STATUS_MAX_IDS = 200

export type StaffProfile = {
  id: string
  name: string
  email: string
  userType: "admin" | "staff"
  active: boolean
  userStatus: number
  staffStatus: number | null
  /** User.phone, else the linked Staff.contactMobile; as stored. */
  mobile: string | null
  staffCode: string | null
  title: string | null
  userGroup: string | null
  sessionVersion: number
  updatedAt: string
}

export type StaffStatus = { id: string; active: boolean; sessionVersion: number }

const profileSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  userType: true,
  status: true,
  sessionVersion: true,
  updatedAt: true,
  staff: { select: { code: true, title: true, contactMobile: true, status: true } },
  userGroup: { select: { name: true, status: true } },
} as const

type ProfileRow = {
  id: string
  name: string
  email: string
  phone: string | null
  userType: number
  status: number
  sessionVersion: number
  updatedAt: Date
  staff: { code: string; title: string; contactMobile: string; status: number } | null
  userGroup: { name: string; status: number } | null
}

export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && OBJECT_ID.test(id)
}

/** Active = user active, and the linked staff record and user group (when present) are active. */
export function isStaffUserActive(row: {
  status: number
  staff: { status: number } | null
  userGroup: { status: number } | null
}): boolean {
  return (
    row.status === ACTIVE_USER_STATUS &&
    (!row.staff || row.staff.status === ACTIVE_STATUS) &&
    (!row.userGroup || row.userGroup.status === ACTIVE_STATUS)
  )
}

function toProfile(row: ProfileRow): StaffProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    userType: row.userType === userTypes.admin ? "admin" : "staff",
    active: isStaffUserActive(row),
    userStatus: row.status,
    staffStatus: row.staff ? row.staff.status : null,
    mobile: row.phone?.trim() ? row.phone : row.staff?.contactMobile?.trim() ? row.staff.contactMobile : null,
    staffCode: row.staff?.code || null,
    title: row.staff?.title || null,
    userGroup: row.userGroup?.name ?? null,
    sessionVersion: row.sessionVersion ?? 0,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export type AyuStaffSearchResult =
  | { success: true; data: StaffProfile[] }
  | { success: false; code: "invalid_request"; message: string }

/** Admin and staff users whose name or email contains `search` (case-insensitive). */
export async function searchAyuStaffUsers(
  search: string | null | undefined,
  limitRaw?: string | number | null
): Promise<AyuStaffSearchResult> {
  const term = (search ?? "").trim()
  if (term.length < AYU_SEARCH_MIN_CHARS) {
    return {
      success: false,
      code: "invalid_request",
      message: `search must be at least ${AYU_SEARCH_MIN_CHARS} characters`,
    }
  }
  const parsed = Number(limitRaw)
  const limit =
    limitRaw == null || limitRaw === "" || !Number.isFinite(parsed) || parsed < 1
      ? AYU_SEARCH_DEFAULT_LIMIT
      : Math.min(Math.floor(parsed), AYU_SEARCH_MAX_LIMIT)

  const rows = await prisma.user.findMany({
    where: {
      userType: { in: STAFF_USER_TYPES },
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: limit,
    select: profileSelect,
  })
  return { success: true, data: rows.map(toProfile) }
}

export type AyuStaffByIdResult =
  | { success: true; data: StaffProfile }
  | { success: false; code: "invalid_request" | "not_found"; message: string }

/** One admin or staff user; other user types are reported as not found. */
export async function getAyuStaffUserById(id: string): Promise<AyuStaffByIdResult> {
  if (!isValidObjectId(id)) {
    return { success: false, code: "invalid_request", message: "id must be a 24-character ObjectId" }
  }
  const row = await prisma.user.findFirst({
    where: { id, userType: { in: STAFF_USER_TYPES } },
    select: profileSelect,
  })
  if (!row) return { success: false, code: "not_found", message: "Staff user not found" }
  return { success: true, data: toProfile(row) }
}

export type AyuStaffStatusResult =
  | { success: true; data: StaffStatus[] }
  | { success: false; code: "invalid_request"; message: string }

/**
 * Live status for many users. Malformed ids are dropped; ids that are not found or are not
 * admin/staff come back as inactive (sessionVersion 0). Order follows the request, de-duplicated.
 */
export async function getAyuStaffStatuses(ids: unknown): Promise<AyuStaffStatusResult> {
  if (!Array.isArray(ids)) {
    return { success: false, code: "invalid_request", message: "ids must be an array of strings" }
  }
  if (ids.length > AYU_STATUS_MAX_IDS) {
    return {
      success: false,
      code: "invalid_request",
      message: `At most ${AYU_STATUS_MAX_IDS} ids per request`,
    }
  }
  const wanted = [...new Set(ids.filter(isValidObjectId).map((id) => id.toLowerCase()))]
  if (wanted.length === 0) return { success: true, data: [] }

  const rows = await prisma.user.findMany({
    where: { id: { in: wanted }, userType: { in: STAFF_USER_TYPES } },
    select: {
      id: true,
      status: true,
      sessionVersion: true,
      staff: { select: { status: true } },
      userGroup: { select: { status: true } },
    },
  })
  const byId = new Map(rows.map((r) => [r.id.toLowerCase(), r]))
  return {
    success: true,
    data: wanted.map((id) => {
      const row = byId.get(id)
      return row
        ? { id: row.id, active: isStaffUserActive(row), sessionVersion: row.sessionVersion ?? 0 }
        : { id, active: false, sessionVersion: 0 }
    }),
  }
}
