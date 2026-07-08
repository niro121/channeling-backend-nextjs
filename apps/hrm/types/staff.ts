import type { GetStaffParams, Staff, GENDER_OPTIONS } from '@archmage/shared';
import type { TITLE_OPTIONS } from '@archmage/shared';
import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export type { GetStaffParams, Staff };

export type { GENDER_OPTIONS };

export type { TITLE_OPTIONS };

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
