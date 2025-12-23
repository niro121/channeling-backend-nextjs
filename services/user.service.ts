"use server"

import {
    GetUsersQuery,
    GetUsersReturn,
    User,
} from "@/types/user"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"

export const getUsers = async ({
    page,
    limit,
    keyword,
    role,
}: GetUsersQuery) => {
    //calculate skip
    const skip = page * limit

    // console.log("keyword", keyword);

    try {
        const records = await prisma.user.findMany({
            skip: skip,
            take: limit,
            where: {
                OR: [
                    {
                        name: {
                            contains: keyword,
                            mode: "insensitive",
                        },
                    },
                    {
                        email: {
                            contains: keyword,
                        },
                    },
                ]
            },
            orderBy: {
                createdAt: "desc",
            },
        })

        const totalRecords = await prisma.user.count({
            where: {
                OR: [
                    {
                        name: {
                            contains: keyword,
                        },
                    },
                    {
                        email: {
                            contains: keyword,
                        },
                    },
                ],
                AND: [
                    {
                        status: 1,
                    }
                ],
            },
        })

        let response: GetUsersReturn = {
            data: records,
            totalRecords: totalRecords,
        }

        return response
    } catch (error) {
        console.log("getAccounts error", error)
        throw new Error("Error getting data")
    }
}

export const deleteUsers = async (ids: string[]) => {
    try {
        await prisma.user.deleteMany({
            where: {
                id: {
                    in: ids,
                },
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteUsers error ==> ", error)
        throw new Error(error.message ?? "Deleting users Error")
    }
}

export const deleteOneUser = async (id: string) => {
    try {
        await prisma.user.delete({
            where: {
                id: id,
            },
        })
        return true
    } catch (error: any) {
        console.log("deleteOneUser error ==> ", error)
        throw new Error(error.message ?? "Delete user Error")
    }
}

export const saveUser = async (user: User) => {
    try {
        const result = await prisma.user.create({
            data: user,
        })

        return result
    } catch (error: any) {
        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                throw new Error(
                    "user might exist from this phone or email address. please verify and try again"
                )
            }
        } else {
            throw new Error(error.message ?? "Save user Error")
        }
    }
}

export const updateOneUser = async (id: string, payload: User) => {
    try {
        await prisma.user.update({
            data: payload,
            where: {
                id: id,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateOneUser error ==> ", error)
        throw new Error(error.message ?? "Update user Error")
    }
}

export const getUserById = async (id: string) => {
    try {
        const result = await prisma.user.findUnique({
            where: { id: id },
        })

        return result
    } catch (error: any) {
        throw new Error(error.message ?? "")
    }
}

export const findUserByEmail = async (email: string) => {
    try {
        const record = await prisma.user.findUnique({
            where: {
                email: email,
            },
        })

        return record
    } catch (error: any) {
        console.log("findUserByEmail error ==> ", error)
        throw new Error(error.message ?? "Not found")
    }
}

export const updateUserByEmail = async (payload: any | null, email: string) => {
    try {
        await prisma.user.update({
            data: payload,
            where: {
                email: email,
            },
        })

        return true
    } catch (error: any) {
        console.log("updateUserByEmail error ==> ", error)
        throw new Error(error.message ?? "Not found")
    }
}

export const deactivateUsers = async (ids: string[]) => {
    try {
        await prisma.user.updateMany({
            where: {
                id: {
                    in: ids,
                },
            },
            data: {
                status: 0,
            },
        })

        return true
    } catch (error: any) {
        console.log("deleteUsers error ==> ", error)
        throw new Error(error.message ?? "Deleting users Error")
    }
}

export const deactivateOneUser = async (id: string) => {
    try {
        await prisma.user.update({
            where: {
                id: id,
            },
            data: {
                status: 0
            }
        })
        return true
    } catch (error: any) {
        console.log("deleteOneUser error ==> ", error)
        throw new Error(error.message ?? "Delete user Error")
    }
}
