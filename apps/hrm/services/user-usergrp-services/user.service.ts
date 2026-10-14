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

const userSchema = z.object({
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
  userType: z.literal(userTypes.staff),
  status: z
    .number()
    .int()
    .refine((val) => val === 0 || val === 1, {
      message: 'Status must be Inactive (0) or Active (1)',
    })
    .optional(),
  userGroupId: z.string().min(1, 'User group is required'),
  staffId: z.string().min(1, 'Staff member is required'),
  twoFactorEnabled: z.boolean().optional(),
});

const userUpdateSchema = userSchema
  .partial()
  .extend({
    id: z.string().min(1, 'User ID is required'),
    password: z.string().optional(),
    staffId: z.string().min(1, 'Staff member is required'),
  })
  .refine(
    (data) => {
      if (data.password !== undefined && data.password !== '') {
        return (
          data.password.length >= MIN_PASSWORD_LENGTH &&
          PASSWORD_REGEX.test(data.password)
        );
      }
      return true;
    },
    {
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers and special characters',
      path: ['password'],
    }
  );

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
        userType: userTypes.staff,
        userGroup: hrmUserGroupAppFilter,
      },
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
    staffId: string;
  },
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string; issues?: unknown };
}> {
  try {
    const parsed = userSchema.safeParse({
      ...payload,
      userType: userTypes.staff,
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
    await assertHrmUserGroupId(data.userGroupId);
    await assertStaffId(data.staffId);
    const auditUser = toAuditUser(user);

    const result = await authPrisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        username: data.username ?? null,
        phone: data.phone ?? null,
        twoFactorEnabled: data.twoFactorEnabled ?? false,
        password: data.password,
        userType: userTypes.staff,
        status: data.status ?? 1,
        userGroupId: data.userGroupId,
        staffId: data.staffId,
        mustChangePassword: true,
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
    staffId: string;
  },
  user?: AuditUser
): Promise<{
  success: boolean;
  data?: { id: string };
  message?: string;
  error?: { message?: string; issues?: unknown };
}> {
  try {
    await getManagedUserOrThrow(id);

    const parsed = userUpdateSchema.safeParse({
      ...payload,
      id,
      userType: userTypes.staff,
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

    if (data.userGroupId !== undefined) {
      await assertHrmUserGroupId(data.userGroupId);
    }
    await assertStaffId(data.staffId);

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username ?? null;
    if (data.phone !== undefined) updateData.phone = data.phone ?? null;
    if (data.twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = data.twoFactorEnabled;
    }
    if (data.password !== undefined && data.password !== '') {
      updateData.password = data.password;
    }
    if (data.status !== undefined) updateData.status = data.status;
    if (data.userGroupId !== undefined) updateData.userGroupId = data.userGroupId;
    updateData.staffId = data.staffId;
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