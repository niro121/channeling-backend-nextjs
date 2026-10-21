import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** Prefix for `generateRecordCode` → e.g. `RM-1`, `RM-2`. */
export const ROOM_CODE_PREFIX = 'RM';

export const ROOM_STATUS = {
  UNPUBLISH: 0,
  PUBLISH: 1
} as const;

export type RoomStatus = (typeof ROOM_STATUS)[keyof typeof ROOM_STATUS];

export const ROOM_STATUS_OPTIONS = [
  { id: '0', name: 'Unpublish' },
  { id: '1', name: 'Publish' }
] as const;

export type RoomAuditUser = {
  name: string;
  role?: string;
};

export type RoomLocationSummary = {
  id: string;
  name: string;
  code: string;
  migrateSourceId: string | null;
};

export type RoomZoneSummary = {
  id: string;
  name: string;
  code: string;
  locationId: string;
  migrateSourceId: string | null;
};

/** UI record for Designations-style master–detail. */
export type RoomUiRecord = {
  id: string;
  number: string;
  code: string;
  description: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  status: RoomStatus;
  migrateSourceId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUser: RoomAuditUser;
  updatedByUser: RoomAuditUser;
};

export type RoomFormValues = {
  number: string;
  description: string;
  locationId: string;
  zoneId: string;
  status: string;
};

/** Create/update payload (code is auto-generated on create). */
export type RoomPayload = {
  number: string;
  description?: string;
  locationId: string;
  zoneId: string;
  status: number;
};

export type GetRoomParams = {
  search?: string;
  status?: string;
  locationId?: string;
  zoneId?: string;
};

export type RoomServiceRecord = {
  id: string;
  number: string;
  code: string;
  description: string;
  locationId: string;
  locationName: string;
  locationCode: string;
  locationMigrateSourceId: string | null;
  zoneId: string;
  zoneName: string;
  zoneCode: string;
  zoneMigrateSourceId: string | null;
  status: number;
  migrateSourceId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type RoomCrudOptions = {
  syncToChanneling?: boolean;
};

export function emptyRoomFormValues(): RoomFormValues {
  return {
    number: '',
    description: '',
    locationId: '',
    zoneId: '',
    status: String(ROOM_STATUS.PUBLISH)
  };
}

export function roomStatusLabel(status: number): string {
  return status === ROOM_STATUS.PUBLISH ? 'Publish' : 'Unpublish';
}
