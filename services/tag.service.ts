"use server"

import {
    GetTagsQuery,
    GetTagsReturn,
    Tag,
} from "@/types/tag"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"

import { z } from "zod"

// ==== TAG: VALIDATION SCHEMA ==== //
const tagSchema = z.object({
    name: z
        .string()
        .min(1, "This field is mandatory")
        .max(100, "Must be less than 100 characters"),
    type: z
        .number()
        .int()
        .min(1, "Type is required"),
    status: z
        .number()
        .int()
        .refine((val) => val === 0 || val === 1, {
            message: "Status must be Inactive (0) or Active (1)",
        }),
});

const tagUpdateSchema = tagSchema.partial().extend({
    id: z.string().min(1, "Tag ID is required"),
});

type tagInput = z.infer<typeof tagSchema>;

export const getTags = async ({
    page,
    limit,
    keyword,
    type,
}: GetTagsQuery): Promise<{
    success: boolean;
    data?: Tag[];
    totalRecords?: number;
    message?: string;
    error?: {
        message?: string;
    };
}> => {
    try {
        // Ensure limit is at least 1 to avoid returning no results
        const validLimit = limit > 0 ? limit : 10;
        const skip = page * validLimit;

        const whereClause: Prisma.TagWhereInput = {
            ...(keyword && keyword.trim() !== "" ? {
                name: {
                    contains: keyword,
                    mode: Prisma.QueryMode.insensitive,
                }
            } : {}),
            ...(type !== undefined ? { type } : {})
        };

        const records = await prisma.tag.findMany({
            skip: skip,
            take: validLimit,
            where: whereClause,
            orderBy: {
                createdAt: "desc",
            },
        });

        const totalRecords = await prisma.tag.count({
            where: whereClause,
        });

        return {
            success: true,
            data: records,
            totalRecords: totalRecords,
        };
    } catch (error: any) {
        console.error("getTags error:", error);

        return {
            success: false,
            error: {
                message: error.message || "Failed to fetch tags"
            }
        };
    }
};

export const deleteTags = async (
    ids: string[]
): Promise<{
    success: boolean;
    data?: {
        count: number;
    };
    message?: string;
    error?: {
        message?: string;
    };
}> => {
    try {
        if (!ids || ids.length === 0) {
            return {
                success: false,
                error: {
                    message: "No tag IDs provided"
                }
            };
        }

        const result = await prisma.tag.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        });

        if (result.count === 0) {
            return {
                success: false,
                error: {
                    message: "No tags found to delete"
                }
            };
        }

        return {
            success: true,
            data: {
                count: result.count
            },
            message: `${result.count} tag(s) deleted successfully`
        };
    } catch (error: any) {
        console.error("deleteTags error:", error);

        return {
            success: false,
            error: {
                message: error.message || "Failed to delete tags"
            }
        };
    }
};

export const deleteOneTag = async (
    id: string
): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: {
        message?: string;
    };
}> => {
    try {
        if (!id || id.trim() === "") {
            return {
                success: false,
                error: {
                    message: "Tag ID is required"
                }
            };
        }

        const tag = await prisma.tag.delete({
            where: {
                id: id,
            },
        });

        return {
            success: true,
            data: tag,
            message: "Tag deleted successfully"
        };
    } catch (error: any) {
        console.error("deleteOneTag error:", error);

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Tag not found"
                }
            };
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to delete tag"
            }
        };
    }
};

export const saveTag = async (
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
        const parsed = tagSchema.safeParse(payload);

        if (!parsed.success) {
            return {
                success: false,
                error: {
                    message: "Validation failed",
                    issues: parsed.error.flatten().fieldErrors
                }
            };
        }

        const data = parsed.data;

        // Check if tag name already exists for the same type
        const existingTag = await prisma.tag.findFirst({
            where: {
                name: data.name,
                type: data.type
            }
        });

        if (existingTag) {
            return {
                success: false,
                error: {
                    message: "Tag name already exists for this type",
                    issues: { name: ["Tag name must be unique within the same type"] }
                }
            };
        }

        const tag = await prisma.tag.create({
            data: {
                name: data.name,
                type: data.type,
                status: data.status,
                ...(user?.id ? {
                    createdBy: user.id,
                    updatedBy: user.id
                } : {})
            }
        });

        return {
            success: true,
            data: tag,
            message: "Tag created successfully"
        };
    } catch (error: any) {
        console.error("saveTag error:", error);

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Tag name already exists for this type",
                    issues: error.meta?.target
                }
            };
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to create tag"
            }
        };
    }
};

export const updateOneTag = async (
    id: string,
    payload: Partial<Tag>,
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
        const parsed = tagUpdateSchema.safeParse({
            ...payload,
            id
        });

        if (!parsed.success) {
            return {
                success: false,
                error: {
                    message: "Validation failed",
                    issues: parsed.error.flatten().fieldErrors
                }
            };
        }

        const data = parsed.data;

        // Check if tag name is being updated and if it already exists
        if (data.name && data.type) {
            const existingTag = await prisma.tag.findFirst({
                where: {
                    name: data.name,
                    type: data.type,
                    id: { not: id }
                }
            });

            if (existingTag) {
                return {
                    success: false,
                    error: {
                        message: "Tag name already exists for this type",
                        issues: { name: ["Tag name must be unique within the same type"] }
                    }
                };
            }
        }

        const updateData: Prisma.TagUpdateInput = {
            ...(user?.id ? { updatedBy: user.id } : {})
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.status !== undefined) updateData.status = data.status;

        const tag = await prisma.tag.update({
            where: { id },
            data: updateData
        });

        return {
            success: true,
            data: tag,
            message: "Tag updated successfully"
        };
    } catch (error: any) {
        console.error("updateOneTag error:", error);

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Tag not found"
                }
            };
        }

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Duplicate record detected",
                    issues: error.meta?.target
                }
            };
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to update tag"
            }
        };
    }
};

export const getTagById = async (
    id: string
): Promise<{
    success: boolean;
    data?: Tag | null;
    message?: string;
    error?: {
        message?: string;
    };
}> => {
    try {
        if (!id || id.trim() === "") {
            return {
                success: false,
                error: {
                    message: "Tag ID is required"
                }
            };
        }

        const result = await prisma.tag.findUnique({
            where: { id: id },
        });

        return {
            success: true,
            data: result as Tag | null
        };
    } catch (error: any) {
        console.error("getTagById error:", error);

        return {
            success: false,
            error: {
                message: error.message || "Failed to fetch tag"
            }
        };
    }
};

// ==== TAG LIST DOWNLOAD ==== //
export const getAllTagsDownloadService = async ({
    keyword,
    type
}: {
    keyword?: string;
    type?: number;
}) => {
    try {
        const whereClause: Prisma.TagWhereInput = {
            ...(keyword && keyword.trim() !== "" ? {
                name: {
                    contains: keyword,
                    mode: Prisma.QueryMode.insensitive,
                }
            } : {}),
            ...(type !== undefined ? { type } : {})
        };

        const [tags, totalRecords] = await Promise.all([
            prisma.tag.findMany({
                where: whereClause,
                orderBy: {
                    createdAt: "desc",
                },
            }),
            prisma.tag.count({
                where: whereClause,
            })
        ]);

        return {
            tags,
            totalRecords
        };
    } catch (error: any) {
        console.error("getAllTagsDownloadService error:", error);
        throw new Error(error.message ?? "Error getting tags");
    }
};
