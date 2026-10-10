"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  bulkDeleteRoomsByIdsService,
  createRoomService,
  deleteRoomByIdService,
  getRoomByIdService,
  updateOneRoomService,
} from "@/services/room.service"
import type { RoomFormValues } from "@/types/room"

/** Public API room DTO (no audit or occupancy fields). */
export type PublicRoomDto = {
  id: string
  number: string
  description: string
  /** 0 = unpublish, 1 = publish */
  status: number
  locationId: string
  zoneId: string
}

export type GetPublicRoomListResult =
  | { success: true; data: PublicRoomDto[]; totalRecords: number }
  | {
      success: false
      code: "invalid_request" | "server_error"
      message: string
    }

export type GetPublicRoomByIdResult =
  | { success: true; data: PublicRoomDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

function mapPublicRoom(record: Record<string, unknown>): PublicRoomDto {
  return {
    id: String(record.id ?? ""),
    number: String(record.number ?? ""),
    description: String(record.description ?? ""),
    status: typeof record.status === "number" ? record.status : Number(record.status) || 0,
    locationId: String(record.locationId ?? ""),
    zoneId: String(record.zoneId ?? ""),
  }
}

function parseStatusFilter(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  if (num !== 0 && num !== 1) return null
  return num
}

function parsePublishedOnly(value: unknown): boolean | null | "invalid" {
  if (value === null || value === undefined || value === "") return null
  const normalized = String(value).trim().toLowerCase()
  if (["true", "1", "yes"].includes(normalized)) return true
  if (["false", "0", "no"].includes(normalized)) return false
  return "invalid"
}

function parseUpdatedSince(value: unknown): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "invalid"
  return date
}

async function locationExists(locationId: string): Promise<boolean> {
  const trimmed = locationId.trim()
  if (!trimmed) return false
  const location = await prisma.location.findUnique({
    where: { id: trimmed },
    select: { id: true },
  })
  return location !== null
}

async function zoneBelongsToLocation(
  zoneId: string,
  locationId: string
): Promise<{ ok: boolean; reason?: "not_found" | "mismatch" }> {
  const zone = await prisma.zone.findUnique({
    where: { id: zoneId.trim() },
    select: { id: true, locationId: true },
  })
  if (!zone) return { ok: false, reason: "not_found" }
  if (zone.locationId !== locationId.trim()) return { ok: false, reason: "mismatch" }
  return { ok: true }
}

async function roomHasBlockingLinks(roomId: string): Promise<{
  blocked: boolean
  message?: string
}> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { currentOccupiedSessionId: true },
  })

  if (room?.currentOccupiedSessionId) {
    return {
      blocked: true,
      message: "Room is currently occupied and cannot be deleted",
    }
  }

  const [doctorSessionCount, sessionCount] = await Promise.all([
    prisma.doctorSession.count({ where: { roomId } }),
    prisma.session.count({ where: { roomId } }),
  ])

  if (doctorSessionCount > 0 || sessionCount > 0) {
    return {
      blocked: true,
      message: "Room is linked to sessions and cannot be deleted",
    }
  }

  return { blocked: false }
}

async function anyRoomsHaveBlockingLinks(roomIds: string[]): Promise<{
  blocked: boolean
  message?: string
}> {
  const occupiedCount = await prisma.room.count({
    where: {
      id: { in: roomIds },
      currentOccupiedSessionId: { not: null },
    },
  })

  if (occupiedCount > 0) {
    return {
      blocked: true,
      message: "One or more rooms are currently occupied and cannot be deleted",
    }
  }

  const [doctorSessionCount, sessionCount] = await Promise.all([
    prisma.doctorSession.count({ where: { roomId: { in: roomIds } } }),
    prisma.session.count({ where: { roomId: { in: roomIds } } }),
  ])

  if (doctorSessionCount > 0 || sessionCount > 0) {
    return {
      blocked: true,
      message: "One or more rooms are linked to sessions and cannot be deleted",
    }
  }

  return { blocked: false }
}

/**
 * List rooms for public API (paginated, 1-based page).
 */
export async function getPublicRoomList(params: {
  page?: string | null
  limit?: string | null
  keyword?: string | null
  locationId?: string | null
  zoneId?: string | null
  status?: string | null
  publishedOnly?: string | null
  updatedSince?: string | null
}): Promise<GetPublicRoomListResult> {
  const pageNumber = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.limit ?? "10", 10) || 10))
  const skip = (pageNumber - 1) * pageSize
  const keyword = params.keyword?.trim() ?? ""

  const statusFilter = parseStatusFilter(params.status)
  if (params.status != null && params.status !== "" && statusFilter === null) {
    return {
      success: false,
      code: "invalid_request",
      message: "status must be 0 (unpublish) or 1 (publish)",
    }
  }

  const publishedOnly = parsePublishedOnly(params.publishedOnly)
  if (publishedOnly === "invalid") {
    return {
      success: false,
      code: "invalid_request",
      message: "publishedOnly must be true or false",
    }
  }

  const updatedSince = parseUpdatedSince(params.updatedSince)
  if (updatedSince === "invalid") {
    return {
      success: false,
      code: "invalid_request",
      message: "updatedSince must be a valid date-time value",
    }
  }

  const locationIdFilter = params.locationId?.trim() ?? ""
  const zoneIdFilter = params.zoneId?.trim() ?? ""

  try {
    const where: Prisma.RoomWhereInput = {}

    if (keyword) {
      where.OR = [
        { number: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        {
          zone: {
            is: {
              name: { contains: keyword, mode: Prisma.QueryMode.insensitive },
            },
          },
        },
      ]
    }
    if (locationIdFilter) {
      where.locationId = locationIdFilter
    }
    if (zoneIdFilter) {
      where.zoneId = zoneIdFilter
    }
    if (statusFilter !== null) {
      where.status = statusFilter
    }
    if (publishedOnly === true) {
      where.status = 1
    }
    if (updatedSince) {
      where.updatedAt = { gte: updatedSince }
    }

    const [records, totalRecords] = await Promise.all([
      prisma.room.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.room.count({ where }),
    ])

    return {
      success: true,
      data: records.map((r) => mapPublicRoom(r as Record<string, unknown>)),
      totalRecords,
    }
  } catch (error: unknown) {
    console.error("getPublicRoomList error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch rooms",
    }
  }
}

/**
 * Get one room for public API by id.
 */
export async function getPublicRoomById(id: string): Promise<GetPublicRoomByIdResult> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      code: "invalid_request",
      message: "Room id is required",
    }
  }

  try {
    const result = await getRoomByIdService(trimmed)

    if (!result.success) {
      return {
        success: false,
        code: "server_error",
        message: result.error?.message ?? "Failed to fetch room",
      }
    }

    if (!result.data) {
      return {
        success: false,
        code: "not_found",
        message: "Room not found",
      }
    }

    return {
      success: true,
      data: mapPublicRoom(result.data as Record<string, unknown>),
    }
  } catch (error: unknown) {
    console.error("getPublicRoomById error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch room",
    }
  }
}

/**
 * Create room via public API.
 */
export async function createPublicRoom(payload: {
  number?: string
  description?: string | null
  locationId?: string
  zoneId?: string
  status?: number
}): Promise<{
  success: boolean
  data?: PublicRoomDto
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const number = payload.number?.trim() ?? ""
  const locationId = payload.locationId?.trim() ?? ""
  const zoneId = payload.zoneId?.trim() ?? ""
  const status = typeof payload.status === "number" ? payload.status : 1

  const issues: Record<string, string[]> = {}

  if (!number) issues.number = ["This field is mandatory"]
  if (!locationId) issues.locationId = ["This field is mandatory"]
  if (!zoneId) issues.zoneId = ["This field is mandatory"]
  if (status !== 0 && status !== 1) {
    issues.status = ["Status must be Unpublish (0) or Publish (1)"]
  }

  if (locationId && !(await locationExists(locationId))) {
    issues.locationId = ["Location not found"]
  }

  if (zoneId && locationId && !issues.locationId) {
    const zoneCheck = await zoneBelongsToLocation(zoneId, locationId)
    if (!zoneCheck.ok) {
      issues.zoneId =
        zoneCheck.reason === "not_found"
          ? ["Zone not found"]
          : ["Zone does not belong to the selected location"]
    }
  }

  if (Object.keys(issues).length > 0) {
    return {
      success: false,
      error: { message: "Validation failed", issues },
    }
  }

  const formValues: RoomFormValues = {
    number,
    description: payload.description ?? "",
    locationId,
    zoneId,
    status,
  }

  const result = await createRoomService(formValues)

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? "Failed to create room",
        issues: result.error?.issues as Record<string, string[]> | undefined,
      },
    }
  }

  const createdId = result.data?.id as string | undefined
  if (createdId) {
    const room = await getPublicRoomById(createdId)
    if (room.success) {
      return { success: true, data: room.data }
    }
  }

  return {
    success: true,
    data: mapPublicRoom((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Update room via public API.
 */
export async function updatePublicRoom(
  id: string,
  payload: Partial<{
    number: string
    description: string | null
    locationId: string
    zoneId: string
    status: number
  }>
): Promise<{
  success: boolean
  data?: PublicRoomDto
  notFound?: boolean
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Room id is required" },
    }
  }

  const existing = await getRoomByIdService(trimmed)
  if (!existing.success || !existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: "Room not found" },
    }
  }

  const current = existing.data as Record<string, unknown>
  const issues: Record<string, string[]> = {}

  if (payload.status !== undefined && payload.status !== 0 && payload.status !== 1) {
    issues.status = ["Status must be Unpublish (0) or Publish (1)"]
  }

  const nextLocationId =
    payload.locationId !== undefined
      ? payload.locationId.trim()
      : String(current.locationId ?? "")
  const nextZoneId =
    payload.zoneId !== undefined ? payload.zoneId.trim() : String(current.zoneId ?? "")

  if (payload.locationId !== undefined && !nextLocationId) {
    issues.locationId = ["This field is mandatory"]
  }
  if (payload.zoneId !== undefined && !nextZoneId) {
    issues.zoneId = ["This field is mandatory"]
  }

  if (payload.locationId !== undefined && nextLocationId) {
    if (!(await locationExists(nextLocationId))) {
      issues.locationId = ["Location not found"]
    }
  }

  if (
    (payload.locationId !== undefined || payload.zoneId !== undefined) &&
    nextLocationId &&
    nextZoneId &&
    !issues.locationId &&
    !issues.zoneId
  ) {
    const zoneCheck = await zoneBelongsToLocation(nextZoneId, nextLocationId)
    if (!zoneCheck.ok) {
      issues.zoneId =
        zoneCheck.reason === "not_found"
          ? ["Zone not found"]
          : ["Zone does not belong to the selected location"]
    }
  }

  if (Object.keys(issues).length > 0) {
    return {
      success: false,
      error: { message: "Validation failed", issues },
    }
  }

  const updatePayload: Partial<RoomFormValues> = {}

  if (payload.number !== undefined) updatePayload.number = payload.number
  if (payload.description !== undefined) {
    updatePayload.description = payload.description ?? ""
  }
  if (payload.status !== undefined) updatePayload.status = payload.status
  if (payload.locationId !== undefined) updatePayload.locationId = nextLocationId
  if (payload.zoneId !== undefined) updatePayload.zoneId = nextZoneId

  // Ensure uniqueness check in updateOneRoomService has locationId + zoneId + number
  if (updatePayload.number === undefined) {
    updatePayload.number = String(current.number ?? "")
  }
  if (updatePayload.locationId === undefined) {
    updatePayload.locationId = String(current.locationId ?? "")
  }
  if (updatePayload.zoneId === undefined) {
    updatePayload.zoneId = String(current.zoneId ?? "")
  }

  const result = await updateOneRoomService(trimmed, updatePayload)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to update room"
    const notFound = message.toLowerCase().includes("not found")
    return {
      success: false,
      notFound,
      error: {
        message,
        issues: result.error?.issues as Record<string, string[]> | undefined,
      },
    }
  }

  const room = await getPublicRoomById(trimmed)
  if (room.success) {
    return { success: true, data: room.data }
  }

  return {
    success: true,
    data: mapPublicRoom((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Delete one room via public API (blocked when occupied or linked to sessions).
 */
export async function deletePublicRoom(id: string): Promise<{
  success: boolean
  notFound?: boolean
  linked?: boolean
  error?: { message?: string }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Room id is required" },
    }
  }

  const existing = await getRoomByIdService(trimmed)
  if (!existing.success) {
    return {
      success: false,
      error: { message: existing.error?.message ?? "Failed to fetch room" },
    }
  }
  if (!existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: "Room not found" },
    }
  }

  const linkCheck = await roomHasBlockingLinks(trimmed)
  if (linkCheck.blocked) {
    return {
      success: false,
      linked: true,
      error: { message: linkCheck.message ?? "Room cannot be deleted" },
    }
  }

  const result = await deleteRoomByIdService(trimmed)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete room"
    const notFound = message.toLowerCase().includes("not found")
    return {
      success: false,
      notFound,
      error: { message },
    }
  }

  return { success: true }
}

/**
 * Bulk delete rooms via public API (blocked when any are occupied or linked to sessions).
 */
export async function bulkDeletePublicRooms(ids: string[]): Promise<{
  success: boolean
  count?: number
  notFound?: boolean
  linked?: boolean
  error?: { message?: string }
}> {
  const linkCheck = await anyRoomsHaveBlockingLinks(ids)
  if (linkCheck.blocked) {
    return {
      success: false,
      linked: true,
      error: {
        message: linkCheck.message ?? "Rooms cannot be deleted",
      },
    }
  }

  const result = await bulkDeleteRoomsByIdsService(ids)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete rooms"
    const notFound =
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("no room")
    return {
      success: false,
      notFound,
      error: { message },
    }
  }

  return {
    success: true,
    count: result.data?.count ?? ids.length,
  }
}
