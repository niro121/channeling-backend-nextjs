"use server"

import {
    GetUsersQuery,
    GetUsersReturn,
    User,
} from "@/types/user"
import prisma from "@/lib/prisma"
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library"
import { z } from "zod"

// ==== USER: VALIDATION SCHEMA ==== //
const userSchema = z.object({
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  email: z
    .string()
    .min(1, 'This field is mandatory')
    .email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/,
      'Password must only contain a mix of uppercase and lowercase letters, numbers, and special characters'
    ),
  userType: z
    .number()
    .int()
    .refine((val) => val === 1 || val === 2, {
      message: 'User type must be Admin (1) or Staff (2)'
    }),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Inactive (0) or Active (1)'
    })
    .optional(),
  userGroupId: z.string().nullable().optional(),
  checkedDefaultLocation: z.boolean().optional(),
  defaultLocation: z.string().nullable().optional(),
});

const userUpdateSchema = userSchema.partial().extend({
  id: z.string().min(1, 'User ID is required'),
  checkedDefaultLocation: z.boolean().optional(),
  defaultLocation: z.string().nullable().optional(),
  userLocationId: z.string().nullable().optional(),
  bookingLocationIds: z.array(z.string()).optional(),
}).refine(
  (data) => {
    // For updates, password is optional (can be empty to keep existing)
    if (data.password !== undefined && data.password !== '') {
      return data.password.length >= 8 && /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/.test(data.password);
    }
    return true;
  },
  {
    message: 'Password must be at least 8 characters long and contain a mix of uppercase, lowercase, numbers, and special characters',
    path: ['password']
  }
);

type userInput = z.infer<typeof userSchema>;

export const getUsers = async ({
    page,
    limit,
    keyword,
    userType,
}: GetUsersQuery) => {
    //calculate skip
    const validLimit = limit > 0 ? limit : 10
    const skip = page * validLimit

    // console.log("keyword", keyword);

    try {
        const records = await prisma.user.findMany({
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
                        email: {
                            contains: keyword,
                        },
                    },
                ]
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                bookingLocations: { select: { locationId: true } },
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

export const saveUser = async (
  payload: {
    name: string;
    email: string;
    password: string;
    userType: number;
    status?: number;
    userGroupId?: string | null;
  }
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
    const parsed = userSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const result = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        userType: data.userType,
        status: data.status ?? 1,
        userGroupId: data.userGroupId || null,
      }
    });

    return {
      success: true,
      data: result,
      message: 'User created successfully'
    };
  } catch (error: any) {
    console.error('saveUser error:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: {
            message: 'User might exist from this email address. Please verify and try again',
            issues: error.meta?.target
          }
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: {
            message: 'Record not found'
          }
        };
      }
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create user'
      }
    };
  }
};

export const updateOneUser = async (
  id: string,
  payload: {
    name?: string;
    email?: string;
    password?: string;
    userType?: number;
    status?: number;
    userGroupId?: string | null;
    checkedDefaultLocation?: boolean;
    defaultLocation?: string | null;
    userLocationId?: string | null;
    bookingLocationIds?: string[];
  }
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
    const { bookingLocationIds, ...restPayload } = payload;
    const parsed = userUpdateSchema.safeParse({
      ...restPayload,
      id
    });

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors
        }
      };
    }

    const data = parsed.data;

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.password !== undefined && data.password !== '') updateData.password = data.password;
    if (data.userType !== undefined) updateData.userType = data.userType;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.userGroupId !== undefined) updateData.userGroupId = data.userGroupId || null;
    if (data.checkedDefaultLocation !== undefined) updateData.checkedDefaultLocation = data.checkedDefaultLocation;
    if (data.defaultLocation !== undefined) updateData.defaultLocation = data.defaultLocation ?? null;
    if (data.userLocationId !== undefined && data.userLocationId) updateData.userLocationId = data.userLocationId;

    const result = await prisma.user.update({
      data: updateData,
      where: {
        id
      }
    });

    if (bookingLocationIds !== undefined) {
      await prisma.userBookingLocation.deleteMany({ where: { userId: id } });
      if (bookingLocationIds.length > 0) {
        await prisma.userBookingLocation.createMany({
          data: bookingLocationIds.map((locationId) => ({ userId: id, locationId })),
        });
      }
    }

    return {
      success: true,
      data: result,
      message: 'User updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneUser error:', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: {
            message: 'Duplicate record detected',
            issues: error.meta?.target
          }
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: {
            message: 'Record not found'
          }
        };
      }
    }

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update user'
      }
    };
  }
};

export const getUserById = async (id: string) => {
    try {
        const result = await prisma.user.findUnique({
            where: { id: id },
            include: {
                userLocation: { select: { id: true, name: true } },
                bookingLocations: { select: { locationId: true, location: { select: { id: true, name: true } } } },
            },
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

// ==== GET LOCATION OPTIONS ==== //
export const getLocationOptionsService = async () => {
  try {
    const records = await prisma.location.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true
      }
    });

    const totalRecords = await prisma.location.count({
      where: { status: 1 }
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getLocationOptionsService error', error);
    throw error;
  }
};