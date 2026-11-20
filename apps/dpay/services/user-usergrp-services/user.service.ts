'use server';

import { authPrisma } from '@archmage/db-auth';
import { userTypes } from '@archmage/shared';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { getChannelingPrisma } from '@/lib/channeling-prisma';
import type {
  DpayUser,
  GetUsersQuery,
  GetUsersReturn,
  LocationOption
} from '@/types/user';
import {
  dpayUserListWhere,
  isDpayManagedUser
} from '@/lib/helpers/auth/dpay-user-scope';
import {
  dpayUserGroupAppFilter,
  isDpayUserGroup
} from '@/lib/helpers/auth/dpay-user-group-scope';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REGEX
} from '@/lib/validations/password';
import { toAuditUser, type AuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';

const MOBILE_VALIDATION_MESSAGE = 'Mobile Number Ex: 07x xxxxxxx';

const emptyToNull = (v: string | null | undefined) =>
  v === '' || v == null ? null : v;

const userBaseFields = {
  name: z
    .string()
    .min(1, 'This field is mandatory')
    .max(100, 'Must be less than 100 characters'),
  email: z
    .string()
    .min(1, 'This field is mandatory')
    .email('Invalid email address'),
  username: z
    .string()
    .max(50, 'Must be less than 50 characters')
    .nullable()
    .optional()
    .transform(emptyToNull),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform(emptyToNull)
    .refine(
      (v) => v === null || MOBILE_NUMBER_REGEX.test(v ?? ''),
      MOBILE_VALIDATION_MESSAGE
    ),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
    )
    .regex(
      PASSWORD_REGEX,
      'Password must contain uppercase, lowercase, numbers and special characters'
    ),
  userType: z.literal(userTypes.staff),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Inactive (0) or Active (1)'
    })
    .optional(),
  userGroupId: z.string().nullable().optional().transform(emptyToNull),
  userLocationId: z.string().nullable().optional().transform(emptyToNull),
  twoFactorEnabled: z.boolean().optional()
};

const userSchema = z.object(userBaseFields).superRefine((data, ctx) => {
  if (!data.userGroupId) {
    ctx.addIssue({
      code: 'custom',
      message: 'User group is required',
      path: ['userGroupId']
    });
  }
  if (!data.userLocationId) {
    ctx.addIssue({
      code: 'custom',
      message: 'User location is required',
      path: ['userLocationId']
    });
  }
});

const userUpdateSchema = z
  .object({
    ...userBaseFields,
    id: z.string().min(1, 'User ID is required'),
    password: z.string().optional(),
    userType: z.literal(userTypes.staff).optional()
  })
  .partial()
  .required({ id: true })
  .superRefine((data, ctx) => {
    if (data.password !== undefined && data.password !== '') {
      if (
        data.password.length < MIN_PASSWORD_LENGTH ||
        !PASSWORD_REGEX.test(data.password)
      ) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters',
          path: ['password']
        });
      }
    }

    if (data.userGroupId !== undefined && !data.userGroupId) {
      ctx.addIssue({
        code: 'custom',
        message: 'User group is required',
        path: ['userGroupId']
      });
    }
    if (data.userLocationId !== undefined && !data.userLocationId) {
      ctx.addIssue({
        code: 'custom',
        message: 'User location is required',
        path: ['userLocationId']
      });
    }
  });

function keywordWhere(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return {};

  return {
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' as const } },
      { email: { contains: trimmed, mode: 'insensitive' as const } },
      { username: { contains: trimmed, mode: 'insensitive' as const } },
      { locationCode: { contains: trimmed, mode: 'insensitive' as const } }
    ]
  };
}

function buildUsersWhere({
  keyword = '',
  userId,
  status
}: {
  keyword?: string;
  userId?: string;
  status?: string;
}) {
  const statusFilter =
    status === '0' || status === '1' ? { status: parseInt(status, 10) } : {};
  const keywordFilter = keywordWhere(keyword);

  return {
    AND: [
      dpayUserListWhere,
      ...(Object.keys(keywordFilter).length ? [keywordFilter] : []),
      ...(userId ? [{ id: userId }] : []),
      ...(Object.keys(statusFilter).length ? [statusFilter] : [])
    ]
  };
}

async function assertDpayUserGroupId(userGroupId: string | null | undefined) {
  if (!userGroupId) {
    throw new Error('User group is required');
  }

  const group = await authPrisma.userGroup.findUnique({
    where: { id: userGroupId }
  });

  if (!group || !isDpayUserGroup(group)) {
    throw new Error('Invalid DPAY user group');
  }

  return group;
}

/** Look up the Channeling location and return the values stored on the auth user. */
async function resolveLocation(userLocationId: string) {
  const location = await getChannelingPrisma().location.findUnique({
    where: { id: userLocationId },
    select: { id: true, name: true, code: true }
  });

  if (!location) {
    throw new Error('Selected location was not found');
  }
  const code = location.code?.trim();
  if (!code) {
    throw new Error('Selected location does not have a location code');
  }

  return { userLocationId: location.id, locationCode: code };
}

async function getManagedUserOrThrow(id: string) {
  const user = await authPrisma.user.findUnique({
    where: { id },
    include: {
      userGroup: { select: { id: true, name: true, app: true } }
    }
  });

  if (!user || !isDpayManagedUser(user)) {
    throw new Error('User not found');
  }

  return user;
}

async function attachLocations(users: DpayUser[]): Promise<DpayUser[]> {
  const locationIds = [
    ...new Set(
      users
        .map((user) => user.userLocationId)
        .filter((id): id is string => Boolean(id))
    )
  ];

  if (!locationIds.length) return users;

  try {
    const locations = await getChannelingPrisma().location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, name: true, code: true }
    });
    const byId = new Map(locations.map((location) => [location.id, location]));

    return users.map((user) => {
      if (!user.userLocationId) return user;
      const location = byId.get(user.userLocationId);
      return location ? { ...user, userLocation: location } : user;
    });
  } catch (error) {
    console.error('attachLocations error', error);
    return users;
  }
}

export async function getLocationOptionsService(): Promise<{
  data: LocationOption[];
  totalRecords: number;
}> {
  try {
    const records = await getChannelingPrisma().location.findMany({
      where: { status: 1 },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' }
    });

    return { data: records, totalRecords: records.length };
  } catch (error: unknown) {
    console.error('getLocationOptionsService error', error);
    const message =
      error instanceof Error ? error.message : 'Error getting location options';
    throw new Error(message);
  }
}

export async function getUsers({
  page,
  limit,
  keyword,
  userId,
  status
}: GetUsersQuery): Promise<GetUsersReturn> {
  const validLimit = limit > 0 ? limit : 10;
  const skip = page * validLimit;

  try {
    const where = buildUsersWhere({ keyword, userId, status });

    const records = await authPrisma.user.findMany({
      skip,
      take: validLimit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userGroup: { select: { id: true, name: true, app: true } }
      }
    });

    const totalRecords = await authPrisma.user.count({ where });
    const recordsWithUsers = await resolveAuthUsers(records);
    const data = await attachLocations(recordsWithUsers as DpayUser[]);

    return { data, totalRecords };
  } catch (error) {
    console.error('getUsers error', error);
    throw new Error('Error getting data');
  }
}

export async function getAllUsersOptionsService(options?: {
  activeOnly?: boolean;
}) {
  try {
    const activeOnly = options?.activeOnly !== false;
    const records = await authPrisma.user.findMany({
      where: {
        ...dpayUserListWhere,
        ...(activeOnly ? { status: 1 } : {})
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    return {
      data: records.map((user) => ({
        id: user.id,
        name: user.name || user.email
      })),
      totalRecords: records.length
    };
  } catch (error: unknown) {
    console.error('getAllUsersOptionsService error', error);
    const message =
      error instanceof Error ? error.message : 'Error getting user options';
    throw new Error(message);
  }
}

export async function deleteUsers(ids: string[]) {
  for (const id of ids) {
    await getManagedUserOrThrow(id);
  }

  try {
    await authPrisma.user.deleteMany({
      where: {
        id: { in: ids },
        userType: userTypes.staff,
        userGroup: dpayUserGroupAppFilter
      }
    });
    return true;
  } catch (error: unknown) {
    console.error('deleteUsers error', error);
    const message =
      error instanceof Error ? error.message : 'Deleting users Error';
    throw new Error(message);
  }
}

export async function deleteOneUser(id: string) {
  await getManagedUserOrThrow(id);

  try {
    await authPrisma.user.delete({ where: { id } });
    return true;
  } catch (error: unknown) {
    console.error('deleteOneUser error', error);
    const message =
      error instanceof Error ? error.message : 'Delete user Error';
    throw new Error(message);
  }
}

type ServiceResult = {
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string; issues?: unknown };
};

export async function saveUser(
  payload: {
    name: string;
    email: string;
    username?: string | null;
    phone?: string | null;
    twoFactorEnabled?: boolean;
    password: string;
    userType: number;
    status?: number;
    userGroupId?: string | null;
    userLocationId?: string | null;
  },
  user?: AuditUser
): Promise<ServiceResult> {
  try {
    if (payload.userType !== userTypes.staff) {
      return {
        success: false,
        error: { message: 'User type must be Staff' }
      };
    }

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

    await assertDpayUserGroupId(data.userGroupId);
    const location = await resolveLocation(data.userLocationId!);

    const auditUser = toAuditUser(user);

    const result = await authPrisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username ?? null,
        phone: data.phone ?? null,
        twoFactorEnabled: data.twoFactorEnabled ?? false,
        password: data.password,
        userType: data.userType,
        status: data.status ?? 1,
        userGroupId: data.userGroupId,
        userLocationId: location.userLocationId,
        locationCode: location.locationCode,
        mustChangePassword: true,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id
        })
      }
    });

    return {
      success: true,
      data: { id: result.id },
      message: 'User created successfully'
    };
  } catch (error: unknown) {
    console.error('saveUser error', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: {
            message:
              'A user may already exist with this email address. Please verify and try again',
            issues: error.meta?.target
          }
        };
      }
    }

    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to create user'
      }
    };
  }
}

export async function updateOneUser(
  id: string,
  payload: {
    name?: string;
    email?: string;
    username?: string | null;
    phone?: string | null;
    twoFactorEnabled?: boolean;
    password?: string;
    userType?: number;
    status?: number;
    userGroupId?: string | null;
    userLocationId?: string | null;
  },
  user?: AuditUser
): Promise<ServiceResult> {
  try {
    const existing = await getManagedUserOrThrow(id);

    if (payload.userType !== undefined && payload.userType !== userTypes.staff) {
      return {
        success: false,
        error: { message: 'User type must be Staff' }
      };
    }

    const parsed = userUpdateSchema.safeParse({
      ...payload,
      id,
      userType: userTypes.staff
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
    const auditUser = toAuditUser(user);

    const groupId =
      data.userGroupId !== undefined ? data.userGroupId : existing.userGroupId;
    await assertDpayUserGroupId(groupId);

    const locationId =
      data.userLocationId !== undefined
        ? data.userLocationId
        : existing.userLocationId;
    if (!locationId) {
      return {
        success: false,
        error: { message: 'User location is required' }
      };
    }
    const location = await resolveLocation(locationId);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username ?? null;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;
    if (data.password !== undefined && data.password !== '') {
      updateData.password = data.password;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = data.twoFactorEnabled;
    }
    if (data.userGroupId !== undefined) updateData.userGroupId = data.userGroupId;
    updateData.userLocationId = location.userLocationId;
    updateData.locationCode = location.locationCode;

    updateData.updatedAt = new Date();
    if (auditUser?.id) updateData.updatedBy = auditUser.id;

    const result = await authPrisma.user.update({
      where: { id },
      data: updateData
    });

    return {
      success: true,
      data: { id: result.id },
      message: 'User updated successfully'
    };
  } catch (error: unknown) {
    console.error('updateOneUser error', error);

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
          error: { message: 'Record not found' }
        };
      }
    }

    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to update user'
      }
    };
  }
}

export async function getUserById(id: string): Promise<DpayUser | null> {
  try {
    const user = await authPrisma.user.findUnique({
      where: { id },
      include: {
        userGroup: { select: { id: true, name: true, app: true } }
      }
    });

    if (!user) return null;

    const isAdmin = user.userType === userTypes.admin;
    const isManaged = isDpayManagedUser(user);
    if (!isAdmin && !isManaged) return null;

    const [withLocation] = await attachLocations([user as DpayUser]);
    return withLocation ?? null;
  } catch (error: unknown) {
    console.error('getUserById error', error);
    const message =
      error instanceof Error ? error.message : 'Error fetching user';
    throw new Error(message);
  }
}

export async function updateUserPassword(
  id: string,
  password: string
): Promise<{
  success: boolean;
  error?: { message?: string; issues?: unknown };
}> {
  if (
    !password ||
    password.length < MIN_PASSWORD_LENGTH ||
    !PASSWORD_REGEX.test(password)
  ) {
    return {
      success: false,
      error: {
        message:
          'Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters'
      }
    };
  }

  await getManagedUserOrThrow(id);

  try {
    await authPrisma.user.update({
      where: { id },
      data: {
        password,
        updatedAt: new Date()
      }
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('updateUserPassword error', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to update password'
      }
    };
  }
}

export async function getUsersForExport({
  keyword = '',
  userId,
  status
}: {
  keyword?: string;
  userId?: string;
  status?: string;
}): Promise<GetUsersReturn> {
  try {
    const where = buildUsersWhere({ keyword, userId, status });

    const records = await authPrisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userGroup: { select: { id: true, name: true, app: true } }
      }
    });

    const recordsWithUsers = await resolveAuthUsers(records);
    const data = await attachLocations(recordsWithUsers as DpayUser[]);

    return { data, totalRecords: data.length };
  } catch (error) {
    console.error('getUsersForExport error', error);
    throw new Error('Error getting data');
  }
}
