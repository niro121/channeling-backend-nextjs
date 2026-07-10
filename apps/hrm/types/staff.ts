import type { GetStaffParams, Staff } from '@archmage/shared';
import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';
import { TITLE_LIST, GENDER_OPTIONS, STAFF_STATUS_OPTIONS } from '@archmage/shared';

export type { GetStaffParams, Staff };

export {TITLE_LIST, GENDER_OPTIONS, STAFF_STATUS_OPTIONS}

export type StaffRecord = Staff & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
};

export type StaffWithAuthUsers = StaffRecord & {
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};
