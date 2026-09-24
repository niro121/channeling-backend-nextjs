import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** Prefix for `generateRecordCode` → e.g. `ZN-1`, `ZN-2`. */
export const ZONE_CODE_PREFIX = 'ZN';

export const ZONE_STATUS = {
  UNPUBLISH: 0,
  PUBLISH: 1
} as const;

export type ZoneStatus = (typeof ZONE_STATUS)[keyof typeof ZONE_STATUS];

export const ZONE_STATUS_OPTIONS = [
  { id: '0', name: 'Unpublish' },
  { id: '1', name: 'Publish' }
] as const;

export type ZoneAuditUser = {
  name: string;
  role?: string;
};

export type ZoneLocationSummary = {
  id: string;
  name: string;
  code: string;
  migrateSourceId: string | null;
};

/** UI record for Designations-style master–detail. */
export type ZoneUiRecord = {
  id: string;
  name: string;
  code: string;
  description: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  /** 0 = unpublish, 1 = publish */
  status: ZoneStatus;
  migrateSourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: ZoneAuditUser;
  updatedByUser: ZoneAuditUser;
};

export type ZoneFormValues = {
  name: string;
  description: string;
  locationId: string;
  status: string;
};

/** Create/update payload (code is auto-generated on create). */
export type ZonePayload = {
  name: string;
  description?: string;
  locationId: string;
  status: number;
};

export type GetZoneParams = {
  search?: string;
  status?: string;
  locationId?: string;
};

export type ZoneServiceRecord = {
  id: string;
  name: string;
  code: string;
  description: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  locationMigrateSourceId: string | null;
  status: number;
  migrateSourceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type ZoneCrudOptions = {
  syncToChanneling?: boolean;
};

export function emptyZoneFormValues(): ZoneFormValues {
  return {
    name: '',
    description: '',
    locationId: '',
    status: String(ZONE_STATUS.PUBLISH)
  };
}

export function zoneStatusLabel(status: number): string {
  return status === ZONE_STATUS.PUBLISH ? 'Publish' : 'Unpublish';
}
