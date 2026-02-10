'use server'

import { GetDepartmentsParams, GetDepartmentsQuery, Department } from "@/types/department"
import { deleteOneDepartment, deleteDepartments, getDepartments, saveDepartment, updateOneDepartment, getDepartmentById } from "@/services/department.service"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"

export const getAllDepartments = async (filter: GetDepartmentsParams) => {
    // View permission already checked by checkRouteAccess("/departments") on the page; skip duplicate session fetch
    try {
        let newFilter: GetDepartmentsQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
        }

        const response = await getDepartments(newFilter)

        if (!response.success) {
            return {
                success: false,
                message: response.error?.message || 'Failed to fetch departments',
                data: [],
                totalRecords: 0
            }
        }

        return {
            success: true,
            data: response.data?.records ?? [],
            totalRecords: response.data?.totalRecords ?? 0,
            message: response.message
        }
    } catch (error: any) {
        console.error('getAllDepartments action error:', error)

        return {
            success: false,
            message: error.message || 'Error getting departments. Please try again later',
            data: [],
            totalRecords: 0
        }
    }
}

export const bulkDeleteDepartments = async (ids: string[]) => {
    // Check delete permission
    await requirePermission("departments", "delete")
    
    try {
        const result = await deleteDepartments(ids)

        if (!result.success) {
            throw new Error(result.error?.message ?? "Error deleting records. please try again later")
        }

        revalidatePath('/departments')
        return true
    } catch (error: any) {
        console.log('bulkDeleteDepartments error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

export const deleteDepartment = async (id: string) => {
    // Check delete permission
    await requirePermission("departments", "delete")
    
    try {
        const result = await deleteOneDepartment(id)

        if (!result.success) {
            throw new Error(result.error?.message ?? "Error deleting data. please try again later")
        }

        revalidatePath('/departments')
        return true
    } catch (error: any) {
        console.log('deleteDepartment error ==>', error);
        throw new Error(error.message ?? "Error deleting data. please try again later")
    }
}

export const createNewDepartment = async (payload: Department) => {
    // Check add permission
    await requirePermission("departments", "add")
    
    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        // Set default visibility if not provided
        if (payload.visibility === undefined) {
            payload.visibility = 0
        }

        const result = await saveDepartment(payload)

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            }
        }

        revalidatePath('/departments')

        return {
            isError: false,
            errors: {},
            data: {
                saved: true,
                id: result.data?.id
            }
        }
    } catch (error: any) {
        console.log('createNewDepartment error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const updateDepartment = async (id: string, payload: Department) => {
    // Check edit permission
    await requirePermission("departments", "edit")
    
    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        const result = await updateOneDepartment(id, payload)

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            }
        }

        revalidatePath('/departments')
        revalidatePath(`/departments/${id}/edit`)
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }
    } catch (error: any) {
        console.log('updateDepartment error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const fetchDepartmentById = async (id: string) => {
    try {
        if (!id) {
            throw new Error("Department not found");
        }

        const result = await getDepartmentById(id);

        if (!result.success || !result.data) {
            throw new Error(result.error?.message || "Department not found");
        }

        return result.data;
    } catch (error: any) {
        console.error("Error in fetchDepartmentById:", error.message);
        throw new Error(error.message || "Unable to fetch department.");
    }
};

