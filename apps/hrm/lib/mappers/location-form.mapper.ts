import type {
  LocationFormValues,
  LocationPayload,
  LocationServiceRecord,
  LocationUiRecord
} from '@/types/location';
import { emptyLocationFormValues } from '@/types/location';

export { emptyLocationFormValues };

export function locationRecordToFormValues(
  record: LocationUiRecord
): LocationFormValues {
  return {
    name: record.name,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    branchType: String(record.branchType),
    status: String(record.status),
    order: String(record.order),
    color: record.color ?? ''
  };
}

export function formValuesToLocationPayload(
  values: LocationFormValues
): LocationPayload {
  const color = values.color.trim();
  return {
    name: values.name.trim(),
    addressLine1: values.addressLine1.trim(),
    addressLine2: values.addressLine2.trim(),
    city: values.city.trim(),
    branchType: Number.parseInt(values.branchType, 10),
    status: Number.parseInt(values.status, 10),
    order: Number.parseInt(values.order, 10),
    color: color === '' ? null : color
  };
}

export function mapLocationToUiRecord(
  record: LocationServiceRecord
): LocationUiRecord {
  return {
    id: record.id,
    name: record.name,
    code: record.code,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    branchType: record.branchType,
    status: record.status as 0 | 1,
    order: record.order,
    color: record.color,
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
