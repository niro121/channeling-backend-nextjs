import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export const DESIGNATION_CODE_PREFIX = 'DES';

export const DESIGNATION_CATEGORIES = ['clinical', 'non-clinical'] as const;
export type DesignationCategoryId = (typeof DESIGNATION_CATEGORIES)[number];

export const DESIGNATION_CATEGORY_LABELS: Record<DesignationCategoryId, string> = {
  clinical: 'Clinical',
  'non-clinical': 'Non-Clinical'
};

export type DesignationAuditUser = {
  name: string;
  role?: string;
};

export type DesignationTypeOption = {
  id: DesignationCategoryId | string;
  name: string;
};

export type DesignationUiRecord = {
  id: string;
  code: string;
  name: string;
  categoryId: DesignationCategoryId | string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: DesignationAuditUser;
  updatedByUser: DesignationAuditUser;
  staffCount: number;
};

export type DesignationFormValues = {
  name: string;
  code: string;
  categoryId: string;
  description: string;
};

export type DesignationPayload = {
  name: string;
  categoryId: DesignationCategoryId | string;
  description?: string;
};

export type GetDesignationParams = {
  search?: string;
};

export type DesignationServiceRecord = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
  staffCount: number;
};
