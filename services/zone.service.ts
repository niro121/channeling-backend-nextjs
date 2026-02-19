"use server"

import {
    GetZonesQuery,
    GetZonesReturn,
    Zone,
} from "@/types/zone"
import prisma from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { z } from "zod"

// ==== ZONE: VALIDATION SCHEMA ==== //
const zoneSchema = z.object({
    name: z
        .string()
        .min(1, "This field is mandatory")
        .max(100, "Must be less than 100 characters"),
    description: z
        .string()
        .max(500, "Must be less than 500 characters")
        .optional()
        .nullable(),
    locationId: z.string().min(1, "This field is mandatory"),
    status: z
        .number()
        .int()
        .refine((val) => val === 0 || val === 1, {
            message: "Status must be Unpublish (0) or Publish (1)",
        }),
});

const zoneUpdateSchema = zoneSchema.partial().extend({
    id: z.string().min(1, "Zone ID is required"),
});

type zoneInput = z.infer<typeof zoneSchema>;

export const getZones = async ({
    page,
    limit,
    keyword,
}: GetZonesQuery): Promise<{
    success: boolean;
    data?: Zone[];
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

        // First, get all valid location IDs to filter zones
        const allLocations = await prisma.location.findMany({
            select: {
                id: true
            }
        });
        const validLocationIds = Array.from(new Set(allLocations.map(loc => loc.id)));

        // If no valid locations exist, return empty result
        if (validLocationIds.length === 0) {
            return {
                success: true,
                data: [],
                totalRecords: 0
            };
        }

        const whereClause: Prisma.ZoneWhereInput = {
            locationId: {
                in: validLocationIds
            },
            ...(keyword && keyword.trim() !== "" ? {
                name: {
                    contains: keyword,
                    mode: Prisma.QueryMode.insensitive,
                }
            } : {})
        };

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
        });

        const totalRecords = await prisma.zone.count({
            where: whereClause,
        });

        return {
            success: true,
            data: records as unknown as Zone[],
            totalRecords: totalRecords,
        };
    } catch (error: any) {
        console.error("getZones error:", error);

        return {
            success: false,
            error: {
                message: error.message || "Failed to fetch zones"
            }
        };
    }
};

export const deleteZones = async (
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
                    message: "No zone IDs provided"
                }
            };
        }

        const result = await prisma.zone.deleteMany({
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
                    message: "No zones found to delete"
                }
            };
        }

        return {
            success: true,
            data: {
                count: result.count
            },
            message: `${result.count} zone(s) deleted successfully`
        };
    } catch (error: any) {
        console.error("deleteZones error:", error);

        return {
            success: false,
            error: {
                message: error.message || "Failed to delete zones"
            }
        };
    }
};

export const deleteOneZone = async (
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
                    message: "Zone ID is required"
                }
            };
        }

        const zone = await prisma.zone.delete({
            where: {
                id: id,
            },
        });

        return {
            success: true,
            data: zone,
            message: "Zone deleted successfully"
        };
    } catch (error: any) {
        console.error("deleteOneZone error:", error);

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Zone not found"
                }
            };
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to delete zone"
            }
        };
    }
};

export const saveZone = async (
    payload: Zone,
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
        const parsed = zoneSchema.safeParse(payload);

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

        // Check if zone name already exists for the same location
        const existingZone = await prisma.zone.findFirst({
            where: {
                name: data.name,
                locationId: data.locationId
            }
        });

        if (existingZone) {
            return {
                success: false,
                error: {
                    message: "Zone name already exists for this location",
                    issues: { name: ["Zone name must be unique within the same location"] }
                }
            };
        }

        const zone = await prisma.zone.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                status: data.status,
                location: {
                    connect: { id: data.locationId }
                },
                ...(user?.id ? {
                    createdBy: user.id,
                    updatedBy: user.id
                } : {})
            }
        });

        return {
            success: true,
            data: zone,
            message: "Zone created successfully"
        };
    } catch (error: any) {
        console.error("saveZone error:", error);

        if (error.code === "P2002") {
            return {
                success: false,
                error: {
                    message: "Zone name already exists for this location",
                    issues: error.meta?.target
                }
            };
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to create zone"
            }
        };
    }
};

export const updateOneZone = async (
    id: string,
    payload: Partial<Zone>,
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
        const parsed = zoneUpdateSchema.safeParse({
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

        // Check if zone name is being updated and if it already exists
        if (data.name && data.locationId) {
            const existingZone = await prisma.zone.findFirst({
                where: {
                    name: data.name,
                    locationId: data.locationId,
                    id: { not: id }
                }
            });

            if (existingZone) {
                return {
                    success: false,
                    error: {
                        message: "Zone name already exists for this location",
                        issues: { name: ["Zone name must be unique within the same location"] }
                    }
                };
            }
        }

        const updateData: Prisma.ZoneUpdateInput = {
            ...(user?.id ? { updatedBy: user.id } : {})
        };

        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) updateData.description = data.description ?? null;
        if (data.status !== undefined) updateData.status = data.status;

        if (data.locationId !== undefined) {
            updateData.location = {
                connect: { id: data.locationId }
            };
        }

        const zone = await prisma.zone.update({
            where: { id },
            data: updateData
        });

        return {
            success: true,
            data: zone,
            message: "Zone updated successfully"
        };
    } catch (error: any) {
        console.error("updateOneZone error:", error);

        if (error.code === "P2025") {
            return {
                success: false,
                error: {
                    message: "Zone not found"
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
                message: error.message || "Failed to update zone"
            }
        };
    }
};

export const getZoneById = async (
    id: string
): Promise<{
    success: boolean;
    data?: Zone | null;
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
                    message: "Zone ID is required"
                }
            };
        }

        // First check if zone exists and has a locationId
        const zone = await prisma.zone.findUnique({
            where: { id: id },
            select: { id: true, locationId: true }
        });

        // If zone doesn't exist or doesn't have a locationId, return null
        if (!zone || !zone.locationId) {
            return {
                success: true,
                data: null
            };
        }

        // Now fetch with location relation
        const result = await prisma.zone.findUnique({
            where: { id: id },
            include: {
                location: true,
            },
        });

        return {
            success: true,
            data: result as unknown as Zone
        };
    } catch (error: any) {
        console.error("getZoneById error:", error);

        return {
            success: false,
            error: {
                message: error.message || "Failed to fetch zone"
            }
        };
    }
};
