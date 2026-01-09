'use server'

import { GetRostersParams, GetRostersQuery, Roster } from "@/types/roster"
import { deleteOneRoster, deleteRosters, getRosters, saveRoster, updateOneRoster, getRosterById } from "@/services/roster.service"
import { revalidatePath } from "next/cache"

export const getAllRosters = async (filter: GetRostersParams) => {

    try {

        let newFilter: GetRostersQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
        }

        return await getRosters(newFilter)


    } catch (error: any) {
        console.log('getAllRosters error', error);
        throw new Error(error.message ?? "Error getting data. please try again later")
    }
}

export const bulkDeleteRosters = async (ids: string[]) => {

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

    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        // Set default status if not provided
        if (payload.status === undefined) {
            payload.status = 0
        }

        const result = await saveRoster(payload)

        revalidatePath('/rosters')

        return {
            isError: false,
            errors: {},
            data: {
                saved: true,
                id: result && result.id
            }
        }

    } catch (error: any) {
        console.log('createNewRoster error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const updateRoster = async (id: string, payload: Roster) => {
    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        let result = await updateOneRoster(id, payload)

        revalidatePath('/rosters')
        revalidatePath(`/rosters/${id}/edit`)
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }

    } catch (error: any) {
        console.log('updateRoster error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
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
