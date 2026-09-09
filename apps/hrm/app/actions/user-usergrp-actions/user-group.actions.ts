'use server';

import { revalidatePath } from 'next/cache';
import { fetchServerSession } from '@/lib/session';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  GetUserGroupsParams,
  GetUserGroupsQuery,
  UserGroup,
} from '@/types/user-group';
import {
  deleteOneUserGroup,
  deleteUserGroups,
  getAllUserGroupsOptionsService,
  getUserGroupById,
  getUserGroups,
  saveUserGroup,
  updateOneUserGroup,
} from '@/services/user-usergrp-services/user-group.service';

function stripUserGroupPayload(payload: UserGroup) {
  delete payload.id;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.app;
  delete payload.createdUser;
  delete payload.updatedUser;
}

export async function getAllUserGroups(filter: GetUserGroupsParams) {
  await requirePermission('users', 'view');

  try {
    const newFilter: GetUserGroupsQuery = {
      page: filter.page ? parseInt(filter.page, 10) : 0,
      limit: filter.limit
        ? parseInt(filter.limit, 10)
        : parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100,
      keyword: filter.keyword ?? '',
    };

    return await getUserGroups(newFilter);
  } catch (error: unknown) {
    console.error('getAllUserGroups error', error);
    const message =
      error instanceof Error ? error.message : 'Error getting data. Please try again later';
    throw new Error(message);
  }
}

export async function bulkDeleteUserGroups(ids: string[]) {
  await requirePermission('users', 'delete');

  try {
    await deleteUserGroups(ids);
    revalidatePath('/user-groups');
    return true;
  } catch (error: unknown) {
    console.error('bulkDeleteUserGroups error', error);
    const message =
      error instanceof Error ? error.message : 'Error deleting records. Please try again later';
    throw new Error(message);
  }
}

export async function deleteUserGroup(id: string) {
  await requirePermission('users', 'delete');

  try {
    await deleteOneUserGroup(id);
    revalidatePath('/user-groups');
    return true;
  } catch (error: unknown) {
    console.error('deleteUserGroup error', error);
    const message =
      error instanceof Error ? error.message : 'Error deleting data. Please try again later';
    throw new Error(message);
  }
}

export async function createNewUserGroup(payload: UserGroup) {
  await requirePermission('users', 'add');

  try {
    stripUserGroupPayload(payload);

    const result = await saveUserGroup(payload);
    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'user-groups.userGroup.created',
        entityType: 'UserGroup',
        entityId: result.id,
        importance: 'high',
      });
    }

    revalidatePath('/user-groups');
    return {
      isError: false,
      errors: {},
      data: result,
    };
  } catch (error: unknown) {
    console.error('createNewUserGroup error', error);
    return {
      isError: true,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later',
      },
      data: {},
    };
  }
}

export async function updateUserGroup(id: string, payload: UserGroup) {
  await requirePermission('users', 'edit');

  try {
    stripUserGroupPayload(payload);

    await updateOneUserGroup(id, payload);
    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'user-groups.userGroup.updated',
        entityType: 'UserGroup',
        entityId: id,
        importance: 'high',
      });
    }

    revalidatePath('/user-groups');
    return {
      isError: false,
      errors: {},
      data: { saved: true },
    };
  } catch (error: unknown) {
    console.error('updateUserGroup error', error);
    return {
      isError: true,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later',
      },
      data: {},
    };
  }
}

export async function fetchUserGroupById(id: string) {
  await requirePermission('users', 'view');

  if (!id) {
    throw new Error('User group not found');
  }

  const userGroup = await getUserGroupById(id);
  if (!userGroup) {
    throw new Error('User group not found');
  }

  return userGroup;
}

export async function getAllUserGroupsOptions() {
  await requirePermission('users', 'view');

  try {
    return await getAllUserGroupsOptionsService();
  } catch (error: unknown) {
    console.error('getAllUserGroupsOptions error', error);
    const message =
      error instanceof Error
        ? error.message
        : 'Error getting user group options. Please try again later';
    throw new Error(message);
  }
}

export async function getUserGroupsExport(params: { keyword?: string }) {
  await requirePermission('users', 'view');

  try {
    const response = await getAllUserGroups({
      page: '0',
      limit: '1000000',
      keyword: params.keyword ?? '',
    });

    if (!response.data?.length) {
      return {
        success: false,
        message: 'No user groups found',
        data: [],
        totalRecords: 0,
      };
    }

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getUserGroupsExport error', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Error getting data. Please try again later',
      data: [],
      totalRecords: 0,
    };
  }
}
