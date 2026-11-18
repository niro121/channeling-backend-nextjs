'use server';

import { authPrisma } from '@archmage/db-auth';
import { userTypes } from '@archmage/shared';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import {
  GetUsersQuery,
  GetUsersReturn,
  HrmUser,
} from '@/types/user';
import {
  hrmUserListWhere,
  isHrmManagedUser,
} from '@/lib/helpers/auth/hrm-user-scope';
import {
  hrmUserGroupAppFilter,
  isHrmUserGroup,
} from '@/lib/helpers/auth/hrm-user-group-scope';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REGEX,
} from '@/lib/validations/password';
import { toAuditUser, type AuditUser } from '@/lib/audit-user';
import { resolveAuthUsers } from '@/lib/helpers/resolve-auth-users.helper';

const MOBILE_VALIDATION_MESSAGE = 'Mobile Number Ex: 07x xxxxxxx';

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
    .transform((v) => (v === '' || v == null ? null : v)),
  phone: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v))
    .refine(
      (v) => v === null || MOBILE_NUMBER_REGEX.test(v ?? ''),
      MOBILE_VALIDATION_MESSAGE
    ),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
    .regex(PASSWORD_REGEX, 'Password must contain uppercase, lowercase, numbers and special characters'),
  userType: z.union([
    z.literal(userTypes.staff),
    z.literal(userTypes.apiUser)
  ]),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Inactive (0) or Active (1)',
    })
    .optional(),
  userGroupId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  staffId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v === '' || v == null ? null : v)),
  twoFactorEnabled: z.boolean().optional(),
};

const userSchema = z
  .object(userBaseFields)
  .superRefine((data, ctx) => {
    if (data.userType === userTypes.staff) {
      if (!data.userGroupId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'User group is required',
          path: ['userGroupId']
        });
      }
      if (!data.staffId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Staff member is required',
          path: ['staffId']
        });
      }
    }
  });

const userUpdateSchema = z
  .object({
    ...userBaseFields,
    id: z.string().min(1, 'User ID is required'),
    password: z.string().optional(),
    userType: z
      .union([z.literal(userTypes.staff), z.literal(userTypes.apiUser)])
      .optional()
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
          code: z.ZodIssueCode.custom,
          message:
            'Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters',
          path: ['password']
        });
      }
    }

    const effectiveType = data.userType;
    if (effectiveType === userTypes.staff) {
      if (data.userGroupId !== undefined && !data.userGroupId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'User group is required',
          path: ['userGroupId']
        });
      }
      if (data.staffId !== undefined && !data.staffId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Staff member is required',
          path: ['staffId']
        });
      }
    }
  });

async function keywordWhere(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return {};

  const matchingStaff = await prisma.staff.findMany({
    where: {
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { code: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    select: { id: true },
  });
  const matchingStaffIds = matchingStaff.map((staff) => staff.id);

  return {
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' as const } },
      { email: { contains: trimmed, mode: 'insensitive' as const } },
      { username: { contains: trimmed, mode: 'insensitive' as const } },
      ...(matchingStaffIds.length
        ? [{ staffId: { in: matchingStaffIds } }]
        : []),
    ],
  };
}

async function buildUsersWhere({
  keyword = '',
  userId,
  status,
}: {
  keyword?: string;
  userId?: string;
  status?: string;
}) {
  const statusFilter =
    status === '0' || status === '1' ? { status: parseInt(status, 10) } : {};
  const keywordFilter = await keywordWhere(keyword);

  return {
    AND: [
      hrmUserListWhere,
      ...(Object.keys(keywordFilter).length ? [keywordFilter] : []),
      ...(userId ? [{ id: userId }] : []),
      ...(Object.keys(statusFilter).length ? [statusFilter] : []),
    ],
  };
}

async function assertHrmUserGroupId(userGroupId: string | null | undefined) {
  if (!userGroupId) {
    throw new Error('User group is required');
  }

  const group = await authPrisma.userGroup.findUnique({
    where: { id: userGroupId },
  });

  if (!group || !isHrmUserGroup(group)) {
    throw new Error('Invalid HRM user group');
  }

  return group;
}

async function assertStaffId(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { id: true },
  });

  if (!staff) {
    throw new Error('Selected staff member was not found');
  }
}

async function getManagedUserOrThrow(id: string) {
  const user = await authPrisma.user.findUnique({
    where: { id },
    include: {
      userGroup: { select: { id: true, name: true, app: true } },
    },
  });

  if (!user || !isHrmManagedUser(user)) {
    throw new Error('User not found');
  }

  return user;
}

async function attachStaffNames(users: HrmUser[]): Promise<HrmUser[]> {
  const staffIds = users
    .map((user) => user.staffId)
    .filter((id): id is string => Boolean(id));

  if (!staffIds.length) return users;

  const staffRecords = await prisma.staff.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true, code: true },
  });

  const staffById = new Map(staffRecords.map((staff) => [staff.id, staff]));

  return users.map((user) => {
    if (!user.staffId) return user;
    const staff = staffById.get(user.staffId);
    return staff ? { ...user, staff } : user;
  });
}

export async function getUsers({
  page,
  limit,
  keyword,
  userId,
  status,
}: GetUsersQuery): Promise<GetUsersReturn> {
  const validLimit = limit > 0 ? limit : 10;
  const skip = page * validLimit;

  try {
    const where = await buildUsersWhere({ keyword, userId, status });

    const records = await authPrisma.user.findMany({
      skip,
      take: validLimit,
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userGroup: { select: { id: true, name: true, app: true } },
      },
    });

    const totalRecords = await authPrisma.user.count({ where });
    const recordsWithUsers = await resolveAuthUsers(records);
    const data = (await attachStaffNames(
      recordsWithUsers as HrmUser[]
    )) as HrmUser[];

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
        ...hrmUserListWhere,
        ...(activeOnly ? { status: 1 } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: records.map((user) => ({
        id: user.id,
        name: user.name || user.email,
      })),
      totalRecords: records.length,
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
        OR: [
          { userType: userTypes.staff, userGroup: hrmUserGroupAppFilter },
          { userType: userTypes.apiUser }
        ]
      }
    });
    return true;
  } catch (error: unknown) {
    console.error('deleteUsers error', error);
    const message = error instanceof Error ? error.message : 'Deleting users Error';
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
    const message = error instanceof Error ? error.message : 'Delete user Error';
    throw new Error(message);
  }
}

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
    staffId?: string | null;
  },
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string; issues?: unknown };
}> {
  try {
    if (
      payload.userType !== userTypes.staff &&
      payload.userType !== userTypes.apiUser
    ) {
      return {
        success: false,
        error: { message: 'User type must be Staff or API User' }
      };
    }

    const parsed = userSchema.safeParse(payload);

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;
    const isApiUser = data.userType === userTypes.apiUser;

    if (!isApiUser) {
      await assertHrmUserGroupId(data.userGroupId);
      await assertStaffId(data.staffId!);
    }

    const auditUser = toAuditUser(user);

    const result = await authPrisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username ?? null,
        phone: data.phone ?? null,
        twoFactorEnabled: isApiUser ? false : (data.twoFactorEnabled ?? false),
        password: data.password,
        userType: data.userType,
        status: data.status ?? 1,
        userGroupId: isApiUser ? null : data.userGroupId,
        staffId: isApiUser ? null : data.staffId,
        mustChangePassword: !isApiUser,
        ...(auditUser?.id && {
          createdBy: auditUser.id,
          updatedBy: auditUser.id,
        }),
      },
    });

    return {
      success: true,
      data: { id: result.id },
      message: 'User created successfully',
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
            issues: error.meta?.target,
          },
        };
      }
    }

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to create user',
      },
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
    staffId?: string | null;
  },
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string; issues?: unknown };
}> {
  try {
    const existing = await getManagedUserOrThrow(id);

    if (
      payload.userType !== undefined &&
      payload.userType !== userTypes.staff &&
      payload.userType !== userTypes.apiUser
    ) {
      return {
        success: false,
        error: { message: 'User type must be Staff or API User' }
      };
    }

    const nextType = payload.userType ?? existing.userType;

    const parsed = userUpdateSchema.safeParse({
      ...payload,
      id,
      userType: nextType
    });

    if (!parsed.success) {
      return {
        success: false,
        error: {
          message: 'Validation failed',
          issues: parsed.error.flatten().fieldErrors,
        },
      };
    }

    const data = parsed.data;
    const auditUser = toAuditUser(user);
    const isApiUser = nextType === userTypes.apiUser;

    if (!isApiUser) {
      const groupId =
        data.userGroupId !== undefined
          ? data.userGroupId
          : existing.userGroupId;
      const staffId =
        data.staffId !== undefined ? data.staffId : existing.staffId;
      await assertHrmUserGroupId(groupId);
      if (!staffId) {
        return {
          success: false,
          error: { message: 'Staff member is required' }
        };
      }
      await assertStaffId(staffId);
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username ?? null;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;
    if (data.password !== undefined && data.password !== '') {
      updateData.password = data.password;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (payload.userType !== undefined) updateData.userType = nextType;

    if (isApiUser) {
      updateData.userGroupId = null;
      updateData.staffId = null;
      updateData.twoFactorEnabled = false;
      updateData.mustChangePassword = false;
    } else {
      if (data.twoFactorEnabled !== undefined) {
        updateData.twoFactorEnabled = data.twoFactorEnabled;
      }
      if (data.userGroupId !== undefined) {
        updateData.userGroupId = data.userGroupId;
      }
      if (data.staffId !== undefined) {
        updateData.staffId = data.staffId;
      }
    }

    updateData.updatedAt = new Date();
    if (auditUser?.id) updateData.updatedBy = auditUser.id;

    const result = await authPrisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      success: true,
      data: { id: result.id },
      message: 'User updated successfully',
    };
  } catch (error: unknown) {
    console.error('updateOneUser error', error);

    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return {
          success: false,
          error: {
            message: 'Duplicate record detected',
            issues: error.meta?.target,
          },
        };
      }
      if (error.code === 'P2025') {
        return {
          success: false,
          error: { message: 'Record not found' },
        };
      }
    }

    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update user',
      },
    };
  }
}

export async function getUserById(id: string): Promise<HrmUser | null> {
  try {
    const user = await authPrisma.user.findUnique({
      where: { id },
      include: {
        userGroup: { select: { id: true, name: true, app: true } },
      },
    });

    if (!user) return null;

    const isAdmin = user.userType === userTypes.admin;
    const isManaged = isHrmManagedUser(user);
    if (!isAdmin && !isManaged) return null;

    const [withStaff] = await attachStaffNames([user as HrmUser]);
    return withStaff ?? null;
  } catch (error: unknown) {
    console.error('getUserById error', error);
    const message = error instanceof Error ? error.message : 'Error fetching user';
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
  if (!password || password.length < MIN_PASSWORD_LENGTH || !PASSWORD_REGEX.test(password)) {
    return {
      success: false,
      error: {
        message:
          'Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters',
      },
    };
  }

  await getManagedUserOrThrow(id);

  try {
    await authPrisma.user.update({
      where: { id },
      data: {
        password,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('updateUserPassword error', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to update password',
      },
    };
  }
}

export async function getUsersForExport({
  keyword = '',
  userId,
  status,
}: {
  keyword?: string;
  userId?: string;
  status?: string;
}): Promise<GetUsersReturn> {
  try {
    const where = await buildUsersWhere({ keyword, userId, status });

    const records = await authPrisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        userGroup: { select: { id: true, name: true, app: true } },
      },
    });

    const recordsWithUsers = await resolveAuthUsers(records);
    const data = (await attachStaffNames(
      recordsWithUsers as HrmUser[]
    )) as HrmUser[];

    return { data, totalRecords: data.length };
  } catch (error) {
    console.error('getUsersForExport error', error);
    throw new Error('Error getting data');
  }
}