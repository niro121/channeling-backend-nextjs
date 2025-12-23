'use server'

import { GetUsersParams, GetUsersQuery, User } from "@/types/user"
import { roles } from "@/lib/roles"
import * as argon2 from "argon2";
import { deleteOneUser, deleteUsers, getUsers, saveUser, updateOneUser, getUserById, deactivateUsers, deactivateOneUser } from "@/services/user.service"
import { revalidatePath } from "next/cache"

export const getAllUsers = async (filter: GetUsersParams) => {

    try {

        if (!filter.role || filter.role === '') {
            throw new Error("Role is needed to proceed")
        }

        let newFilter: GetUsersQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : parseInt(process.env.DEFAULT_PER_PAGE ?? "0"),
            keyword: filter.keyword ?? "",
            role: filter.role ?? ""
        }

        return await getUsers(newFilter)


    } catch (error: any) {
        console.log('getAllUsers error', error);
        throw new Error(error.message ?? "Error getting data. please try again later")
    }
}

export const bulkDeleteUsers = async (ids: string[]) => {

    try {

        await deleteUsers(ids)
        revalidatePath('/users')
        return true

    } catch (error: any) {
        console.log('bulkDeleteUsers error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

export const deleteUser = async (id: string) => {
    try {
        const response = await deleteOneUser(id)
        revalidatePath('/users')
        return true

    } catch (error: any) {
        console.log('deleteUser error ==>', error);
        throw new Error(error.message ?? "Error deleting data. please try again later")
    }
}

export const createNewUser = async (payload: User) => {

    try {
        // hash the password
        const hashedPassword: string = await hashData(payload.password)

        delete payload.id
        delete payload.confirmPassword
        delete payload.createdAt

        payload.password = hashedPassword

        const result = await saveUser(payload)

        revalidatePath('/users')
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }


    } catch (error: any) {
        console.log('createNewUser error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const updateUser = async (id: string, payload: User, userPWD: string) => {
    try {

        if (payload.password && payload.password !== "") {
            payload.password = await hashData(payload.password)
        }
        else {
            payload.password = userPWD
        }

        delete payload.id
        delete payload.confirmPassword

        let result = await updateOneUser(id, payload)

        revalidatePath('/users')
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }

    } catch (error: any) {
        console.log('updateUser error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const hashData = async (data: string) => {
    return await argon2.hash(data)
}

export const fetchUserById = async (id: string) => {
    try {
        if (!id) {
            throw new Error("User not found");
        }

        const user = await getUserById(id);
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    } catch (error: any) {
        console.error("Error in fetchUserById:", error.message);
        throw new Error(error.message || "Unable to fetch user.");
    }
};


export const deactivateUser = async (id: string) => {
    try {
        const response = await deactivateOneUser(id)
        revalidatePath('/users')
        return true

    } catch (error: any) {
        console.log('deactivateUser error ==>', error);
        throw new Error(error.message ?? "Error deactivating data. please try again later")
    }
}