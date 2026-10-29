import type {
  ManageRosterFormValues,
  ManageRosterServiceRecord,
  ManageRosterUiRecord
} from '@/types/manage-roster';

export function emptyManageRosterFormValues(): ManageRosterFormValues {
  return {
    name: '',
    code: '',
    departmentId: '',
    shiftsPerPersonPerDay: '1'
  };
}

export function manageRosterRecordToFormValues(
  record: ManageRosterUiRecord
): ManageRosterFormValues {
  return {
    name: record.name,
    code: record.code,
    departmentId: record.departmentId,
    shiftsPerPersonPerDay: String(record.shiftsPerPersonPerDay)
  };
}

export function mapManageRosterToUiRecord(
  record: ManageRosterServiceRecord
): ManageRosterUiRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    departmentId: record.departmentId,
    departmentName: record.departmentName,
    shiftsPerPersonPerDay: record.shiftsPerPersonPerDay,
    assignedStaffCount: record.assignedStaffCount,
    activeShiftCount: record.activeShiftCount,
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
