import { AUTH_APPS } from '@archmage/shared';

export const HRM_USER_GROUP_APP = AUTH_APPS.hrm;

export function isHrmUserGroup(group: { app?: string | null } | null | undefined): boolean {
  return group?.app === HRM_USER_GROUP_APP;
}

/** Prisma where clause: only HRM-scoped user groups. */
export const hrmUserGroupAppFilter = {
  app: HRM_USER_GROUP_APP,
} as const;
