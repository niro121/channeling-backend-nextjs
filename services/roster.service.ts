"use server"

import {
    GetRostersQuery,
    GetRostersReturn,
    Roster,
} from "@/types/roster"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export const getRosters = async ({
    page,
    limit,
    keyword,
}: GetRostersQuery) => {
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

        const records = await prisma.roster.findMany({
            skip: skip,
            take: validLimit,
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
        })

        const totalRecords = await prisma.roster.count({
            where: whereClause,
        })

        let response: GetRostersReturn = {
            data: records,
            totalRecords: totalRecords,
        }

        return response
    } catch (error) {
        console.log("getRosters error", error)
        throw new Error("Error getting data")
    }
}

export const deleteRosters = async (ids: string[]) => {
    try {
        await prisma.roster.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteRosters error ==> ", error)
        throw new Error(error.message ?? "Deleting rosters Error")
    }
}

export const deleteOneRoster = async (id: string) => {
    try {
        await prisma.roster.delete({
            where: {
                id: id,
            },
        })
        return true
    } catch (error: any) {
        console.log("deleteOneRoster error ==> ", error)
        throw new Error(error.message ?? "Delete roster Error")
    }
}

export const saveRoster = async (roster: Roster) => {
    try {
        const result = await prisma.roster.create({
            data: roster,
        })

        return result
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            // Check for unique constraint violations if name is unique, though it's not unique in schema
             throw new Error(error.message ?? "Save roster Error")
        } else {
            throw new Error(error.message ?? "Save roster Error")
        }
    }
}

export const updateOneRoster = async (id: string, payload: Roster) => {
    try {
        await prisma.roster.update({
            data: payload,
            where: {
                id: id,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateOneRoster error ==> ", error)
        throw new Error(error.message ?? "Update roster Error")
    }
}

export const getRosterById = async (id: string) => {
    try {
        const result = await prisma.roster.findUnique({
            where: { id: id },
        })

        return result
    } catch (error: any) {
        throw new Error(error.message ?? "")
    }
}
