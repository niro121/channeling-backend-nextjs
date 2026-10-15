import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export const STAFF_SPECIALITY_CODE_PREFIX = 'SSP';

export const STAFF_SPECIALITY_CATEGORIES = [
  'clinical',
  'nursing',
  'admin'
] as const;
export type StaffSpecialityCategoryId =
  (typeof STAFF_SPECIALITY_CATEGORIES)[number];

export const STAFF_SPECIALITY_CATEGORY_LABELS: Record<
  StaffSpecialityCategoryId,
  string
> = {
  clinical: 'Clinical',
  nursing: 'Nursing',
  admin: 'Admin'
};

export const STAFF_SPECIALITY_STATUS_OPTIONS = [
  { id: '0', name: 'Inactive' },
  { id: '1', name: 'Active' }
] as const;

export type StaffSpecialityAuditUser = {
  name: string;
  role?: string;
};

export type StaffSpecialityUiRecord = {
  id: string;
  code: string;
  name: string;
  categoryId: StaffSpecialityCategoryId | string;
  description: string;
  status: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdByUser: StaffSpecialityAuditUser;
  updatedByUser: StaffSpecialityAuditUser;
  staffCount: number;
};

export type StaffSpecialityFormValues = {
  name: string;
  code: string;
  categoryId: string;
  description: string;
  status: string;
  sortOrder: string;
};

export type StaffSpecialityPayload = {
  name: string;
  categoryId: StaffSpecialityCategoryId | string;
  description?: string;
  status: number;
  sortOrder: number;
};

export type GetStaffSpecialityParams = {
  search?: string;
  activeOnly?: boolean;
  includeIds?: string[];
};

export type StaffSpecialityOption = {
  id: string;
  name: string;
};

export type StaffSpecialityServiceRecord = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description: string;
  status: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
  staffCount: number;
};
