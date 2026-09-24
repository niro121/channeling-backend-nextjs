import {
  MANAGE_ROSTER_DEPARTMENTS,
  MANAGE_ROSTER_DEPARTMENT_LABELS,
  type ManageRosterDepartmentOption,
  type ManageRosterFormValues,
  type ManageRosterServiceRecord,
  type ManageRosterUiRecord
} from '@/types/manage-roster';

export const manageRosterDepartmentOptions: ManageRosterDepartmentOption[] =
  MANAGE_ROSTER_DEPARTMENTS.map((id) => ({
    id,
    name: MANAGE_ROSTER_DEPARTMENT_LABELS[id]
  }));

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
