import type {
  RoomFormValues,
  RoomPayload,
  RoomServiceRecord,
  RoomUiRecord
} from '@/types/room';
import { emptyRoomFormValues } from '@/types/room';

export { emptyRoomFormValues };

export function roomRecordToFormValues(record: RoomUiRecord): RoomFormValues {
  return {
    number: record.number,
    description: record.description,
    locationId: record.locationId,
    zoneId: record.zoneId,
    status: String(record.status)
  };
}

export function formValuesToRoomPayload(values: RoomFormValues): RoomPayload {
  return {
    number: values.number.trim(),
    description: values.description.trim(),
    locationId: values.locationId.trim(),
    zoneId: values.zoneId.trim(),
    status: Number.parseInt(values.status, 10)
  };
}

export function mapRoomToUiRecord(record: RoomServiceRecord): RoomUiRecord {
  return {
    id: record.id,
    number: record.number,
    code: record.code,
    description: record.description,
    locationId: record.locationId,
    locationName: record.locationName,
    locationCode: record.locationCode,
    zoneId: record.zoneId,
    zoneName: record.zoneName,
    zoneCode: record.zoneCode,
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
