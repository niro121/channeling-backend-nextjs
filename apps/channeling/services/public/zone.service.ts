"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  deleteOneZone,
  deleteZones,
  getZoneById,
  saveZone,
  updateOneZone,
} from "@/services/zone.service"
import type { Zone } from "@/types/zone"

/** Public API zone DTO (no audit fields). */
export type PublicZoneDto = {
  id: string
  name: string
  description: string | null
  locationId: string
  /** 0 = unpublish, 1 = publish */
  status: number
}

export type GetPublicZoneListResult =
  | { success: true; data: PublicZoneDto[]; totalRecords: number }
  | {
      success: false
      code: "invalid_request" | "server_error"
      message: string
    }

export type GetPublicZoneByIdResult =
  | { success: true; data: PublicZoneDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

function mapPublicZone(record: Record<string, unknown>): PublicZoneDto {
  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? ""),
    description:
      record.description != null && record.description !== ""
        ? String(record.description)
        : null,
    locationId: String(record.locationId ?? ""),
    status: typeof record.status === "number" ? record.status : Number(record.status) || 0,
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

async function getValidLocationIds(): Promise<string[]> {
  const locations = await prisma.location.findMany({ select: { id: true } })
  return Array.from(new Set(locations.map((loc) => loc.id)))
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

async function zoneHasLinkedRooms(zoneId: string): Promise<boolean> {
  const roomCount = await prisma.room.count({
    where: { zoneId },
  })
  return roomCount > 0
}

async function anyZonesHaveLinkedRooms(zoneIds: string[]): Promise<boolean> {
  const roomCount = await prisma.room.count({
    where: { zoneId: { in: zoneIds } },
  })
  return roomCount > 0
}

/**
 * List zones for public API (paginated, 1-based page).
 */
export async function getPublicZoneList(params: {
  page?: string | null
  limit?: string | null
  keyword?: string | null
  locationId?: string | null
  status?: string | null
  publishedOnly?: string | null
  updatedSince?: string | null
}): Promise<GetPublicZoneListResult> {
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

  try {
    const validLocationIds = await getValidLocationIds()
    if (validLocationIds.length === 0) {
      return { success: true, data: [], totalRecords: 0 }
    }

    if (locationIdFilter && !validLocationIds.includes(locationIdFilter)) {
      return { success: true, data: [], totalRecords: 0 }
    }

    const where: Prisma.ZoneWhereInput = {
      locationId: locationIdFilter
        ? locationIdFilter
        : { in: validLocationIds },
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { description: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
      ]
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
      prisma.zone.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.zone.count({ where }),
    ])

    return {
      success: true,
      data: records.map((r) => mapPublicZone(r as Record<string, unknown>)),
      totalRecords,
    }
  } catch (error: unknown) {
    console.error("getPublicZoneList error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch zones",
    }
  }
}

/**
 * Get one zone for public API by id.
 */
export async function getPublicZoneById(id: string): Promise<GetPublicZoneByIdResult> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      code: "invalid_request",
      message: "Zone id is required",
    }
  }

  try {
    const result = await getZoneById(trimmed)

    if (!result.success) {
      return {
        success: false,
        code: "server_error",
        message: result.error?.message ?? "Failed to fetch zone",
      }
    }

    if (!result.data) {
      return {
        success: false,
        code: "not_found",
        message: "Zone not found",
      }
    }

    return {
      success: true,
      data: mapPublicZone(result.data as Record<string, unknown>),
    }
  } catch (error: unknown) {
    console.error("getPublicZoneById error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch zone",
    }
  }
}

/**
 * Create zone via public API.
 */
export async function createPublicZone(payload: {
  name?: string
  description?: string | null
  locationId?: string
  status?: number
}): Promise<{
  success: boolean
  data?: PublicZoneDto
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const name = payload.name?.trim() ?? ""
  const locationId = payload.locationId?.trim() ?? ""
  const status = typeof payload.status === "number" ? payload.status : 1

  const issues: Record<string, string[]> = {}

  if (!name) issues.name = ["This field is mandatory"]
  if (!locationId) issues.locationId = ["This field is mandatory"]
  if (status !== 0 && status !== 1) {
    issues.status = ["Status must be Unpublish (0) or Publish (1)"]
  }

  if (locationId && !(await locationExists(locationId))) {
    issues.locationId = ["Location not found"]
  }

  if (Object.keys(issues).length > 0) {
    return {
      success: false,
      error: { message: "Validation failed", issues },
    }
  }

  const zonePayload: Zone = {
    name,
    description: payload.description ?? null,
    locationId,
    status,
  }

  const result = await saveZone(zonePayload)

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? "Failed to create zone",
        issues: result.error?.issues as Record<string, string[]> | undefined,
      },
    }
  }

  const createdId = result.data?.id as string | undefined
  if (createdId) {
    const zone = await getPublicZoneById(createdId)
    if (zone.success) {
      return { success: true, data: zone.data }
    }
  }

  return {
    success: true,
    data: mapPublicZone((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Update zone via public API.
 */
export async function updatePublicZone(
  id: string,
  payload: Partial<{
    name: string
    description: string | null
    locationId: string
    status: number
  }>
): Promise<{
  success: boolean
  data?: PublicZoneDto
  notFound?: boolean
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Zone id is required" },
    }
  }

  const existing = await getZoneById(trimmed)
  if (!existing.success || !existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: "Zone not found" },
    }
  }

  const current = existing.data as Record<string, unknown>
  const issues: Record<string, string[]> = {}

  if (payload.status !== undefined && payload.status !== 0 && payload.status !== 1) {
    issues.status = ["Status must be Unpublish (0) or Publish (1)"]
  }

  if (payload.locationId !== undefined) {
    const locationId = payload.locationId.trim()
    if (!locationId) {
      issues.locationId = ["This field is mandatory"]
    } else if (!(await locationExists(locationId))) {
      issues.locationId = ["Location not found"]
    }
  }

  if (Object.keys(issues).length > 0) {
    return {
      success: false,
      error: { message: "Validation failed", issues },
    }
  }

  const updatePayload: Partial<Zone> = { id: trimmed }

  if (payload.name !== undefined) updatePayload.name = payload.name
  if (payload.description !== undefined) updatePayload.description = payload.description
  if (payload.locationId !== undefined) updatePayload.locationId = payload.locationId.trim()
  if (payload.status !== undefined) updatePayload.status = payload.status

  // Ensure updateOneZone duplicate check runs when name or location changes
  if (updatePayload.name === undefined) {
    updatePayload.name = String(current.name ?? "")
  }
  if (updatePayload.locationId === undefined) {
    updatePayload.locationId = String(current.locationId ?? "")
  }

  const result = await updateOneZone(trimmed, updatePayload)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to update zone"
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

  const zone = await getPublicZoneById(trimmed)
  if (zone.success) {
    return { success: true, data: zone.data }
  }

  return {
    success: true,
    data: mapPublicZone((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Delete one zone via public API (blocked when linked to rooms).
 */
export async function deletePublicZone(id: string): Promise<{
  success: boolean
  notFound?: boolean
  linked?: boolean
  error?: { message?: string }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Zone id is required" },
    }
  }

  const existing = await getZoneById(trimmed)
  if (!existing.success) {
    return {
      success: false,
      error: { message: existing.error?.message ?? "Failed to fetch zone" },
    }
  }
  if (!existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: "Zone not found" },
    }
  }

  if (await zoneHasLinkedRooms(trimmed)) {
    return {
      success: false,
      linked: true,
      error: { message: "Zone is linked to rooms and cannot be deleted" },
    }
  }

  const result = await deleteOneZone(trimmed)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete zone"
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
 * Bulk delete zones via public API (blocked when any are linked to rooms).
 */
export async function bulkDeletePublicZones(ids: string[]): Promise<{
  success: boolean
  count?: number
  notFound?: boolean
  linked?: boolean
  error?: { message?: string }
}> {
  if (await anyZonesHaveLinkedRooms(ids)) {
    return {
      success: false,
      linked: true,
      error: {
        message: "One or more zones are linked to rooms and cannot be deleted",
      },
    }
  }

  const result = await deleteZones(ids)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete zones"
    const notFound =
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("no zone")
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
