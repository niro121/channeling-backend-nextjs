"use server"

import {
    GetDepartmentsQuery,
    GetDepartmentsReturn,
    Department,
} from "@/types/department"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { z } from "zod"

// ==== DEPARTMENT: VALIDATION SCHEMA ==== //
const departmentSchema = z.object({
    name: z
        .string()
        .min(1, "This field is mandatory")
        .max(150, "Must be less than 150 characters"),
    description: z.string().optional().nullable(),
    visibility: z
        .number()
        .int()
        .refine((val) => val === 0 || val === 1, {
            message: "Visibility must be Unpublish (0) or Publish (1)",
        }),
})

const departmentUpdateSchema = departmentSchema.partial().extend({
    id: z.string().min(1, "Department ID is required"),
})

type departmentInput = z.infer<typeof departmentSchema>

export const getDepartments = async ({
    page,
    limit,
    keyword,
}: GetDepartmentsQuery): Promise<{
    success: boolean
    data?: {
        records: any[]
        totalRecords: number
    }
    message?: string
    error?: {
        message?: string
    }
}> => {
    //calculate skip
    // Ensure limit is at least 1 to avoid returning no results
    const validLimit = limit > 0 ? limit : 10
    const skip = page * validLimit

    try {
        const whereClause: Prisma.DepartmentWhereInput | undefined =
            keyword && keyword.trim() !== ""
                ? {
                      name: {
                          contains: keyword,
                          mode: Prisma.QueryMode.insensitive,
                      },
                  }
                : undefined

        const records = await prisma.department.findMany({
            skip: skip,
            take: validLimit,
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
        })

        const totalRecords = await prisma.department.count({
            where: whereClause,
        })

        return {
            success: true,
            data: {
                records,
                totalRecords,
            },
            message: "Departments fetched successfully",
        }
    } catch (error: any) {
        console.log("getDepartments error", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to fetch departments",
            },
        }
    }
}

export const deleteDepartments = async (
    ids: string[]
): Promise<{
    success: boolean
    data?: {
        count: number
    }
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        if (!ids || ids.length === 0) {
            return {
                success: false,
                error: {
                    message: "No department IDs provided",
                },
            }
        }

        const result = await prisma.department.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        if (result.count === 0) {
            return {
                success: false,
                error: {
                    message: "No departments found to delete",
                },
            }
        }

        return {
            success: true,
            data: {
                count: result.count,
            },
            message: `${result.count} department(s) deleted successfully`,
        }
    } catch (error: any) {
        console.log("deleteDepartments error ==> ", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to delete departments",
            },
        }
    }
}

export const deleteOneDepartment = async (
    id: string
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        const department = await prisma.department.delete({
            where: {
                id: id,
            },
        })

        return {
            success: true,
            data: department,
            message: "Department deleted successfully",
        }
    } catch (error: any) {
        console.log("deleteOneDepartment error ==> ", error)

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Department not found",
                },
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to delete department",
            },
        }
    }
}

export const saveDepartment = async (
    payload: Department
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
        issues?: any
    }
}> => {
    try {
        const parsed = departmentSchema.safeParse(payload)

        if (!parsed.success) {
            return {
                success: false,
                error: {
                    message: "Validation failed",
                    issues: parsed.error.flatten().fieldErrors,
                },
            }
        }

        const data = parsed.data

        const department = await prisma.department.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                visibility: data.visibility,
            },
        })

        return {
            success: true,
            data: department,
            message: "Department created successfully",
        }
    } catch (error: any) {
        console.error("saveDepartment error:", error)

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Duplicate record detected",
                    issues: error.meta?.target,
                },
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to create department",
            },
        }
    }
}

export const updateOneDepartment = async (
    id: string,
    payload: Department
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
        issues?: any
    }
}> => {
    try {
        const parsed = departmentUpdateSchema.safeParse({
            ...payload,
            id,
        })

        if (!parsed.success) {
            return {
                success: false,
                error: {
                    message: "Validation failed",
                    issues: parsed.error.flatten().fieldErrors,
                },
            }
        }

        const data = parsed.data

        const department = await prisma.department.update({
            where: {
                id: id,
            },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && {
                    description: data.description ?? null,
                }),
                ...(data.visibility !== undefined && {
                    visibility: data.visibility,
                }),
                updatedAt: new Date(),
            },
        })

        return {
            success: true,
            data: department,
            message: "Department updated successfully",
        }
    } catch (error: any) {
        console.error("updateOneDepartment error:", error)

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Department not found",
                },
            }
        }

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Duplicate record detected",
                    issues: error.meta?.target,
                },
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to update department",
            },
        }
    }
}

export const getDepartmentById = async (
    id: string
): Promise<{
    success: boolean
    data?: any
    message?: string
    error?: {
        message?: string
    }
}> => {
    try {
        if (!id) {
            return {
                success: false,
                error: {
                    message: "Invalid department ID",
                },
            }
        }

        const department = await prisma.department.findUnique({
            where: { id: id },
        })

        if (!department) {
            return {
                success: false,
                error: {
                    message: "Department not found",
                },
            }
        }

        return {
            success: true,
            data: department,
            message: "Department fetched successfully",
        }
    } catch (error: any) {
        console.error("getDepartmentById error:", error)
        return {
            success: false,
            error: {
                message: error.message || "Failed to get department",
            },
        }
    }
}

