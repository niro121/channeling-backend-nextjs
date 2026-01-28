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

        const response = await getTags(newFilter);

        if (!response.success) {
            return {
                success: false,
                message: response.error?.message || "Failed to fetch tags",
                data: [],
                totalRecords: 0
            };
        }

        return {
            success: true,
            data: response.data ?? [],
            totalRecords: response.totalRecords ?? 0
        };
    } catch (error: any) {
        console.error('getAllTags error:', error);
        return {
            success: false,
            message: error.message || "Error getting data. please try again later",
            data: [],
            totalRecords: 0
        };
    }
}

export const bulkDeleteTags = async (ids: string[]) => {
    try {
        const result = await deleteTags(ids);

        if (!result.success) {
            throw new Error(result.error?.message || "Failed to delete tags");
        }

        revalidatePath('/tags');
        return true;
    } catch (error: any) {
        console.error('bulkDeleteTags error:', error);
        throw error;
    }
}

export const deleteTag = async (id: string) => {
    try {
        const result = await deleteOneTag(id);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: result.message || "Tag deletion failed"
                }
            };
        }

        revalidatePath('/tags');

        return {
            success: true,
            data: result.data,
            message: result.message || "Tag deleted successfully"
        };
    } catch (error: any) {
        console.error('deleteTag error:', error);
        return {
            success: false,
            error: {
                message: error.message || "Failed to delete tag"
            }
        };
    }
}

export const createNewTag = async (
    payload: Tag,
    user?: { id?: string; name?: string }
): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: {
        message?: string;
        issues?: any;
    };
}> => {
    try {
        // Clean up payload
        const cleanPayload = { ...payload };
        delete cleanPayload.id;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        delete cleanPayload.createdBy;
        delete cleanPayload.updatedBy;

        // Set default status if not provided (Active)
        if (cleanPayload.status === undefined || cleanPayload.status === null) {
            cleanPayload.status = 1;
        }

        const result = await saveTag(cleanPayload, user);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: result.message || "Tag creation failed"
                }
            };
        }

        revalidatePath('/tags');

        return {
            success: true,
            data: result.data,
            message: result.message || "Tag created successfully"
        };
    } catch (error: any) {
        console.error('createNewTag action error:', error);

        return {
            success: false,
            error: {
                message: error.message || "Unexpected error occurred"
            }
        };
    }
}

export const updateTag = async (
    id: string,
    payload: Tag,
    user?: { id?: string; name?: string }
): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: {
        message?: string;
        issues?: any;
    };
}> => {
    try {
        // Clean up payload
        const cleanPayload = { ...payload };
        delete cleanPayload.id;
        delete cleanPayload.createdAt;
        delete cleanPayload.updatedAt;
        delete cleanPayload.createdBy;
        delete cleanPayload.updatedBy;

        const result = await updateOneTag(id, cleanPayload, user);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: result.message || "Tag update failed"
                }
            };
        }

        revalidatePath('/tags');
        revalidatePath(`/tags/${id}/edit`);

        return {
            success: true,
            data: result.data,
            message: result.message || "Tag updated successfully"
        };
    } catch (error: any) {
        console.error('updateTag action error:', error);

        return {
            success: false,
            error: {
                message: error.message || "Unexpected error occurred"
            }
        };
    }
}

export const fetchTagById = async (id: string) => {
    try {
        if (!id) {
            return {
                success: false,
                error: {
                    message: "Tag ID is required"
                },
                data: null
            };
        }

        const result = await getTagById(id);

        if (!result.success) {
            return {
                success: false,
                error: result.error || {
                    message: "Failed to fetch tag"
                },
                data: null
            };
        }

        if (!result.data) {
            return {
                success: false,
                error: {
                    message: "Tag not found"
                },
                data: null
            };
        }

        return {
            success: true,
            data: result.data
        };
    } catch (error: any) {
        console.error("Error in fetchTagById:", error);

        return {
            success: false,
            error: {
                message: error.message || "Unable to fetch tag"
            },
            data: null
        };
    }
};
