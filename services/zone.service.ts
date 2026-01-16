"use server"

import {
    GetZonesQuery,
    GetZonesReturn,
    Zone,
} from "@/types/zone"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export const getZones = async ({
    page,
    limit,
    keyword,
}: GetZonesQuery) => {
    // Ensure limit is at least 1 to avoid returning no results
    const validLimit = limit > 0 ? limit : 10
    const skip = page * validLimit

    try {
        // First, get all valid location IDs to filter zones
        const allLocations = await prisma.location.findMany({
            select: {
                id: true
            }
        })
        const validLocationIds = Array.from(new Set(allLocations.map(loc => loc.id)))

        // If no valid locations exist, return empty result
        if (validLocationIds.length === 0) {
            return {
                data: [],
                totalRecords: 0
            }
        }

        const whereClause: any = {
            locationId: {
                in: validLocationIds
            }
        }

        if (keyword && keyword.trim() !== "") {
            whereClause.name = {
                contains: keyword,
                mode: "insensitive" as const,
            }
        }

        // Now query zones with valid locations
        const records = await prisma.zone.findMany({
            skip: skip,
            take: validLimit,
            where: whereClause,
            include: {
                location: {
                    select: {
                        id: true,
                        name: true
                    }
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        const totalRecords = await prisma.zone.count({
            where: whereClause,
        })

        let response: GetZonesReturn = {
            data: records as unknown as Zone[],
            totalRecords: totalRecords,
        }

        return response
    } catch (error) {
        console.log("getZones error", error)
        throw new Error("Error getting data")
    }
}

export const deleteZones = async (ids: string[]) => {
    try {
        await prisma.zone.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteZones error ==> ", error)
        throw new Error(error.message ?? "Deleting zones Error")
    }
}

export const deleteOneZone = async (id: string) => {
    try {
        await prisma.zone.delete({
            where: {
                id: id,
            },
        })
        return true
    } catch (error: any) {
        console.log("deleteOneZone error ==> ", error)
        throw new Error(error.message ?? "Delete zone Error")
    }
}

export const saveZone = async (zone: Zone) => {
    try {
        const result = await prisma.zone.create({
            data: zone as any,
        })

        return result
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new Error(
                    "Zone might exist with this name. please verify and try again"
                )
            }
        } else {
            throw new Error(error.message ?? "Save zone Error")
        }
    }
}

export const updateOneZone = async (id: string, payload: Zone) => {
    try {
        await prisma.zone.update({
            data: payload as any,
            where: {
                id: id,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateOneZone error ==> ", error)
        throw new Error(error.message ?? "Update zone Error")
    }
}

export const getZoneById = async (id: string) => {
    try {
        // First check if zone exists and has a locationId
        const zone = await prisma.zone.findUnique({
            where: { id: id },
            select: { id: true, locationId: true }
        })

        // If zone doesn't exist or doesn't have a locationId, return null
        if (!zone || !zone.locationId) {
            return null
        }

        // Now fetch with location relation
        const result = await prisma.zone.findUnique({
            where: { id: id },
            include: {
                location: true,
            },
        })

        return result as unknown as Zone
    } catch (error: any) {
        throw new Error(error.message ?? "")
    }
}
