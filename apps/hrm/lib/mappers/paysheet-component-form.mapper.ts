import type {
  PaysheetComponentFormValues,
  PaysheetComponentServiceRecord,
  PaysheetComponentUiRecord
} from '@/types/paysheet-component';
import { emptyPaysheetComponentFormValues } from '@/types/paysheet-component';

export { emptyPaysheetComponentFormValues };

export function paysheetComponentRecordToFormValues(
  record: PaysheetComponentUiRecord
): PaysheetComponentFormValues {
  return {
    name: record.name,
    code: record.code,
    typeId: record.typeId,
    orderNo: String(record.orderNo),
    percentage:
      record.percentage != null ? String(record.percentage) : '',
    includedForIds: [...record.includedForIds]
  };
}

export function mapPaysheetComponentToUiRecord(
  record: PaysheetComponentServiceRecord
): PaysheetComponentUiRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    kind: record.kind as PaysheetComponentUiRecord['kind'],
    typeId: record.typeId,
    orderNo: record.orderNo,
    percentage: record.percentage,
    includedForIds: [...record.includedForIds],
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
