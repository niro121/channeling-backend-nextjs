import { userTypes } from '@archmage/shared';
import { hrmUserGroupAppFilter, isHrmUserGroup } from './hrm-user-group-scope';

/** Staff users assigned to an HRM-scoped user group — editable from HRM UI. */
export function isHrmManagedUser(user: {
  userType: number;
  userGroup?: { app?: string | null } | null;
}): boolean {
  return user.userType === userTypes.staff && isHrmUserGroup(user.userGroup);
}

/** Users visible in the HRM users list (platform admins + HRM group members). */
export const hrmUserListWhere = {
  OR: [{ userType: userTypes.admin }, { userGroup: hrmUserGroupAppFilter }],
};
