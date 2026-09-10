import type {
  StaffGradeFormValues,
  StaffGradeServiceRecord,
  StaffGradeUiRecord
} from '@/types/staff-grade';

export function emptyStaffGradeFormValues(): StaffGradeFormValues {
  return {
    name: '',
    code: '',
    gradeLevelId: ''
  };
}

export function staffGradeRecordToFormValues(
  record: StaffGradeUiRecord
): StaffGradeFormValues {
  return {
    name: record.name,
    code: record.code,
    gradeLevelId: record.gradeLevelId
  };
}

export function mapStaffGradeToUiRecord(
  record: StaffGradeServiceRecord
): StaffGradeUiRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    gradeLevelId: record.gradeLevelId,
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
