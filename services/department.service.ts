"use server"

import {
    GetDepartmentsQuery,
    GetDepartmentsReturn,
    Department,
} from "@/types/department"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export const getDepartments = async ({
    page,
    limit,
    keyword,
}: GetDepartmentsQuery) => {
    //calculate skip
    // Ensure limit is at least 1 to avoid returning no results
    const validLimit = limit > 0 ? limit : 10
    const skip = page * validLimit

    try {
        const whereClause = keyword && keyword.trim() !== ""
            ?
            {
                name: {
                    contains: keyword,
                    mode: "insensitive" as const,
                },
            }
            : {}

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

        let response: GetDepartmentsReturn = {
            data: records,
            totalRecords: totalRecords,
        }

        return response
    } catch (error) {
        console.log("getDepartments error", error)
        throw new Error("Error getting data")
    }
}

export const deleteDepartments = async (ids: string[]) => {
    try {
        await prisma.department.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteDepartments error ==> ", error)
        throw new Error(error.message ?? "Deleting departments Error")
    }
}

export const deleteOneDepartment = async (id: string) => {
    try {
        await prisma.department.delete({
            where: {
                id: id,
            },
        })
        return true
    } catch (error: any) {
        console.log("deleteOneDepartment error ==> ", error)
        throw new Error(error.message ?? "Delete department Error")
    }
}

export const saveDepartment = async (department: Department) => {
    try {
        const result = await prisma.department.create({
            data: department,
        })

        return result
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new Error(
                    "Department might exist with this name. please verify and try again"
                )
            }
        } else {
            throw new Error(error.message ?? "Save department Error")
        }
    }
}

export const updateOneDepartment = async (id: string, payload: Department) => {
    try {
        await prisma.department.update({
            data: payload,
            where: {
                id: id,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateOneDepartment error ==> ", error)
        throw new Error(error.message ?? "Update department Error")
    }
}

export const getDepartmentById = async (id: string) => {
    try {
        const result = await prisma.department.findUnique({
            where: { id: id },
        })

        return result
    } catch (error: any) {
        throw new Error(error.message ?? "")
    }
}

