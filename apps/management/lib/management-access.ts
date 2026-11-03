import 'server-only';
import { cache } from 'react';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';

/**
 * Whether the signed-in user may use this app: admin, or management-app.access in their
 * channeling user group. Decided by channeling (GET /api/management/me) on every page load,
 * so removing the privilege takes effect straight away. Cached per request.
 */
export type ManagementAccess = 'allowed' | 'denied' | 'unavailable';

export const getManagementAccess = cache(async (): Promise<ManagementAccess> => {
  try {
    const res = await channelingUserFetch('/api/management/me');
    if (res.ok) return 'allowed';
    // 401: no matching active channeling user; 403: no management-app.access
    if (res.status === 401 || res.status === 403) return 'denied';
    return 'unavailable';
  } catch (error) {
    if (error instanceof ChannelingUserApiError && error.status === 401) return 'denied';
    console.error('[management access]', error);
    return 'unavailable';
  }
});
