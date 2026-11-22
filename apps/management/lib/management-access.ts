import 'server-only';
import { cache } from 'react';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';
import { NO_TASK_PERMISSIONS, type TaskPermissions } from '@/lib/tasks/constants';
import { NO_AI_PERMISSIONS, type AiPermissions } from '@/lib/ai/constants';

/**
 * Whether the signed-in user may use this app: admin, or management-app.access in their
 * channeling user group. Decided by channeling (GET /api/management/me) on every page load,
 * so removing the privilege takes effect straight away. Cached per request.
 */
export type ManagementAccess = 'allowed' | 'denied' | 'unavailable';

/** Optional sections, from channeling. Each section's API checks the same privileges again. */
export type ManagementFeatures = {
  roomInventory: { view: boolean; assign: boolean; condition: boolean };
  roomStays: { view: boolean; checkIn: boolean; checkOut: boolean; contacts: boolean; override: boolean };
  /** Task Manager privileges (channeling group `management-tasks`) */
  tasks: TaskPermissions;
  /** AI assistant privileges (channeling group `management-ai`) */
  ai: AiPermissions;
};

export const NO_FEATURES: ManagementFeatures = {
  roomInventory: { view: false, assign: false, condition: false },
  roomStays: { view: false, checkIn: false, checkOut: false, contacts: false, override: false },
  tasks: NO_TASK_PERMISSIONS,
  ai: NO_AI_PERMISSIONS
};

export type ManagementMe = {
  access: ManagementAccess;
  isAdmin: boolean;
  /** Channeling user id (same as the auth user id) */
  userId: string | null;
  features: ManagementFeatures;
  /** Same as features.tasks / features.ai (kept for the Task Manager and Ayu code). */
  tasks: TaskPermissions;
  ai: AiPermissions;
};

export const getManagementMe = cache(async (): Promise<ManagementMe> => {
  const denied = (access: ManagementAccess): ManagementMe => ({
    access,
    isAdmin: false,
    userId: null,
    features: NO_FEATURES,
    tasks: NO_TASK_PERMISSIONS,
    ai: NO_AI_PERMISSIONS
  });
  try {
    const res = await channelingUserFetch('/api/management/me');
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as {
        isAdmin?: boolean;
        userId?: string;
        features?: Partial<Pick<ManagementFeatures, 'roomInventory' | 'roomStays'>>;
        tasks?: Partial<TaskPermissions>;
        ai?: Partial<AiPermissions>;
      } | null;
      // Older channeling (missing fields) → no access to those sections rather than guessing
      const tasks = { ...NO_TASK_PERMISSIONS, ...(data?.tasks ?? {}) };
      const ai = { ...NO_AI_PERMISSIONS, ...(data?.ai ?? {}) };
      return {
        access: 'allowed',
        isAdmin: data?.isAdmin === true,
        userId: data?.userId ?? null,
        features: { ...NO_FEATURES, ...(data?.features ?? {}), tasks, ai },
        tasks,
        ai
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

export async function getManagementFeatures(): Promise<ManagementFeatures> {
  return (await getManagementMe()).features;
}
