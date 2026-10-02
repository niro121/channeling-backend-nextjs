'use server';

import { revalidatePath } from 'next/cache';
import argon2 from 'argon2';
import { authPrisma } from '@archmage/db-auth';
import { fetchServerSession } from '@/lib/session';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  deleteOneUser,
  deleteUsers,
  getUserById,
  getUsers,
  saveUser,
  updateOneUser,
  updateUserPassword,
} from '@/services/user-usergrp-services/user.service';
import {
  GetUsersParams,
  GetUsersQuery,
  HrmUser,
} from '@/types/user';

export async function changeOwnPassword(currentPassword: string, newPassword: string) {
  try {
    const session = await fetchServerSession();
    if (!session?.user?.id) {
      return { isError: true, errors: { message: 'You must be signed in to change your password.' }, data: {} };
    }

    if (!currentPassword || !newPassword) {
      return { isError: true, errors: { message: 'Current password and new password are required.' }, data: {} };
    }

    const passwordRegex = /^(?=.*[^\w\s])(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S+$/;
    if (!passwordRegex.test(newPassword)) {
      return {
        isError: true,
        errors: {
          message: 'New password must contain uppercase, lowercase, numbers and special characters.',
        },
        data: {},
      };
    }
    if (newPassword.length < 8) {
      return { isError: true, errors: { message: 'New password must be at least 8 characters long.' }, data: {} };
    }

    const user = await authPrisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      return { isError: true, errors: { message: 'User not found.' }, data: {} };
    }

    const valid = await argon2.verify(user.password, currentPassword);
    if (!valid) {
      return { isError: true, errors: { message: 'Current password is incorrect.' }, data: {} };
    }

    const hashedPassword = await argon2.hash(newPassword);
    await authPrisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return { isError: false, errors: {}, data: { saved: true } };
  } catch (error: unknown) {
    return {
      isError: true,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later.',
      },
      data: {},
    };
  }
}

async function hashPassword(password: string) {
  return argon2.hash(password);
}

function stripUserPayload(payload: HrmUser) {
  delete payload.id;
  delete payload.createdAt;
  delete payload.updatedAt;
  delete payload.userGroup;
  delete payload.staff;
  delete payload.confirmPassword;
}

export async function getAllUsers(filter: GetUsersParams) {
  await requirePermission('users', 'view');

  try {
    const newFilter: GetUsersQuery = {
      page: filter.page ? parseInt(filter.page, 10) : 0,
      limit: filter.limit
        ? parseInt(filter.limit, 10)
        : parseInt(process.env.DEFAULT_PAGE_SIZE ?? '10', 10) || 10,
      keyword: filter.keyword ?? '',
    };

    return await getUsers(newFilter);
  } catch (error: unknown) {
    console.error('getAllUsers error', error);
    const message =
      error instanceof Error ? error.message : 'Error getting data. Please try again later';
    throw new Error(message);
  }
}

export async function bulkDeleteUsers(ids: string[]) {
  await requirePermission('users', 'delete');

  try {
    await deleteUsers(ids);
    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'users.users.bulkDeleted',
        entityType: 'User',
        importance: 'high',
        metadata: { count: ids.length },
      });
    }
    revalidatePath('/users');
    return true;
  } catch (error: unknown) {
    console.error('bulkDeleteUsers error', error);
    const message =
      error instanceof Error ? error.message : 'Error deleting records. Please try again later';
    throw new Error(message);
  }
}

export async function deleteUser(id: string) {
  await requirePermission('users', 'delete');

  try {
    await deleteOneUser(id);
    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'users.user.deleted',
        entityType: 'User',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/users');
    return true;
  } catch (error: unknown) {
    console.error('deleteUser error', error);
    const message =
      error instanceof Error ? error.message : 'Error deleting data. Please try again later';
    throw new Error(message);
  }
}

export async function createNewUser(payload: HrmUser) {
  await requirePermission('users', 'add');

  try {
    stripUserPayload(payload);
    const hashedPassword = await hashPassword(payload.password);

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
      staffId: payload.staffId ?? '',
    });

    if (!result.success) {
      return {
        isError: true,
        errors: result.error?.issues || {
          message: result.error?.message ?? 'Something went wrong. Please try again later',
        },
        data: {},
      };
    }

    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'users.user.created',
        entityType: 'User',
        entityId: result.data?.id,
        importance: 'high',
      });
    }

    revalidatePath('/users');
    return {
      isError: false,
      errors: {},
      data: result.data,
    };
  } catch (error: unknown) {
    console.error('createNewUser error', error);
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

export async function updateUser(id: string, payload: HrmUser) {
  await requirePermission('users', 'edit');

  try {
    stripUserPayload(payload);

    const result = await updateOneUser(id, {
      name: payload.name,
      email: payload.email,
      username: payload.username ?? null,
      phone: payload.phone ?? null,
      twoFactorEnabled: payload.twoFactorEnabled,
      status: payload.status,
      userGroupId: payload.userGroupId,
      staffId: payload.staffId ?? '',
    });

    if (!result.success) {
      const issues = result.error?.issues ?? {};
      const message =
        result.error?.message ?? 'Something went wrong. Please try again later';
      return {
        isError: true,
        errors:
          typeof issues === 'object' && issues !== null
            ? { ...(issues as object), message }
            : { message },
        data: {},
      };
    }

    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'users.user.updated',
        entityType: 'User',
        entityId: id,
        importance: 'high',
      });
    }

    revalidatePath('/users');
    return {
      isError: false,
      errors: {},
      data: { saved: true },
    };
  } catch (error: unknown) {
    console.error('updateUser error', error);
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

export async function updateUserPasswordAction(id: string, password: string) {
  await requirePermission('users', 'edit');

  try {
    const hashedPassword = await hashPassword(password);
    const result = await updateUserPassword(id, hashedPassword);

    if (!result.success) {
      return {
        isError: true,
        errors: {
          message: result.error?.message ?? 'Failed to update password',
        },
        data: {},
      };
    }

    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'users.user.passwordUpdated',
        entityType: 'User',
        entityId: id,
        importance: 'high',
      });
    }

    revalidatePath('/users');
    return {
      isError: false,
      errors: {},
      data: { saved: true },
    };
  } catch (error: unknown) {
    console.error('updateUserPasswordAction error', error);
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

export async function fetchUserById(id: string) {
  await requirePermission('users', 'view');

  if (!id) {
    throw new Error('User not found');
  }

  const user = await getUserById(id);
  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

export async function getUsersExport(params: { keyword?: string }) {
  await requirePermission('users', 'view');

  try {
    const response = await getAllUsers({
      page: '0',
      limit: '1000000',
      keyword: params.keyword ?? '',
    });

    if (!response.data?.length) {
      return {
        success: false,
        message: 'No users found',
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
    console.error('getUsersExport error', error);
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
