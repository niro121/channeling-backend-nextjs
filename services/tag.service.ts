"use server"

import {
    GetTagsQuery,
    GetTagsReturn,
    Tag,
} from "@/types/tag"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export const getTags = async ({
    page,
    limit,
    keyword,
    type,
}: GetTagsQuery) => {
    // Ensure limit is at least 1 to avoid returning no results
    const validLimit = limit > 0 ? limit : 10
    const skip = page * validLimit

    try {
        const whereClause: any = {}

        if (keyword && keyword.trim() !== "") {
            whereClause.name = {
                contains: keyword,
                mode: "insensitive" as const,
            }
        }

        if (type !== undefined) {
             whereClause.type = type
        }

        const records = await prisma.tag.findMany({
            skip: skip,
            take: validLimit,
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
        })

        const totalRecords = await prisma.tag.count({
            where: whereClause,
        })

        let response: GetTagsReturn = {
            data: records,
            totalRecords: totalRecords,
        }

        return response
    } catch (error) {
        console.log("getTags error", error)
        throw new Error("Error getting data")
    }
}

export const deleteTags = async (ids: string[]) => {
    try {
        await prisma.tag.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteTags error ==> ", error)
        throw new Error(error.message ?? "Deleting tags Error")
    }
}

export const deleteOneTag = async (id: string) => {
    try {
        await prisma.tag.delete({
            where: {
                id: id,
            },
        })
        return true
    } catch (error: any) {
        console.log("deleteOneTag error ==> ", error)
        throw new Error(error.message ?? "Delete tag Error")
    }
}

export const saveTag = async (tag: Tag) => {
    try {
        const result = await prisma.tag.create({
            data: tag as any, // casting to any to avoid strict type issues with optional fields mismatch if any
        })

        return result
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new Error(
                    "Tag might exist with this name. please verify and try again"
                )
            }
        } else {
            throw new Error(error.message ?? "Save tag Error")
        }
    }
}

export const updateOneTag = async (id: string, payload: Tag) => {
    try {
        await prisma.tag.update({
            data: payload as any,
            where: {
                id: id,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateOneTag error ==> ", error)
        throw new Error(error.message ?? "Update tag Error")
    }
}

export const getTagById = async (id: string) => {
    try {
        const result = await prisma.tag.findUnique({
            where: { id: id },
        })

        return result
    } catch (error: any) {
        throw new Error(error.message ?? "")
    }
}
