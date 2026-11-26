import { AUTH_APPS } from '@archmage/shared';

export const DPAY_USER_GROUP_APP = AUTH_APPS.dpay;

export function isDpayUserGroup(group: { app?: string | null } | null | undefined): boolean {
  return group?.app === DPAY_USER_GROUP_APP;
}

/** Prisma where clause: only DPAY-scoped user groups. */
export const dpayUserGroupAppFilter = {
  app: DPAY_USER_GROUP_APP,
} as const;
