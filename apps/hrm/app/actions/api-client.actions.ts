'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  createApiClient,
  deleteApiClient,
  getApiClientById,
  getApiClientUserOptions,
  getApiClients,
  rotateApiClientSecret,
  updateApiClient
} from '@/services/api-client-services/api-client.service';
import type {
  ApiClientCreatePayload,
  ApiClientUpdatePayload,
  GetApiClientsParams
} from '@/types/api-client';

const PATH = '/api-clients';

export async function getApiClientsAction(params: GetApiClientsParams) {
  try {
    await requirePermission('users', 'view');
    const result = await getApiClients({
      page: Number(params.page ?? process.env.DEFAULT_PAGE ?? '0') || 0,
      limit: Number(params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10') || 10,
      keyword: params.keyword ?? ''
    });
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Error getting API clients');
    }
    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0
      },
      errors: {}
    };
  } catch (error: unknown) {
    console.error('getApiClientsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getApiClientByIdAction(id: string) {
  await requirePermission('users', 'view');
  const result = await getApiClientById(id);
  if (!result.success || !result.data) {
    throw new Error(result.error?.message ?? 'API client not found');
  }
  return result.data;
}

export async function getApiClientUserOptionsAction() {
  try {
    await requirePermission('users', 'view');
    const result = await getApiClientUserOptions();
    if (!result.success) {
      return {
        isError: true,
        data: [],
        errors: { message: result.error?.message ?? 'Failed to load users' }
      };
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: unknown) {
    return {
      isError: true,
      data: [],
      errors: {
        message:
          error instanceof Error ? error.message : 'Failed to load users'
      }
    };
  }
}

export async function createApiClientAction(payload: ApiClientCreatePayload) {
  await requirePermission('users', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createApiClient(payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Create failed',
          issues: result.error?.issues
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'api_clients.created',
        entityType: 'ApiClient',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(PATH);
    return {
      isError: false,
      data: result.data,
      errors: {}
    };
  } catch (error: unknown) {
    console.error('createApiClientAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateApiClientAction(
  id: string,
  payload: ApiClientUpdatePayload
) {
  await requirePermission('users', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateApiClient(id, payload, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: {
          message: result.error?.message ?? 'Update failed',
          issues: result.error?.issues
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'api_clients.updated',
        entityType: 'ApiClient',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath(PATH);
    return { isError: false, data: result.data, errors: {} };
  } catch (error: unknown) {
    console.error('updateApiClientAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function rotateApiClientSecretAction(id: string) {
  await requirePermission('users', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await rotateApiClientSecret(id, auditUser);
    if (!result.success) {
      return {
        isError: true,
        data: null,
        errors: { message: result.error?.message ?? 'Rotate failed' }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'api_clients.secret_rotated',
        entityType: 'ApiClient',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(PATH);
    return { isError: false, data: result.data, errors: {} };
  } catch (error: unknown) {
    console.error('rotateApiClientSecretAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function deleteApiClientAction(id: string) {
  await requirePermission('users', 'delete');
  try {
    const auditUser = await getAuditUser();
    const result = await deleteApiClient(id);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Delete failed');
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'api_clients.deleted',
        entityType: 'ApiClient',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(PATH);
    return true;
  } catch (error: unknown) {
    console.error('deleteApiClientAction error', error);
    throw new Error(
      error instanceof Error
        ? error.message
        : 'Error deleting data. Please try again later'
    );
  }
}
