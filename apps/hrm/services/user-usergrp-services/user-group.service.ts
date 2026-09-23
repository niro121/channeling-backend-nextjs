'use server';

import { authPrisma } from '@archmage/db-auth';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import {
  GetUserGroupsQuery,
  GetUserGroupsReturn,
  UserGroup,
} from '@/types/user-group';
import {
  hrmUserGroupAppFilter,
  isHrmUserGroup,
  HRM_USER_GROUP_APP,
} from '@/lib/helpers/auth/hrm-user-group-scope';

function keywordWhere(keyword: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return {};

  return {
    OR: [
      { name: { contains: trimmed, mode: 'insensitive' as const } },
      { description: { contains: trimmed, mode: 'insensitive' as const } },
    ],
  };
}

function buildUserGroupsWhere({
  keyword = '',
  userGroupId,
  status,
}: {
  keyword?: string;
  userGroupId?: string;
  status?: string;
}) {
  const statusFilter =
    status === '0' || status === '1' ? { status: parseInt(status, 10) } : {};
  const userGroupIdFilter = userGroupId?.trim()
    ? { id: userGroupId.trim() }
    : {};

  return {
    ...hrmUserGroupAppFilter,
    ...keywordWhere(keyword),
    ...userGroupIdFilter,
    ...statusFilter,
  };
}

export async function getUserGroups({
  page,
  limit,
  keyword,
  userGroupId,
  status,
}: GetUserGroupsQuery): Promise<GetUserGroupsReturn> {
  const validLimit = limit > 0 ? limit : 10;
  const skip = page * validLimit;

  try {
    const where = buildUserGroupsWhere({ keyword, userGroupId, status });

    const records = await authPrisma.userGroup.findMany({
      skip,
      take: validLimit,
      where,
      orderBy: { createdAt: 'desc' },
    });

    const totalRecords = await authPrisma.userGroup.count({ where });

    return {
      data: records as UserGroup[],
      totalRecords,
    };
  } catch (error) {
    console.error('getUserGroups error', error);
    throw new Error('Error getting data');
  }
}

export async function deleteUserGroups(ids: string[]) {
  try {
    await authPrisma.userGroup.deleteMany({
      where: {
        id: { in: ids },
        ...hrmUserGroupAppFilter,
      },
    });
    return true;
  } catch (error: unknown) {
    console.error('deleteUserGroups error', error);
    const message = error instanceof Error ? error.message : 'Deleting user groups Error';
    throw new Error(message);
  }
}

export async function deleteOneUserGroup(id: string) {
  const existing = await authPrisma.userGroup.findUnique({ where: { id } });
  if (!existing || !isHrmUserGroup(existing)) {
    throw new Error('User group not found');
  }

  try {
    await authPrisma.userGroup.delete({ where: { id } });
    return true;
  } catch (error: unknown) {
    console.error('deleteOneUserGroup error', error);
    const message = error instanceof Error ? error.message : 'Delete user group Error';
    throw new Error(message);
  }
}

export async function saveUserGroup(userGroup: UserGroup) {
  try {
    const result = await authPrisma.userGroup.create({
      data: {
        name: userGroup.name,
        description: userGroup.description,
        status: userGroup.status,
        app: HRM_USER_GROUP_APP,
        permissions: userGroup.permissions as object,
        twoFactorEnabled: userGroup.twoFactorEnabled ?? false,
        twoFactorMethods: Array.isArray(userGroup.twoFactorMethods)
          ? userGroup.twoFactorMethods
          : [],
      },
    });

    return result;
  } catch (error: unknown) {
    if (error instanceof PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new Error(
        'User group might exist with this name. Please verify and try again'
      );
    }
    const message = error instanceof Error ? error.message : 'Save user group Error';
    throw new Error(message);
  }
}

export async function updateOneUserGroup(id: string, payload: UserGroup) {
  const existing = await authPrisma.userGroup.findUnique({ where: { id } });
  if (!existing || !isHrmUserGroup(existing)) {
    throw new Error('User group not found');
  }

  try {
    await authPrisma.userGroup.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        app: HRM_USER_GROUP_APP,
        permissions: payload.permissions as object,
        twoFactorEnabled: payload.twoFactorEnabled ?? false,
        twoFactorMethods: Array.isArray(payload.twoFactorMethods)
          ? payload.twoFactorMethods
          : [],
        updatedAt: new Date(),
      },
    });

    return true;
  } catch (error: unknown) {
    console.error('updateOneUserGroup error', error);
    const message = error instanceof Error ? error.message : 'Update user group Error';
    throw new Error(message);
  }
}

export async function getUserGroupById(id: string) {
  try {
    const result = await authPrisma.userGroup.findUnique({ where: { id } });
    if (!result || !isHrmUserGroup(result)) return null;
    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching user group';
    throw new Error(message);
  }
}

export async function getAllUserGroupsOptionsService(options?: {
  activeOnly?: boolean;
}) {
  try {
    const activeOnly = options?.activeOnly !== false;
    const records = await authPrisma.userGroup.findMany({
      where: {
        ...(activeOnly ? { status: 1 } : {}),
        ...hrmUserGroupAppFilter,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      data: records,
      totalRecords: records.length,
    };
  } catch (error: unknown) {
    console.error('getAllUserGroupsOptionsService error', error);
    const message =
      error instanceof Error ? error.message : 'Error getting user group options';
    throw new Error(message);
  }
}

export async function getUserGroupsForExport({
  keyword = '',
  userGroupId,
  status,
}: {
  keyword?: string;
  userGroupId?: string;
  status?: string;
}): Promise<GetUserGroupsReturn> {
  try {
    const where = buildUserGroupsWhere({ keyword, userGroupId, status });

    const records = await authPrisma.userGroup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: records as UserGroup[],
      totalRecords: records.length,
    };
  } catch (error) {
    console.error('getUserGroupsForExport error', error);
    throw new Error('Error getting data');
  }
}