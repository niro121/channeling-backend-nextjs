'use server'

import { GetRostersParams, GetRostersQuery, Roster } from "@/types/roster"
import { deleteOneRoster, deleteRosters, getRosters, saveRoster, updateOneRoster, getRosterById } from "@/services/roster.service"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"

export const getAllRosters = async (filter: GetRostersParams) => {
    // Check view permission
    await requirePermission("rosters", "view")
    
    try {
        let newFilter: GetRostersQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
        }

        const response = await getRosters(newFilter);

        return {
            success: true,
            data: response.data ?? [],
            totalRecords: response.totalRecords ?? 0
        };
    } catch (error: any) {
        console.log('getAllRosters error', error);
        return {
            success: false,
            message: error.message || "Error getting data. please try again later",
            data: [],
            totalRecords: 0
        };
    }
}

export const bulkDeleteRosters = async (ids: string[]) => {
    // Check delete permission
    await requirePermission("rosters", "delete")

    try {

        await deleteRosters(ids)
        revalidatePath('/rosters')
        return true

    } catch (error: any) {
        console.log('bulkDeleteRosters error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

export const deleteRoster = async (id: string) => {
    // Check delete permission
    await requirePermission("rosters", "delete")
    
    try {
        const response = await deleteOneRoster(id)
        revalidatePath('/rosters')
        return true

    } catch (error: any) {
        console.log('deleteRoster error ==>', error);
        throw new Error(error.message ?? "Error deleting data. please try again later")
    }
}

export const createNewRoster = async (payload: Roster) => {
    // Check add permission
    await requirePermission("rosters", "add")
    
    try {
        // Clean up payload
        const cleanPayload = { ...payload };
        delete cleanPayload.id;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        delete cleanPayload.department;

        // Set default status if not provided
        if (cleanPayload.status === undefined) {
            cleanPayload.status = 0;
        }

        const result = await saveRoster(cleanPayload);

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            };
        }

        revalidatePath('/rosters');

        return {
            isError: false,
            errors: {},
            data: {
                saved: true,
                id: result.data?.id
            }
        };
    } catch (error: any) {
        console.log('createNewRoster error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        };
    }
}

export const updateRoster = async (id: string, payload: Roster) => {
    // Check edit permission
    await requirePermission("rosters", "edit")
    
    try {
        // Clean up payload
        const cleanPayload = { ...payload };
        delete cleanPayload.id;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        delete cleanPayload.department;

        const result = await updateOneRoster(id, cleanPayload);

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            };
        }

        revalidatePath('/rosters');
        revalidatePath(`/rosters/${id}/edit`);

        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        };
    } catch (error: any) {
        console.log('updateRoster error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        };
    }
}

export const fetchRosterById = async (id: string) => {
    try {
        if (!id) {
            throw new Error("Roster not found");
        }

        const roster = await getRosterById(id);
        if (!roster) {
            throw new Error("Roster not found");
        }
        return roster;
    } catch (error: any) {
        console.error("Error in fetchRosterById:", error.message);
        throw new Error(error.message || "Unable to fetch roster.");
    }
};
