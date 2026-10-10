import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export const STAFF_GRADE_CODE_PREFIX = 'SG';

export const STAFF_GRADE_LEVELS = [
  'grade_i',
  'grade_ii',
  'grade_iii',
  'executive'
] as const;
export type StaffGradeLevelId = (typeof STAFF_GRADE_LEVELS)[number];

export const STAFF_GRADE_LEVEL_LABELS: Record<StaffGradeLevelId, string> = {
  grade_i: 'Grade I',
  grade_ii: 'Grade II',
  grade_iii: 'Grade III',
  executive: 'Executive'
};

export type StaffGradeAuditUser = {
  name: string;
  role?: string;
};

export type StaffGradeTypeOption = {
  id: StaffGradeLevelId | string;
  name: string;
};

export type StaffGradeUiRecord = {
  id: string;
  code: string;
  name: string;
  gradeLevelId: StaffGradeLevelId | string;
  createdAt: string;
  updatedAt: string;
  createdByUser: StaffGradeAuditUser;
  updatedByUser: StaffGradeAuditUser;
};

export type StaffGradeFormValues = {
  name: string;
  code: string;
  gradeLevelId: string;
};

export type StaffGradePayload = {
  name: string;
  gradeLevelId: StaffGradeLevelId | string;
};

export type GetStaffGradeParams = {
  search?: string;
};

export type StaffGradeServiceRecord = {
  id: string;
  code: string;
  name: string;
  gradeLevelId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};
