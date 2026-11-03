import type {
  ZoneFormValues,
  ZonePayload,
  ZoneServiceRecord,
  ZoneUiRecord
} from '@/types/zone';
import { emptyZoneFormValues } from '@/types/zone';

export { emptyZoneFormValues };

export function zoneRecordToFormValues(record: ZoneUiRecord): ZoneFormValues {
  return {
    name: record.name,
    description: record.description,
    locationId: record.locationId,
    status: String(record.status)
  };
}

export function formValuesToZonePayload(values: ZoneFormValues): ZonePayload {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    locationId: values.locationId.trim(),
    status: Number.parseInt(values.status, 10)
  };
}

export function mapZoneToUiRecord(record: ZoneServiceRecord): ZoneUiRecord {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    description: record.description,
    locationId: record.locationId,
    locationName: record.locationName,
    locationCode: record.locationCode,
    status: record.status as 0 | 1,
    migrateSourceId: record.migrateSourceId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdByUser: {
      name: record.createdUser?.name ?? '—',
      role: undefined
    },
    updatedByUser: {
      name: record.updatedUser?.name ?? '—',
      role: undefined
    }
  };
}
