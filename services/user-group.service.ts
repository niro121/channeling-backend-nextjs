"use server"

import {
    GetUserGroupsQuery,
    GetUserGroupsReturn,
    UserGroup,
} from "@/types/user-group"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export const getUserGroups = async ({
    page,
    limit,
    keyword,
}: GetUserGroupsQuery) => {
    //calculate skip
    const validLimit = limit > 0 ? limit : 10
    const skip = page * validLimit

    try {
        const records = await prisma.userGroup.findMany({
            skip: skip,
            take: validLimit,
            where: {
                OR: [
                    {
                        name: {
                            contains: keyword,
                            mode: "insensitive",
                        },
                    },
                    {
                        description: {
                            contains: keyword,
                            mode: "insensitive",
                        },
                    },
                ]
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        const totalRecords = await prisma.userGroup.count({
            where: {
                OR: [
                    {
                        name: {
                            contains: keyword,
                        },
                    },
                    {
                        description: {
                            contains: keyword,
                        },
                    },
                ],
            },
        })

        let response: GetUserGroupsReturn = {
            data: records as UserGroup[],
            totalRecords: totalRecords,
        }

        return response
    } catch (error) {
        console.log("getUserGroups error", error)
        throw new Error("Error getting data")
    }
}

export const deleteUserGroups = async (ids: string[]) => {
    try {
        await prisma.userGroup.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteUserGroups error ==> ", error)
        throw new Error(error.message ?? "Deleting user groups Error")
    }
}

export const deleteOneUserGroup = async (id: string) => {
    try {
        await prisma.userGroup.delete({
            where: {
                id: id,
            },
        })
        return true
    } catch (error: any) {
        console.log("deleteOneUserGroup error ==> ", error)
        throw new Error(error.message ?? "Delete user group Error")
    }
}

export const saveUserGroup = async (userGroup: UserGroup) => {
    try {
        const result = await prisma.userGroup.create({
            data: {
                name: userGroup.name,
                description: userGroup.description,
                status: userGroup.status,
                permissions: userGroup.permissions as any,
                twoFactorEnabled: userGroup.twoFactorEnabled ?? false,
                twoFactorMethods: Array.isArray(userGroup.twoFactorMethods) ? userGroup.twoFactorMethods : [],
            },
        })

        return result
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new Error(
                    "User group might exist with this name. please verify and try again"
                )
            }
        } else {
            throw new Error(error.message ?? "Save user group Error")
        }
    }
}

export const updateOneUserGroup = async (id: string, payload: UserGroup) => {
    try {
        await prisma.userGroup.update({
            data: {
                name: payload.name,
                description: payload.description,
                status: payload.status,
                permissions: payload.permissions as any,
                twoFactorEnabled: payload.twoFactorEnabled ?? false,
                twoFactorMethods: Array.isArray(payload.twoFactorMethods) ? payload.twoFactorMethods : [],
            },
            where: {
                id: id,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateOneUserGroup error ==> ", error)
        throw new Error(error.message ?? "Update user group Error")
    }
}

export const getUserGroupById = async (id: string) => {
    try {
        const result = await prisma.userGroup.findUnique({
            where: { id: id },
        })

        return result
    } catch (error: any) {
        throw new Error(error.message ?? "")
    }
}

// ==== GET ALL USER GROUPS FOR DROPDOWN ==== //
export const getAllUserGroupsOptionsService = async () => {
    try {
        const records = await prisma.userGroup.findMany({
            where: {
                status: 1 // Only active user groups
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        return {
            data: records,
            totalRecords: records.length
        };
    } catch (error: any) {
        console.log('getAllUserGroupsOptionsService error', error);
        throw new Error(error.message ?? 'Error getting user group options');
    }
};
