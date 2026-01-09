'use server'

import { GetZonesParams, GetZonesQuery, Zone } from "@/types/zone"
import { deleteOneZone, deleteZones, getZones, saveZone, updateOneZone, getZoneById } from "@/services/zone.service"
import { revalidatePath } from "next/cache"

export const getAllZones = async (filter: GetZonesParams) => {
    try {
        let newFilter: GetZonesQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
        }

        return await getZones(newFilter)
    } catch (error: any) {
        console.log('getAllZones error', error);
        throw new Error(error.message ?? "Error getting data. please try again later")
    }
}

export const bulkDeleteZones = async (ids: string[]) => {
    try {
        await deleteZones(ids)
        revalidatePath('/zones')
        return true
    } catch (error: any) {
        console.log('bulkDeleteZones error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

export const deleteZone = async (id: string) => {
    try {
        await deleteOneZone(id)
        revalidatePath('/zones')
        return true
    } catch (error: any) {
        console.log('deleteZone error ==>', error);
        throw new Error(error.message ?? "Error deleting data. please try again later")
    }
}

export const createNewZone = async (payload: Zone) => {
    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        // Set default visibility if not provided
        if (payload.visibility === undefined) {
            payload.visibility = 0
        }

        // Sanitize locationId for Prisma (expecting ObjectId or null)
        if (!payload.locationId || payload.locationId.trim() === "") {
            payload.locationId = null
        }

        const result = await saveZone(payload)

        revalidatePath('/zones')

        return {
            isError: false,
            errors: {},
            data: {
                saved: true,
                id: result && result.id
            }
        }
    } catch (error: any) {
        console.log('createNewZone error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const updateZone = async (id: string, payload: Zone) => {
    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        // Sanitize locationId for Prisma (expecting ObjectId or null)
        if (!payload.locationId || payload.locationId.trim() === "") {
            payload.locationId = null
        }

        await updateOneZone(id, payload)

        revalidatePath('/zones')
        revalidatePath(`/zones/${id}/edit`)
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }
    } catch (error: any) {
        console.log('updateZone error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const fetchZoneById = async (id: string) => {
    try {
        if (!id) {
            throw new Error("Zone not found");
        }

        const zone = await getZoneById(id);
        if (!zone) {
            throw new Error("Zone not found");
        }
        return zone;
    } catch (error: any) {
        console.error("Error in fetchZoneById:", error.message);
        throw new Error(error.message || "Unable to fetch zone.");
    }
};
