"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getStaff,
  getStaffById,
  getStaffOptions,
  createStaff,
  updateStaff,
  deleteStaff,
  deleteStaffs,
} from "@/services/staff.service"
import { GetStaffParams, Staff } from "@/types/staff"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { logActivity } from "@/lib/activity-log"

export async function getStaffOptionsAction(): Promise<{
  isError: boolean
  data: { id: string; name: string; code: string }[] | null
  errors: { message?: string }
}> {
  try {
    await requirePermission("staff", "view")
    const result = await getStaffOptions()
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? "Failed to load staff options" },
      }
    }
    return {
      isError: false,
      data: result.data ?? [],
      errors: {},
    }
  } catch (error: any) {
    console.error("getStaffOptionsAction error", error)
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? "Failed to load staff options" },
    }
  }
}

export async function getStaffAction(params: GetStaffParams) {
  try {
    await requirePermission("staff", "view")
    const result = await getStaff(params)
    if (!result.success) {
      throw new Error(result.error?.message ?? "Error getting data. Please try again later")
    }
    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0,
      },
      errors: {},
    }
  } catch (error: any) {
    console.error("getStaffAction error", error)
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? "Error getting data. Please try again later" },
    }
  }
}

export async function getStaffByIdAction(id: string) {
  try {
    await requirePermission("staff", "view")
    const result = await getStaffById(id)
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? "Staff not found")
    }
    return {
      isError: false,
      data: result.data,
      errors: {},
    }
  } catch (error: any) {
    console.error("getStaffByIdAction error:", error)
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? "Unable to fetch staff." },
    }
  }
}

export async function createStaffAction(data: Staff) {
  await requirePermission("staff", "add")
  try {
    const payload = { ...data }
    delete (payload as any).id
    delete (payload as any).createdAt
    delete (payload as any).updatedAt
    delete (payload as any).createdBy
    delete (payload as any).updatedBy

    const result = await createStaff(payload)
    if (!result.success) {
      return {
        isError: true,
        errors: result.error?.issues ?? { message: result.error?.message ?? "Something went wrong. Please try again later" },
        data: {},
      }
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: "staff.staff.created",
        entityType: "Staff",
        entityId: result.data?.id ?? undefined,
        importance: "high",
      })
    }
    revalidatePath("/staff")
    return {
      isError: false,
      data: { saved: true, id: result.data?.id },
      errors: {},
    }
  } catch (error: any) {
    console.error("createStaffAction error:", error)
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? "Something went wrong. Please try again later" },
    }
  }
}

export async function updateStaffAction(id: string, data: Partial<Staff>) {
  await requirePermission("staff", "edit")
  try {
    const payload = { ...data }
    delete (payload as any).id
    delete (payload as any).createdAt
    delete (payload as any).updatedAt
    delete (payload as any).createdBy
    delete (payload as any).updatedBy

    const result = await updateStaff(id, payload)
    if (!result.success) {
      return {
        isError: true,
        errors: result.error?.issues ?? { message: result.error?.message ?? "Something went wrong. Please try again later" },
        data: {},
      }
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: "staff.staff.updated",
        entityType: "Staff",
        entityId: id,
        importance: "high",
      })
    }
    revalidatePath("/staff")
    return {
      isError: false,
      data: { saved: true },
      errors: {},
    }
  } catch (error: any) {
    console.error("updateStaffAction error:", error)
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? "Something went wrong. Please try again later" },
    }
  }
}

export async function deleteStaffAction(id: string) {
  await requirePermission("staff", "delete")
  try {
    const result = await deleteStaff(id)
    if (!result.success) {
      throw new Error(result.error?.message ?? "Error deleting data. Please try again later")
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: "staff.staff.deleted",
        entityType: "Staff",
        entityId: id,
        importance: "high",
      })
    }
    revalidatePath("/staff")
    return { isError: false, data: null, errors: {} }
  } catch (error: any) {
    console.error("deleteStaffAction error:", error)
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? "Error deleting data. Please try again later" },
    }
  }
}

export async function bulkDeleteStaffAction(ids: string[]) {
  await requirePermission("staff", "delete")
  try {
    const result = await deleteStaffs(ids)
    if (!result.success) {
      throw new Error(result.error?.message ?? "Error deleting records. Please try again later")
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: "staff.staff.bulkDeleted",
        entityType: "Staff",
        importance: "high",
        metadata: { count: ids.length },
      })
    }
    revalidatePath("/staff")
    return true
  } catch (error: any) {
    console.error("bulkDeleteStaffAction error:", error)
    throw new Error(error.message ?? "Error deleting records. Please try again later")
  }
}

// ==== STAFF EXPORT ==== //
export const getStaffExport = async (params: { keyword?: string }) => {
  try {
    const response = await getStaffAction({
      page: "1",
      limit: "10000", // Get all records
      keyword: params.keyword ?? ""
    });

    if (response.isError || !response.data?.data?.length) {
      return {
        success: false,
        message: response.isError 
          ? (response.errors?.message || 'Error getting data')
          : 'No staff found'
      };
    }
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: "staff.exported",
        entityType: "Staff",
        importance: "medium",
        metadata: { count: response.data?.data?.length ?? 0 },
      })
    }
    return {
      success: true,
      data: response.data.data
    };
  } catch (error: any) {
    console.log('getStaffExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};