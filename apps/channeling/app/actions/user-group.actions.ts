'use server'

import { fetchServerSession } from "@/lib/session"
import { GetUserGroupsParams, GetUserGroupsQuery, UserGroup } from "@/types/user-group"
import { deleteOneUserGroup, deleteUserGroups, getUserGroups, saveUserGroup, updateOneUserGroup, getUserGroupById, getAllUserGroupsOptionsService } from "@/services/user-group.service"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { logActivityNonBlocking } from "@/lib/activity-log"

export const getAllUserGroups = async (filter: GetUserGroupsParams) => {
    // Check view permission (user groups use "users" resource)
    await requirePermission("users", "view")

    try {

        let newFilter: GetUserGroupsQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
        }

        return await getUserGroups(newFilter)


    } catch (error: any) {
        console.log('getAllUserGroups error', error);
        throw new Error(error.message ?? "Error getting data. please try again later")
    }
}

export const bulkDeleteUserGroups = async (ids: string[]) => {
    // Check delete permission
    await requirePermission("users", "delete")

    try {

        await deleteUserGroups(ids)
        revalidatePath('/user-groups')
        return true

    } catch (error: any) {
        console.log('bulkDeleteUserGroups error ==>', error);
        throw new Error(error.message ?? "Error deleting records. please try again later")
    }
}

export const deleteUserGroup = async (id: string) => {
    // Check delete permission
    await requirePermission("users", "delete")
    
    try {
        const response = await deleteOneUserGroup(id)
        revalidatePath('/user-groups')
        return true

    } catch (error: any) {
        console.log('deleteUserGroup error ==>', error);
        throw new Error(error.message ?? "Error deleting data. please try again later")
    }
}

export const createNewUserGroup = async (payload: UserGroup) => {
    // Check add permission
    await requirePermission("users", "add")

    try {
        const session = await fetchServerSession()
        const user = session?.user?.id
            ? { id: session.user.id, name: session.user.name ?? undefined }
            : undefined

        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt
        delete (payload as any).createdBy
        delete (payload as any).updatedBy
        delete (payload as any).createdUser
        delete (payload as any).updatedUser

        const result = await saveUserGroup(payload, user)
        if (user) {
            const createdId = result?.id ?? (result as { data?: { id?: string } })?.data?.id
            logActivityNonBlocking({
                userId: user.id,
                action: "user-groups.userGroup.created",
                entityType: "UserGroup",
                entityId: typeof createdId === "string" ? createdId : undefined,
                importance: "high",
            })
        }
        revalidatePath('/user-groups')
        return {
            isError: false,
            errors: {},
            data: result
        }


    } catch (error: any) {
        console.log('createNewUserGroup error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const updateUserGroup = async (id: string, payload: UserGroup) => {
    // Check edit permission
    await requirePermission("users", "edit")
    
    try {
        const session = await fetchServerSession()
        const user = session?.user?.id
            ? { id: session.user.id, name: session.user.name ?? undefined }
            : undefined

        delete payload.id
        delete payload.createdAt
        delete payload.updatedAt
        delete (payload as any).createdBy
        delete (payload as any).updatedBy
        delete (payload as any).createdUser
        delete (payload as any).updatedUser

        let result = await updateOneUserGroup(id, payload, user)
        if (user) {
            logActivityNonBlocking({
                userId: user.id,
                action: "user-groups.userGroup.updated",
                entityType: "UserGroup",
                entityId: id,
                importance: "high",
            })
        }
        revalidatePath('/user-groups')
        return {
            isError: false,
            errors: {},
            data: {
                saved: true
            }
        }

    } catch (error: any) {
        console.log('updateUserGroup error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

export const fetchUserGroupById = async (id: string) => {
    try {
        if (!id) {
            throw new Error("User group not found");
        }

        const userGroup = await getUserGroupById(id);
        if (!userGroup) {
            throw new Error("User group not found");
        }
        return userGroup;
    } catch (error: any) {
        console.error("Error in fetchUserGroupById:", error.message);
        throw new Error(error.message || "Unable to fetch user group.");
    }
};

export const getAllUserGroupsOptions = async () => {
    try {
        return await getAllUserGroupsOptionsService();
    } catch (error: any) {
        console.log('getAllUserGroupsOptions error', error);
        throw new Error(error.message ?? "Error getting user group options. please try again later")
    }
};

// ==== USER GROUPS EXPORT ==== //
export const getUserGroupsExport = async (params: { keyword?: string }) => {
  await requirePermission("users", "view");
  try {
    const response = await getAllUserGroups({
      page: "0",
      limit: "1000000", // Get all records
      keyword: params.keyword ?? ""
    });

    if (!response.data?.length) {
      return {
        success: false,
        message: 'No user groups found',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getUserGroupsExport error', error);
    return {
      success: false,
      message: error.message || "Error getting data. please try again later",
      data: [],
      totalRecords: 0
    };
  }
};