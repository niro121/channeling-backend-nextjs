import type {
  DesignationFormValues,
  DesignationServiceRecord,
  DesignationUiRecord
} from '@/types/designation';

export function emptyDesignationFormValues(): DesignationFormValues {
  return {
    name: '',
    code: '',
    categoryId: '',
    description: ''
  };
}

export function designationRecordToFormValues(
  record: DesignationUiRecord
): DesignationFormValues {
  return {
    name: record.name,
    code: record.code,
    categoryId: record.categoryId,
    description: record.description
  };
}

export function mapDesignationToUiRecord(
  record: DesignationServiceRecord
): DesignationUiRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    categoryId: record.categoryId,
    description: record.description,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdByUser: {
      name: record.createdUser?.name ?? '—',
      role: undefined
    },
    updatedByUser: {
      name: record.updatedUser?.name ?? '—',
      role: undefined
    },
    staffCount: record.staffCount
  };
}
