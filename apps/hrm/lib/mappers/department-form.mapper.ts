import type {
  DepartmentFormValues,
  DepartmentPayload,
  DepartmentServiceRecord,
  DepartmentUiRecord
} from '@/types/department';
import { emptyDepartmentFormValues } from '@/types/department';

export { emptyDepartmentFormValues };

export function departmentRecordToFormValues(
  record: DepartmentUiRecord
): DepartmentFormValues {
  return {
    name: record.name,
    description: record.description,
    institution: String(record.institution),
    status: String(record.status)
  };
}

export function formValuesToDepartmentPayload(
  values: DepartmentFormValues
): DepartmentPayload {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    institution: Number.parseInt(values.institution, 10),
    status: Number.parseInt(values.status, 10)
  };
}

export function mapDepartmentToUiRecord(
  record: DepartmentServiceRecord
): DepartmentUiRecord {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    institution: record.institution,
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
