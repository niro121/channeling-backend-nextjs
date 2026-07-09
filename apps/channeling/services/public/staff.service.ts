"use server"

import moment from "moment"
import { getStaff, getStaffById } from "@/services/staff.service"

/** Public API staff DTO (no audit fields). */
export type PublicStaffDto = {
  id: string
  code: string
  title: string
  name: string
  nic: string
  /** YYYY-MM-DD when set */
  dateOfBirth: string | null
  gender: string
  contactMobile: string
  address: string
  /** YYYY-MM-DD when set */
  dateJoined: string | null
  /** 0 = Inactive, 1 = Active */
  status: number
}

export type GetPublicStaffListResult =
  | { success: true; data: PublicStaffDto[]; totalRecords: number }
  | {
      success: false
      code: "invalid_request" | "server_error"
      message: string
    }

export type GetPublicStaffByIdResult =
  | { success: true; data: PublicStaffDto }
  | {
      success: false
      code: "invalid_request" | "not_found" | "server_error"
      message: string
    }

function formatDateOnly(val: Date | string | null | undefined): string | null {
  if (val == null) return null
  const m = moment(val)
  return m.isValid() ? m.format("YYYY-MM-DD") : null
}

function mapPublicStaff(record: Record<string, unknown>): PublicStaffDto {
  return {
    id: String(record.id ?? ""),
    code: String(record.code ?? ""),
    title: String(record.title ?? ""),
    name: String(record.name ?? ""),
    nic: String(record.nic ?? ""),
    dateOfBirth: formatDateOnly(record.dateOfBirth as Date | string | null | undefined),
    gender: String(record.gender ?? ""),
    contactMobile: String(record.contactMobile ?? ""),
    address: String(record.address ?? ""),
    dateJoined: formatDateOnly(record.dateJoined as Date | string | null | undefined),
    status: typeof record.status === "number" ? record.status : Number(record.status) || 0,
  }
}

/**
 * List staff for public API (paginated).
 * Reuses getStaff from staff.service and maps to slim public DTOs.
 */
export async function getPublicStaffList(params: {
  page?: string | null
  limit?: string | null
  keyword?: string | null
}): Promise<GetPublicStaffListResult> {
  try {
    const result = await getStaff({
      page: params.page ?? "1",
      limit: params.limit ?? "10",
      keyword: params.keyword ?? "",
    })

    if (!result.success || !result.data) {
      return {
        success: false,
        code: "server_error",
        message: result.error?.message ?? "Failed to fetch staff",
      }
    }

    return {
      success: true,
      data: result.data.records.map((r) => mapPublicStaff(r as Record<string, unknown>)),
      totalRecords: result.data.totalRecords,
    }
  } catch (error: unknown) {
    console.error("getPublicStaffList error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch staff",
    }
  }
}

/**
 * Get one staff record for public API by id.
 * Reuses getStaffById from staff.service and maps to slim public DTO.
 */
export async function getPublicStaffById(id: string): Promise<GetPublicStaffByIdResult> {
  const trimmed = id?.trim()
  if (!trimmed) {
    return {
      success: false,
      code: "invalid_request",
      message: "Staff id is required",
    }
  }

  try {
    const result = await getStaffById(trimmed)

    if (!result.success || !result.data) {
      const message = result.error?.message ?? "Staff not found"
      const notFound = message.toLowerCase().includes("not found")
      return {
        success: false,
        code: notFound ? "not_found" : "server_error",
        message,
      }
    }

    return {
      success: true,
      data: mapPublicStaff(result.data as Record<string, unknown>),
    }
  } catch (error: unknown) {
    console.error("getPublicStaffById error:", error)
    return {
      success: false,
      code: "server_error",
      message: "Failed to fetch staff",
    }
  }
}
