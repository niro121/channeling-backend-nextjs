"use server"

import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import {
  getDepartmentById,
  saveDepartment,
  updateOneDepartment,
  deleteOneDepartment,
  deleteDepartments,
} from "@/services/department.service"
import type { Department } from "@/types/department"

/** Public API department DTO (no audit fields). */
export type PublicDepartmentDto = {
  id: string
  name: string
  description: string | null
  /** 0=RH, 1=RHD, 2=RHT, 3=RPS */
  institution: number
  /** 0 = unpublish, 1 = publish */
  status: number
}

export type GetPublicDepartmentListResult =
  | { success: true; data: PublicDepartmentDto[]; totalRecords: number }
  | {
      success: false
      code: "invalid_request" | "server_error"
      message: string
    }

export type GetPublicDepartmentByIdResult =
  | { success: true; data: PublicDepartmentDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

const INSTITUTION_MIN = 0
const INSTITUTION_MAX = 3

function mapPublicDepartment(record: Record<string, unknown>): PublicDepartmentDto {
  const institution =
    typeof record.institution === "number"
      ? record.institution
      : record.institution != null
        ? Number(record.institution)
        : 0

  return {
    id: String(record.id ?? ""),
    name: String(record.name ?? ""),
    description:
      record.description != null && record.description !== ""
        ? String(record.description)
        : null,
    institution: Number.isFinite(institution) ? institution : 0,
    status: typeof record.status === "number" ? record.status : Number(record.status) || 0,
  }
}

function parseInstitution(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(num) || num < INSTITUTION_MIN || num > INSTITUTION_MAX) return null
  return num
}

function parseStatusFilter(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const num = typeof value === "number" ? value : Number.parseInt(String(value), 10)
  if (num !== 0 && num !== 1) return null
  return num
}

function parseUpdatedSince(value: unknown): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") return null
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "invalid"
  return date
}

async function findDuplicateNamePerInstitution(
  name: string,
  institution: number,
  excludeId?: string
): Promise<boolean> {
  const trimmed = name.trim()
  if (!trimmed) return false

  const existing = await prisma.department.findFirst({
    where: {
      name: { equals: trimmed, mode: Prisma.QueryMode.insensitive },
      institution,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  })

  return existing !== null
}

/**
 * List departments for public API (paginated, 1-based page).
 */
export async function getPublicDepartmentList(params: {
  page?: string | null
  limit?: string | null
  keyword?: string | null
  institution?: string | null
  status?: string | null
  updatedSince?: string | null
}): Promise<GetPublicDepartmentListResult> {
  const pageNumber = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.limit ?? "10", 10) || 10))
  const skip = (pageNumber - 1) * pageSize
  const keyword = params.keyword?.trim() ?? ""

  const institutionFilter = parseInstitution(params.institution)
  if (params.institution != null && params.institution !== "" && institutionFilter === null) {
    return {
      success: false,
      code: "invalid_request",
      message: "institution must be an integer between 0 and 3",
    }
  }

  const statusFilter = parseStatusFilter(params.status)
  if (params.status != null && params.status !== "" && statusFilter === null) {
    return {
      success: false,
      code: "invalid_request",
      message: "status must be 0 (unpublish) or 1 (publish)",
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
    const where: Prisma.DepartmentWhereInput = {}

    if (keyword) {
      where.name = { contains: keyword, mode: Prisma.QueryMode.insensitive }
    }
    if (institutionFilter !== null) {
      where.institution = institutionFilter
    }
    if (statusFilter !== null) {
      where.status = statusFilter
    }
    if (updatedSince) {
      where.updatedAt = { gte: updatedSince }
    }

    const [records, totalRecords] = await Promise.all([
      prisma.department.findMany({
        skip,
        take: pageSize,
        where,
        orderBy: { createdAt: "desc" },
      }),
      prisma.department.count({ where }),
    ])

    return {
      success: true,
      data: records.map((r) => mapPublicDepartment(r as Record<string, unknown>)),
      totalRecords,
    }
  } catch (error: unknown) {
    console.error("getPublicDepartmentList error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch departments",
    }
  }
}

/**
 * Get one department for public API by id.
 */
export async function getPublicDepartmentById(id: string): Promise<GetPublicDepartmentByIdResult> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      code: "invalid_request",
      message: "Department id is required",
    }
  }

  try {
    const result = await getDepartmentById(trimmed)

    if (!result.success || !result.data) {
      const message = result.error?.message ?? "Department not found"
      const notFound = message.toLowerCase().includes("not found")
      return {
        success: false,
        code: notFound ? "not_found" : "server_error",
        message,
      }
    }

    return {
      success: true,
      data: mapPublicDepartment(result.data as Record<string, unknown>),
    }
  } catch (error: unknown) {
    console.error("getPublicDepartmentById error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch department",
    }
  }
}

/**
 * Create department via public API (institution required, unique name per institution).
 */
export async function createPublicDepartment(payload: {
  name?: string
  description?: string | null
  institution?: unknown
  status?: number
}): Promise<{
  success: boolean
  data?: PublicDepartmentDto
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const institution = parseInstitution(payload.institution)
  if (institution === null) {
    return {
      success: false,
      error: {
        message: "Validation failed",
        issues: { institution: ["Institution is required and must be between 0 and 3"] },
      },
    }
  }

  const name = payload.name?.trim() ?? ""
  if (!name) {
    return {
      success: false,
      error: {
        message: "Validation failed",
        issues: { name: ["This field is mandatory"] },
      },
    }
  }

  const status = typeof payload.status === "number" ? payload.status : 1
  if (status !== 0 && status !== 1) {
    return {
      success: false,
      error: {
        message: "Validation failed",
        issues: { status: ["Status must be Unpublish (0) or Publish (1)"] },
      },
    }
  }

  const isDuplicate = await findDuplicateNamePerInstitution(name, institution)
  if (isDuplicate) {
    return {
      success: false,
      error: {
        message: "Duplicate record detected",
        issues: { name: ["Department name already exists for this institution"] },
      },
    }
  }

  const departmentPayload: Department = {
    name,
    description: payload.description ?? null,
    institution,
    status,
  }

  const result = await saveDepartment(departmentPayload)

  if (!result.success) {
    return {
      success: false,
      error: {
        message: result.error?.message ?? "Failed to create department",
        issues: result.error?.issues as Record<string, string[]> | undefined,
      },
    }
  }

  const createdId = result.data?.id as string | undefined
  if (createdId) {
    const department = await getPublicDepartmentById(createdId)
    if (department.success) {
      return { success: true, data: department.data }
    }
  }

  return {
    success: true,
    data: mapPublicDepartment((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Update department via public API (unique name per institution).
 */
export async function updatePublicDepartment(
  id: string,
  payload: Partial<{
    name: string
    description: string | null
    institution: unknown
    status: number
  }>
): Promise<{
  success: boolean
  data?: PublicDepartmentDto
  notFound?: boolean
  error?: { message?: string; issues?: Record<string, string[]> }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Department id is required" },
    }
  }

  const existing = await getDepartmentById(trimmed)
  if (!existing.success || !existing.data) {
    return {
      success: false,
      notFound: true,
      error: { message: existing.error?.message ?? "Department not found" },
    }
  }

  const current = existing.data as Record<string, unknown>
  const nextName = payload.name !== undefined ? payload.name.trim() : String(current.name ?? "")
  const parsedInstitution =
    payload.institution !== undefined ? parseInstitution(payload.institution) : null
  const nextInstitution =
    parsedInstitution !== null
      ? parsedInstitution
      : typeof current.institution === "number"
        ? current.institution
        : current.institution != null
          ? Number(current.institution)
          : 0

  if (payload.institution !== undefined && parsedInstitution === null) {
    return {
      success: false,
      error: {
        message: "Validation failed",
        issues: { institution: ["Institution must be between 0 and 3"] },
      },
    }
  }

  if (payload.status !== undefined && payload.status !== 0 && payload.status !== 1) {
    return {
      success: false,
      error: {
        message: "Validation failed",
        issues: { status: ["Status must be Unpublish (0) or Publish (1)"] },
      },
    }
  }

  const isDuplicate = await findDuplicateNamePerInstitution(nextName, nextInstitution, trimmed)
  if (isDuplicate) {
    return {
      success: false,
      error: {
        message: "Duplicate record detected",
        issues: { name: ["Department name already exists for this institution"] },
      },
    }
  }

  const departmentPayload: Department = {
    id: trimmed,
    name: nextName,
    description:
      payload.description !== undefined
        ? payload.description
        : (current.description as string | null | undefined) ?? null,
    institution: nextInstitution,
    status:
      payload.status !== undefined
        ? payload.status
        : typeof current.status === "number"
          ? current.status
          : Number(current.status) || 0,
  }

  const result = await updateOneDepartment(trimmed, departmentPayload)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to update department"
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

  const department = await getPublicDepartmentById(trimmed)
  if (department.success) {
    return { success: true, data: department.data }
  }

  return {
    success: true,
    data: mapPublicDepartment((result.data ?? {}) as Record<string, unknown>),
  }
}

/**
 * Delete one department via public API.
 */
export async function deletePublicDepartment(id: string): Promise<{
  success: boolean
  notFound?: boolean
  error?: { message?: string }
}> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      error: { message: "Department id is required" },
    }
  }

  const result = await deleteOneDepartment(trimmed)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete department"
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
 * Bulk delete departments via public API.
 */
export async function bulkDeletePublicDepartments(ids: string[]): Promise<{
  success: boolean
  count?: number
  notFound?: boolean
  error?: { message?: string }
}> {
  const result = await deleteDepartments(ids)

  if (!result.success) {
    const message = result.error?.message ?? "Failed to delete departments"
    const notFound =
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("no department")
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
