'use server'

import { GetTagsParams, GetTagsQuery, Tag } from "@/types/tag"
import { deleteOneTag, deleteTags, getTags, saveTag, updateOneTag, getTagById } from "@/services/tag.service"
import { revalidatePath } from "next/cache"

export const getAllTags = async (filter: GetTagsParams) => {

    try {

        let newFilter: GetTagsQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
            type: filter.type ? parseInt(filter.type) : undefined,
        }

        return await getTags(newFilter)


    } catch (error: any) {
        console.log('getAllTags error', error);
        throw new Error(error.message ?? "Error getting data. please try again later")
    }
}

export const bulkDeleteTags = async (ids: string[]) => {

    try {

        await deleteTags(ids)
        revalidatePath('/tags')
        return true

    } catch (error: any) {
        console.log('bulkDeleteTags error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

export const deleteTag = async (id: string) => {
    try {
        const response = await deleteOneTag(id)
        revalidatePath('/tags')
        return true

    } catch (error: any) {
        console.log('deleteTag error ==>', error);
        throw new Error(error.message ?? "Error deleting data. please try again later")
    }
}

export const createNewTag = async (payload: Tag) => {

    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt
        
        // Set default status if not provided (Active)
        if (payload.status === undefined || payload.status === null) {
            payload.status = 1
        }

        const result = await saveTag(payload)

        revalidatePath('/tags')

        return {
            isError: false,
            errors: {},
            data: {
                saved: true,
                id: result && result.id
            }
        }

    } catch (error: any) {
        console.log('createNewTag error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const updateTag = async (id: string, payload: Tag) => {
    try {
        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt

        let result = await updateOneTag(id, payload)

        revalidatePath('/tags')
        revalidatePath(`/tags/${id}/edit`)
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }

    } catch (error: any) {
        console.log('updateTag error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const fetchTagById = async (id: string) => {
    try {
        if (!id) {
            throw new Error("Tag not found");
        }

        const tag = await getTagById(id);
        if (!tag) {
            throw new Error("Tag not found");
        }
        return tag;
    } catch (error: any) {
        console.error("Error in fetchTagById:", error.message);
        throw new Error(error.message || "Unable to fetch tag.");
    }
};
