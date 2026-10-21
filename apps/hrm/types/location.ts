import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** Prefix for `generateRecordCode` → e.g. `LOC-1`, `LOC-2`. */
export const LOCATION_CODE_PREFIX = 'LOC';

export const LOCATION_STATUS = {
  UNPUBLISH: 0,
  PUBLISH: 1
} as const;

export type LocationStatus =
  (typeof LOCATION_STATUS)[keyof typeof LOCATION_STATUS];

export const LOCATION_STATUS_OPTIONS = [
  { id: '0', name: 'Unpublish' },
  { id: '1', name: 'Publish' }
] as const;

export const BRANCH_TYPE = {
  MAIN: 1,
  BRANCH: 2,
  COLLECTION_CENTER: 3
} as const;

export type BranchType = (typeof BRANCH_TYPE)[keyof typeof BRANCH_TYPE];

export const BRANCH_TYPE_OPTIONS = [
  { id: '1', name: 'Main Location' },
  { id: '2', name: 'Branch' },
  { id: '3', name: 'Collection Center' }
] as const;

export type LocationAuditUser = {
  name: string;
  role?: string;
};

/** UI record for Designations-style master–detail. */
export type LocationUiRecord = {
  id: string;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  /** 1 = Main Location, 2 = Branch, 3 = Collection Center */
  branchType: number;
  /** 0 = unpublish, 1 = publish */
  status: LocationStatus;
  order: number;
  color: string | null;
  migrateSourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: LocationAuditUser;
  updatedByUser: LocationAuditUser;
};

export type LocationFormValues = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: string;
  status: string;
  order: string;
  color: string;
};

/** Create/update payload (code is auto-generated on create). */
export type LocationPayload = {
  name: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  branchType: number;
  status: number;
  order: number;
  color?: string | null;
};

export type GetLocationParams = {
  search?: string;
  status?: string;
  branchType?: string;
};

export type LocationServiceRecord = {
  id: string;
  name: string;
  code: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  branchType: number;
  status: number;
  order: number;
  color: string | null;
  migrateSourceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type LocationCrudOptions = {
  syncToChanneling?: boolean;
};

export function emptyLocationFormValues(): LocationFormValues {
  return {
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    branchType: '',
    status: String(LOCATION_STATUS.PUBLISH),
    order: '0',
    color: ''
  };
}

export function locationStatusLabel(status: number): string {
  return status === LOCATION_STATUS.PUBLISH ? 'Publish' : 'Unpublish';
}

export function branchTypeLabel(branchType: number): string {
  const opt = BRANCH_TYPE_OPTIONS.find((o) => o.id === String(branchType));
  return opt?.name ?? '—';
}
