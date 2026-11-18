import type {
  StaffSpecialityFormValues,
  StaffSpecialityServiceRecord,
  StaffSpecialityUiRecord
} from '@/types/staff-speciality';

export function emptyStaffSpecialityFormValues(): StaffSpecialityFormValues {
  return {
    name: '',
    code: '',
    categoryId: '',
    description: '',
    status: '1',
    sortOrder: '0'
  };
}

export function staffSpecialityRecordToFormValues(
  record: StaffSpecialityUiRecord
): StaffSpecialityFormValues {
  return {
    name: record.name,
    code: record.code,
    categoryId: record.categoryId,
    description: record.description,
    status: String(record.status),
    sortOrder: String(record.sortOrder)
  };
}

export function mapStaffSpecialityToUiRecord(
  record: StaffSpecialityServiceRecord
): StaffSpecialityUiRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    categoryId: record.categoryId,
    description: record.description,
    status: record.status,
    sortOrder: record.sortOrder,
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
