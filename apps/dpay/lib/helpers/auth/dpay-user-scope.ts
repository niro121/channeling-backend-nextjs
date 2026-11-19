import { userTypes } from '@archmage/shared';
import { dpayUserGroupAppFilter, isDpayUserGroup } from './dpay-user-group-scope';

/**
 * Users editable from the DPAY UI: staff assigned to a DPAY-scoped user group.
 * (API users are not managed from DPAY.)
 */
export function isDpayManagedUser(user: {
  userType: number;
  userGroup?: { app?: string | null } | null;
}): boolean {
  return user.userType === userTypes.staff && isDpayUserGroup(user.userGroup);
}

/** Users visible in the DPAY users list (admins + staff in DPAY groups). */
export const dpayUserListWhere = {
  OR: [
    { userType: userTypes.admin },
    { userType: userTypes.staff, userGroup: dpayUserGroupAppFilter }
  ]
};
