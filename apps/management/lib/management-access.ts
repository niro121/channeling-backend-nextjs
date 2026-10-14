import 'server-only';
import { cache } from 'react';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';
import { NO_TASK_PERMISSIONS, type TaskPermissions } from '@/lib/tasks/constants';

/**
 * Whether the signed-in user may use this app: admin, or management-app.access in their
 * channeling user group. Decided by channeling (GET /api/management/me) on every page load,
 * so removing the privilege takes effect straight away. Cached per request.
 */
export type ManagementAccess = 'allowed' | 'denied' | 'unavailable';

export type ManagementMe = {
  access: ManagementAccess;
  isAdmin: boolean;
  /** Channeling user id (same as the auth user id) */
  userId: string | null;
  /** Task Manager privileges (channeling group `management-tasks`) */
  tasks: TaskPermissions;
};

export const getManagementMe = cache(async (): Promise<ManagementMe> => {
  const denied = (access: ManagementAccess): ManagementMe => ({ access, isAdmin: false, userId: null, tasks: NO_TASK_PERMISSIONS });
  try {
    const res = await channelingUserFetch('/api/management/me');
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as {
        isAdmin?: boolean;
        userId?: string;
        tasks?: Partial<TaskPermissions>;
      } | null;
      return {
        access: 'allowed',
        isAdmin: data?.isAdmin === true,
        userId: data?.userId ?? null,
        // Older channeling (no tasks field) → no task access rather than guessing
        tasks: { ...NO_TASK_PERMISSIONS, ...(data?.tasks ?? {}) }
      };
    }
    // 401: no matching active channeling user; 403: no management-app.access
    if (res.status === 401 || res.status === 403) return denied('denied');
    return denied('unavailable');
  } catch (error) {
    if (error instanceof ChannelingUserApiError && error.status === 401) return denied('denied');
    console.error('[management access]', error);
    return denied('unavailable');
  }
});

export async function getManagementAccess(): Promise<ManagementAccess> {
  return (await getManagementMe()).access;
}
