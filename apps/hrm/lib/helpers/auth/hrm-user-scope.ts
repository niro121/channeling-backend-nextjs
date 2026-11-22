import { userTypes } from '@archmage/shared';
import { hrmUserGroupAppFilter, isHrmUserGroup } from './hrm-user-group-scope';

/**
 * Users editable from HRM UI:
 * - Staff assigned to an HRM-scoped user group
 * - API users (public Careers / machine acting identity; no user group)
 */
export function isHrmManagedUser(user: {
  userType: number;
  userGroup?: { app?: string | null } | null;
}): boolean {
  if (user.userType === userTypes.apiUser) return true;
  return user.userType === userTypes.staff && isHrmUserGroup(user.userGroup);
}

/** Users visible in the HRM users list (admins + HRM group staff + API users). */
export const hrmUserListWhere = {
  OR: [
    { userType: userTypes.admin },
    { userType: userTypes.apiUser },
    { userGroup: hrmUserGroupAppFilter }
  ]
};
