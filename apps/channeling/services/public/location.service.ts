"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  bulkDeleteLocationsByIdsService,
  checkLocationHasLinkedRecordsService,
  checkLocationsHaveLinkedRecordsService,
  createLocationService,
  deleteLocationByIdService,
  getLocationByIdService,
  updateOneLocationService,
} from "@/services/location.service"
import type { LocationFormValues } from "@/types/location"

/** Public API location DTO (no audit or GL account fields). */
export type PublicLocationDto = {
  id: string
  name: string
  code: string
  addressLine1: string
  addressLine2: string
  city: string
  /** 1 = Main Location, 2 = Branch, 3 = Collection Center */
  branchType: number
  /** 0 = unpublish, 1 = publish */
  status: number
  order: number
  color: string | null
}

export type GetPublicLocationListResult =
  | { success: true; data: PublicLocationDto[]; totalRecords: number }
  | {
      success: false
      code: "invalid_request" | "server_error"
      message: string
    }

export type GetPublicLocationByIdResult =
  | { success: true; data: PublicLocationDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

const VALID_BRANCH_TYPES = [1, 2, 3] as const
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/

function mapPublicLocation(record: Record<string, unknown>): PublicLocationDto {
  const branchType =
    typeof record.branchType === "number"
      ? record.branchType
      : Number(record.branchType) || 0
  const order =
    typeof record.order === "number" ? record.order : Number(record.order) || 0
  const colorRaw = record.color

  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? ""),
    code: String(record.code ?? ""),
    addressLine1: String(record.addressLine1 ?? ""),
    addressLine2: String(record.addressLine2 ?? ""),
    city: String(record.city ?? ""),
    branchType,
    status: typeof record.status === "number" ? record.status : Number(record.status) || 0,
    order,
    color:
      colorRaw != null && String(colorRaw).trim() !== "" ? String(colorRaw).trim() : null,
  }
}

function parseBranchType(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  if (!VALID_BRANCH_TYPES.includes(num as 1 | 2 | 3)) return null
  return num
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

function parseColor(value: unknown): string | null | "invalid" {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (trimmed === "") return null
  if (!HEX_COLOR_REGEX.test(trimmed)) return "invalid"
  return trimmed
}

function toLocationFormValues(payload: {
  name: string
  code: string
  branchType: number
  status: number
  order: number
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  color?: string | null
}): LocationFormValues {
  return {
    name: payload.name,
    code: payload.code,
    branchType: String(payload.branchType),
    status: payload.status,
    order: payload.order,
    addressLine1: payload.addressLine1 ?? "",
    addressLine2: payload.addressLine2 ?? "",
    city: payload.city ?? "",
    color: payload.color ?? "",
  }
}

/**
 * List locations for public API (paginated, 1-based page).
 */
export async function getPublicLocationList(params: {
  page?: string | null
  limit?: string | null
  keyword?: string | null
  status?: string | null
  branchType?: string | null
  publishedOnly?: string | null
  updatedSince?: string | null
}): Promise<GetPublicLocationListResult> {
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

  const branchTypeFilter = parseBranchType(params.branchType)
  if (params.branchType != null && params.branchType !== "" && branchTypeFilter === null) {
    return {
      success: false,
      code: "invalid_request",
      message: "branchType must be 1 (Main Location), 2 (Branch), or 3 (Collection Center)",
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

  try {
    const where: Prisma.LocationWhereInput = {}

    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { city: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
        { code: { contains: keyword, mode: Prisma.QueryMode.insensitive } },
      ]
    }
    if (statusFilter !== null) {
      where.status = statusFilter
    }
    if (branchTypeFilter !== null) {
      where.branchType = branchTypeFilter
    }
    if (publishedOnly === true) {
      where.status = 1
    }
    if (updatedSince) {
      where.updatedAt = { gte: updatedSince }
    }

    const [records, totalRecords] = await Promise.all([
      prisma.location.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: [{ order: "asc" }, { name: "asc" }],
      }),
      prisma.location.count({ where }),
    ])

    return {
      success: true,
      data: records.map((r) => mapPublicLocation(r as Record<string, unknown>)),
      totalRecords,
    }
  } catch (error: unknown) {
    console.error("getPublicLocationList error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch locations",
    }
  }
}

/**
 * Get one location for public API by id.
 */
export async function getPublicLocationById(id: string): Promise<GetPublicLocationByIdResult> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      code: "invalid_request",
      message: "Location id is required",
    }
  }

  try {
    const result = await getLocationByIdService(trimmed)

    if (!result.success) {
      return {
        success: false,
        code: "server_error",
        message: result.error?.message ?? "Failed to fetch location",
      }
    }

    if (!result.data) {
      return {
        success: false,
        code: "not_found",
        message: "Location not found",
      }
    }

    return {
      success: true,
      data: mapPublicLocation(result.data as Record<string, unknown>),
    }
  } catch (error: unknown) {
    console.error("getPublicLocationById error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch location",
    }
  }
}

/**
 * Create location via public API (includes GL account setup via createLocationService).
 */
export async function createPublicLocation(payload: {
  name?: string
  code?: string
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  branchType?: unknown
  status?: number
  order?: number
  color?: string | null
}): Promise<{
  success: boolean
  data?: PublicLocationDto
  warning?: string
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const name = payload.name?.trim() ?? ""
  const code = payload.code?.trim() ?? ""
  const branchType = parseBranchType(payload.branchType)
  const status = typeof payload.status === "number" ? payload.status : 1
  const order = typeof payload.order === "number" ? payload.order : undefined

  const issues: Record<string, string[]> = {}

  if (!name) issues.name = ["This field is mandatory"]
  if (!code) issues.code = ["This field is mandatory"]
  if (branchType === null) {
    issues.branchType = [
      "BranchType must be Main Location (1), Branch (2) or Collection Center (3)",
    ]
  }
  if (status !== 0 && status !== 1) {
    issues.status = ["Status must be Unpublish (0) or Publish (1)"]
  }
  if (order === undefined || !Number.isInteger(order) || order < 0) {
    issues.order = ["Must be 0 or greater"]
  }

  const color = parseColor(payload.color)
  if (color === "invalid") {
    issues.color = ["Color must be a hex value (e.g. #22c55e)"]
  }

  if (Object.keys(issues).length > 0) {
    return {
      success: false,
      error: { message: "Validation failed", issues },
    }
  }

  const formValues = toLocationFormValues({
    name,
    code,
    branchType: branchType!,
    status,
    order: order!,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    city: payload.city,
    color: color ?? null,
  })

  const result = await createLocationService(formValues)

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? "Failed to create location",
        issues: result.error?.issues as Record<string, string[]> | undefined,
      },
    }
  }

  const createdId = result.data?.id as string | undefined
  let warning: string | undefined
  if (result.message?.includes("linked GL accounts could not be created")) {
    warning = result.message
  }

  if (createdId) {
    const location = await getPublicLocationById(createdId)
    if (location.success) {
      return { success: true, data: location.data, warning }
    }
  }

  return {
    success: true,
    data: mapPublicLocation((result.data ?? {}) as Record<string, unknown>),
    warning,
  }
}

/**
 * Update location via public API.
 */
export async function updatePublicLocation(
  id: string,
  payload: Partial<{
    name: string
    code: string
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    branchType: unknown
    status: number
    order: number
    color: string | null
  }>
): Promise<{
  success: boolean
  data?: PublicLocationDto
  notFound?: boolean
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Location id is required" },
    }
  }

  const existing = await getLocationByIdService(trimmed)
  if (!existing.success || !existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: "Location not found" },
    }
  }

  const issues: Record<string, string[]> = {}

  if (payload.branchType !== undefined) {
    const branchType = parseBranchType(payload.branchType)
    if (branchType === null) {
      issues.branchType = [
        "BranchType must be Main Location (1), Branch (2) or Collection Center (3)",
      ]
    }
  }

  if (payload.status !== undefined && payload.status !== 0 && payload.status !== 1) {
    issues.status = ["Status must be Unpublish (0) or Publish (1)"]
  }

  if (
    payload.order !== undefined &&
    (!Number.isInteger(payload.order) || payload.order < 0)
  ) {
    issues.order = ["Must be 0 or greater"]
  }

  if (payload.color !== undefined) {
    const color = parseColor(payload.color)
    if (color === "invalid") {
      issues.color = ["Color must be a hex value (e.g. #22c55e)"]
    }
  }

  if (Object.keys(issues).length > 0) {
    return {
      success: false,
      error: { message: "Validation failed", issues },
    }
  }

  const updatePayload: Partial<LocationFormValues> = {}

  if (payload.name !== undefined) updatePayload.name = payload.name
  if (payload.code !== undefined) updatePayload.code = payload.code
  if (payload.addressLine1 !== undefined) updatePayload.addressLine1 = payload.addressLine1 ?? ""
  if (payload.addressLine2 !== undefined) updatePayload.addressLine2 = payload.addressLine2 ?? ""
  if (payload.city !== undefined) updatePayload.city = payload.city ?? ""
  if (payload.branchType !== undefined) {
    updatePayload.branchType = String(parseBranchType(payload.branchType))
  }
  if (payload.status !== undefined) updatePayload.status = payload.status
  if (payload.order !== undefined) updatePayload.order = payload.order
  if (payload.color !== undefined) {
    const color = parseColor(payload.color)
    updatePayload.color = color ?? ""
  }

  const result = await updateOneLocationService(trimmed, updatePayload)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to update location"
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

  const location = await getPublicLocationById(trimmed)
  if (location.success) {
    return { success: true, data: location.data }
  }

  return {
    success: true,
    data: mapPublicLocation((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Delete one location via public API (blocked when linked to zones or rooms).
 */
export async function deletePublicLocation(id: string): Promise<{
  success: boolean
  notFound?: boolean
  linked?: boolean
  error?: { message?: string }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Location id is required" },
    }
  }

  const existing = await getLocationByIdService(trimmed)
  if (!existing.success) {
    return {
      success: false,
      error: { message: existing.error?.message ?? "Failed to fetch location" },
    }
  }
  if (!existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: "Location not found" },
    }
  }

  const linkedCheck = await checkLocationHasLinkedRecordsService(trimmed)
  if (!linkedCheck.success) {
    return {
      success: false,
      error: {
        message: linkedCheck.error?.message ?? "Failed to check location linked records",
      },
    }
  }
  if (linkedCheck.data?.hasLinkedRecords) {
    return {
      success: false,
      linked: true,
      error: {
        message:
          "Location is linked to zones or rooms and cannot be deleted",
      },
    }
  }

  const result = await deleteLocationByIdService(trimmed)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete location"
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
 * Bulk delete locations via public API (blocked when any are linked to zones or rooms).
 */
export async function bulkDeletePublicLocations(ids: string[]): Promise<{
  success: boolean
  count?: number
  notFound?: boolean
  linked?: boolean
  error?: { message?: string }
}> {
  const linkedCheck = await checkLocationsHaveLinkedRecordsService(ids)
  if (!linkedCheck.success) {
    return {
      success: false,
      error: {
        message: linkedCheck.error?.message ?? "Failed to check locations linked records",
      },
    }
  }
  if (linkedCheck.data?.hasLinkedRecords) {
    return {
      success: false,
      linked: true,
      error: {
        message:
          "One or more locations are linked to zones or rooms and cannot be deleted",
      },
    }
  }

  const result = await bulkDeleteLocationsByIdsService(ids)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete locations"
    const notFound =
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("no location")
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
