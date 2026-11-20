import 'server-only';
import { cache } from 'react';
import { channelingUserFetch, ChannelingUserApiError } from '@/lib/channeling-user-api';

/**
 * Whether the signed-in user may use this app: admin, or management-app.access in their
 * channeling user group. Decided by channeling (GET /api/management/me) on every page load,
 * so removing the privilege takes effect straight away. Cached per request.
 */
export type ManagementAccess = 'allowed' | 'denied' | 'unavailable';

/** Optional sections (☰ menu). Channeling's APIs check the same privileges again. */
export type ManagementFeatures = {
  roomInventory: { view: boolean; assign: boolean; condition: boolean };
  roomStays: { view: boolean; checkIn: boolean; checkOut: boolean; contacts: boolean; override: boolean };
};

export const NO_FEATURES: ManagementFeatures = {
  roomInventory: { view: false, assign: false, condition: false },
  roomStays: { view: false, checkIn: false, checkOut: false, contacts: false, override: false },
};

const loadMe = cache(async (): Promise<{ access: ManagementAccess; features: ManagementFeatures }> => {
  try {
    const res = await channelingUserFetch('/api/management/me');
    if (res.ok) {
      const body = (await res.json().catch(() => null)) as { features?: Partial<ManagementFeatures> } | null;
      return {
        access: 'allowed',
        features: { ...NO_FEATURES, ...(body?.features ?? {}) },
      };
    }
    // 401: no matching active channeling user; 403: no management-app.access
    if (res.status === 401 || res.status === 403) return { access: 'denied', features: NO_FEATURES };
    return { access: 'unavailable', features: NO_FEATURES };
  } catch (error) {
    if (error instanceof ChannelingUserApiError && error.status === 401) {
      return { access: 'denied', features: NO_FEATURES };
    }
    console.error('[management access]', error);
    return { access: 'unavailable', features: NO_FEATURES };
  }
});

export async function getManagementAccess(): Promise<ManagementAccess> {
  return (await loadMe()).access;
}

export async function getManagementFeatures(): Promise<ManagementFeatures> {
  return (await loadMe()).features;
}
