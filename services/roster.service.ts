"use server"

import {
    GetRostersQuery,
    GetRostersReturn,
    Roster,
} from "@/types/roster"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { z } from "zod"

// ==== ROSTER: VALIDATION SCHEMA ==== //
const rosterSchema = z.object({
    name: z
        .string()
        .min(1, "This field is mandatory")
        .max(150, "Must be less than 150 characters"),
    departmentId: z.string().min(1, "This field is mandatory"),
    shiftsPerPersonPerDay: z
        .number()
        .int()
        .min(1, "Must be at least 1"),
    status: z
        .number()
        .int()
        .refine((val) => val === 0 || val === 1, {
            message: "Status must be Unpublish (0) or Publish (1)",
        }),
});

const rosterUpdateSchema = rosterSchema.partial().extend({
    id: z.string().min(1, "Roster ID is required"),
});

type rosterInput = z.infer<typeof rosterSchema>;

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

        // Fetch all departments to map department names
        const departmentIds = Array.from(new Set(records.map(r => r.departmentId).filter(Boolean)))
        const departments = departmentIds.length > 0
            ? await prisma.department.findMany({
                where: {
                    id: { in: departmentIds }
                },
                select: {
                    id: true,
                    name: true
                }
            })
            : []

        // Create a map for quick lookup
        const departmentMap = new Map(departments.map(d => [d.id, d.name]))

        // Map department names to rosters
        const recordsWithDepartment = records.map(roster => ({
            ...roster,
            department: roster.departmentId ? {
                name: departmentMap.get(roster.departmentId) || null
            } : null
        }))

        let response: GetRostersReturn = {
            data: recordsWithDepartment as any,
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

export const saveRoster = async (
    payload: Roster
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
        const parsed = rosterSchema.safeParse(payload);

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

        const roster = await prisma.roster.create({
            data: {
                name: data.name,
                departmentId: data.departmentId,
                shiftsPerPersonPerDay: data.shiftsPerPersonPerDay,
                status: data.status,
            }
        });

        return {
            success: true,
            data: roster,
            message: "Roster created successfully"
        };
    } catch (error: any) {
        console.error("saveRoster error:", error);

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return {
                    success: false,
                    error: {
                        message: "Roster might exist with this name. please verify and try again",
                        issues: error.meta?.target
                    }
                };
            }
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to create roster"
            }
        };
    }
}

export const updateOneRoster = async (
    id: string,
    payload: Partial<Roster>
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
        const parsed = rosterUpdateSchema.safeParse({
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

        const updateData: any = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.departmentId !== undefined) updateData.departmentId = data.departmentId;
        if (data.shiftsPerPersonPerDay !== undefined) updateData.shiftsPerPersonPerDay = data.shiftsPerPersonPerDay;
        if (data.status !== undefined) updateData.status = data.status;

        const roster = await prisma.roster.update({
            where: { id },
            data: updateData
        });

        return {
            success: true,
            data: roster,
            message: "Roster updated successfully"
        };
    } catch (error: any) {
        console.error("updateOneRoster error:", error);

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2025") {
                return {
                    success: false,
                    error: {
                        message: "Roster not found"
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
        }

        return {
            success: false,
            error: {
                message: error.message || "Failed to update roster"
            }
        };
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
