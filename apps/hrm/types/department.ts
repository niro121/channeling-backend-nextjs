import { getInstitutionName } from '@/types/institution';
import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export const DEPARTMENT_STATUS = {
  UNPUBLISH: 0,
  PUBLISH: 1
} as const;

export type DepartmentStatus =
  (typeof DEPARTMENT_STATUS)[keyof typeof DEPARTMENT_STATUS];

export const DEPARTMENT_STATUS_OPTIONS = [
  { id: '0', name: 'Unpublish' },
  { id: '1', name: 'Publish' }
] as const;

export type DepartmentAuditUser = {
  name: string;
  role?: string;
};

/** UI record for Designations-style master–detail. */
export type DepartmentUiRecord = {
  id: string;
  name: string;
  description: string;
  /** 0=RH, 1=RHD, 2=RHT, 3=RPS */
  institution: number;
  /** 0 = unpublish, 1 = publish */
  status: DepartmentStatus;
  migrateSourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: DepartmentAuditUser;
  updatedByUser: DepartmentAuditUser;
};

export type DepartmentFormValues = {
  name: string;
  description: string;
  institution: string;
  status: string;
};

export type DepartmentPayload = {
  name: string;
  description?: string;
  institution: number;
  status: number;
};

export type GetDepartmentParams = {
  search?: string;
  status?: string;
  institution?: string;
};

export type DepartmentServiceRecord = {
  id: string;
  name: string;
  description: string;
  institution: number;
  status: number;
  migrateSourceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type DepartmentCrudOptions = {
  syncToChanneling?: boolean;
};

export function emptyDepartmentFormValues(): DepartmentFormValues {
  return {
    name: '',
    description: '',
    institution: '',
    status: String(DEPARTMENT_STATUS.PUBLISH)
  };
}

export function departmentStatusLabel(status: number): string {
  return status === DEPARTMENT_STATUS.PUBLISH ? 'Publish' : 'Unpublish';
}

export function departmentInstitutionLabel(institution: number): string {
  return getInstitutionName(institution);
}
