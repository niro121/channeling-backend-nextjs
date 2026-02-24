'use server'

import { GetUsersParams, GetUsersQuery, User } from "@/types/user"
import * as argon2 from "argon2";
import { deleteOneUser, deleteUsers, getUsers, saveUser, updateOneUser, getUserById, deactivateUsers, deactivateOneUser, getLocationOptionsService } from "@/services/user.service"
import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/server-permissions"
import { fetchServerSession } from "@/lib/session"

export const getAllUsers = async (filter: GetUsersParams) => {
    // Check view permission
    await requirePermission("users", "view")

    try {
        let newFilter: GetUsersQuery = {
            page: filter.page ? parseInt(filter.page) : 0,
            limit: filter.limit ? parseInt(filter.limit) : (parseInt(process.env.DEFAULT_PER_PAGE ?? "10") || 10),
            keyword: filter.keyword ?? "",
            userType: filter.userType
        }

        const response = await getUsers(newFilter);

        return {
            success: true,
            data: response.data ?? [],
            totalRecords: response.totalRecords ?? 0
        };
    } catch (error: any) {
        console.log('getAllUsers error', error);
        return {
            success: false,
            message: error.message || "Error getting data. please try again later",
            data: [],
            totalRecords: 0
        };
    }
}

export const bulkDeleteUsers = async (ids: string[]) => {
    // Check delete permission
    await requirePermission("users", "delete")

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
    // Check delete permission
    await requirePermission("users", "delete")
    
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
    // Check add permission
    await requirePermission("users", "add")

    try {
        // hash the password
        const hashedPassword: string = await hashData(payload.password)

        const result = await saveUser({
            name: payload.name,
            email: payload.email,
            username: payload.username ?? null,
            phone: payload.phone ?? null,
            twoFactorEnabled: payload.twoFactorEnabled ?? false,
            password: hashedPassword,
            userType: payload.userType,
            status: payload.status,
            userGroupId: payload.userGroupId,
            userLocationId: payload.userLocationId ?? null,
            staffId: payload.staffId ?? null,
            defaultBookingMethod: payload.defaultBookingMethod ?? null,
            checkedDefaultLocation: payload.checkedDefaultLocation ?? false,
            defaultLocation: payload.defaultLocation ?? null,
            bookingLocationIds: payload.bookingLocationIds,
        })

        if (!result.success) {
            return {
                isError: true,
                errors: result.error?.issues || {
                    message: result.error?.message ?? "Something went wrong. please try again later"
                },
                data: {}
            };
        }

        revalidatePath('/users')
        return {
            isError: false,
            errors: {},
            data: {
                saved: true,
                id: result.data?.id
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
    // Check edit permission
    await requirePermission("users", "edit")
    
    try {
        let hashedPassword: string | undefined = undefined;

        if (payload.password && payload.password !== "") {
            hashedPassword = await hashData(payload.password)
        }

        const updatePayload: {
            name?: string;
            email?: string;
            username?: string | null;
            phone?: string | null;
            twoFactorEnabled?: boolean;
            password?: string;
            userType?: number;
            status?: number;
            userGroupId?: string | null;
            checkedDefaultLocation?: boolean;
            defaultLocation?: string | null;
            defaultBookingMethod?: number | null;
            userLocationId?: string | null;
            staffId?: string | null;
            bookingLocationIds?: string[];
        } = {};

        if (payload.name !== undefined) updatePayload.name = payload.name;
        if (payload.email !== undefined) updatePayload.email = payload.email;
        if (payload.username !== undefined) updatePayload.username = payload.username ?? null;
        if (payload.phone !== undefined) updatePayload.phone = payload.phone ?? null;
        if (payload.twoFactorEnabled !== undefined) updatePayload.twoFactorEnabled = payload.twoFactorEnabled;
        if (hashedPassword !== undefined) updatePayload.password = hashedPassword;
        if (payload.userType !== undefined) updatePayload.userType = payload.userType;
        if (payload.status !== undefined) updatePayload.status = payload.status;
        if (payload.userGroupId !== undefined) updatePayload.userGroupId = payload.userGroupId;
        if (payload.checkedDefaultLocation !== undefined) updatePayload.checkedDefaultLocation = payload.checkedDefaultLocation;
        if (payload.defaultLocation !== undefined) updatePayload.defaultLocation = payload.defaultLocation || null;
        if (payload.defaultBookingMethod !== undefined) updatePayload.defaultBookingMethod = payload.defaultBookingMethod ?? null;
        if (payload.userLocationId !== undefined) updatePayload.userLocationId = payload.userLocationId || null;
        if (payload.staffId !== undefined) updatePayload.staffId = payload.staffId ?? null;
        if (payload.bookingLocationIds !== undefined) updatePayload.bookingLocationIds = payload.bookingLocationIds;

        const result = await updateOneUser(id, updatePayload)

        if (!result.success) {
            const issues = result.error?.issues ?? {}
            const message = result.error?.message ?? "Something went wrong. please try again later"
            return {
                isError: true,
                errors: typeof issues === "object" && issues !== null
                    ? { ...issues, message }
                    : { message },
                data: {}
            };
        }

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


export const updateUserPassword = async (id: string, password: string) => {
    try {
        if (!password || password === "") {
            throw new Error("Password is required");
        }

        // Validate password format
        const passwordRegex = /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/;
        if (!passwordRegex.test(password)) {
            throw new Error("Password must only contain a mix of uppercase and lowercase letters, numbers, and special characters");
        }

        if (password.length < 8) {
            throw new Error("Password must be at least 8 characters long");
        }

        // Hash the password
        const hashedPassword: string = await hashData(password)

        // Get current user to preserve other fields
        const currentUser = await getUserById(id);
        if (!currentUser) {
            throw new Error("User not found");
        }

        // Update only the password
        const payload: User = {
            ...currentUser,
            password: hashedPassword,
        } as User;

        delete payload.id;
        delete payload.confirmPassword;

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
        console.log('updateUserPassword error ==>', error);
        return {
            isError: true,
            errors: {
                message: error.message ?? "Something went wrong. please try again later"
            },
            data: {}
        }
    }
}

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

// ==== GET LOCATION OPTIONS ==== //
export const getLocationOptions = async () => {
  try {
    const response = await getLocationOptionsService();

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getLocationOptions error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get locations'
      }
    };
  }
};

// ==== USERS EXPORT ==== //
export const getUsersExport = async (params: { keyword?: string; userType?: string }) => {
  try {
    const response = await getAllUsers({
      page: "0",
      limit: "10000", // Get all records
      keyword: params.keyword ?? "",
      userType: params.userType
    });

    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.success ? 'No users found' : response.message || 'Error getting data'
      };
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.log('getUsersExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};

/** Server action for export: takes keyword, resolves session on server, returns mapped data for ExportWrapper */
export const getUsersExportData = async (keyword?: string) => {
  const session = await fetchServerSession();
  const userListResponse = await getUsersExport({
    keyword: keyword ?? "",
    userType: session?.user?.userType?.toString()
  });

  if (!userListResponse.success || !userListResponse.data?.length) {
    return {
      success: false,
      message: userListResponse.success
        ? 'No users found'
        : userListResponse.message
    };
  }

  const mappedUsers = userListResponse.data.map((u: any) => ({
    name: u.name || '-',
    email: u.email || '-',
    userType: u.userType === 0 ? 'Admin' : u.userType === 1 ? 'Staff' : u.userType === 2 ? 'Agent' : '-',
    userGroup: u.userGroup?.name || '-',
    status: u.status === 1 ? 'Active' : 'Inactive'
  }));

  return {
    success: true,
    data: mappedUsers
  };
};