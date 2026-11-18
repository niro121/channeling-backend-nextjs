import { addDays, startOfWeek } from 'date-fns';
import type {
  DutyRosterFormValues,
  DutyRosterRow,
  ReplaceDutyPayload,
  SaveRosterAllocationDraftPayload,
  SwapDutyPayload
} from '@/types/roster';

function weekBounds(dutyDate: Date): { from: Date; to: Date } {
  const from = startOfWeek(dutyDate, { weekStartsOn: 0 });
  return { from, to: addDays(from, 6) };
}

export function emptyDutyFormValues(defaultDate: Date): DutyRosterFormValues {
  return {
    useStandingAssignment: true,
    staffId: '',
    otherStaffId: '',
    staffShiftAssignmentId: '',
    shiftTypeId: '',
    dutyDate: defaultDate,
    startTime: '07:00',
    endTime: '15:00',
    useWorkingDepartment: true,
    dutyLocationDepartmentId: '',
    dutyZoneId: '',
    dutyRoomId: '',
    supervisorId: '',
    attendance: 'unmarked',
    comments: ''
  };
}

export function dutyRosterRowToFormValues(
  row: DutyRosterRow,
  defaultDate: Date
): DutyRosterFormValues {
  const isStanding = row.allocationSource === 'standing';
  return {
    useStandingAssignment: isStanding,
    staffId: row.staffId,
    otherStaffId: '',
    staffShiftAssignmentId: row.staffShiftAssignmentId ?? '',
    shiftTypeId: row.shiftTypeId,
    dutyDate: row.date ? new Date(row.date) : defaultDate,
    startTime: row.startTime || '07:00',
    endTime: row.endTime || '15:00',
    useWorkingDepartment: false,
    dutyLocationDepartmentId: row.dutyLocationDepartmentId ?? '',
    dutyZoneId: row.dutyZoneId ?? '',
    dutyRoomId: row.dutyRoomId ?? '',
    supervisorId: row.supervisorId ?? '',
    attendance: row.attendance || 'unmarked',
    comments: row.comments
  };
}

export function dutyFormValuesToSavePayload(
  values: DutyRosterFormValues,
  allocationId?: string,
  options?: { acknowledgedWarnings?: boolean }
): SaveRosterAllocationDraftPayload {
  const dutyDate = values.dutyDate as Date;
  const { from, to } = weekBounds(dutyDate);
  const standing = values.useStandingAssignment;
  return {
    allocationId,
    staffId: values.staffId,
    shiftTypeId: values.shiftTypeId,
    rosterDate: dutyDate,
    periodFromDate: from,
    periodToDate: to,
    dutyLocationDepartmentId: values.dutyLocationDepartmentId || null,
    dutyZoneId: values.dutyZoneId || null,
    dutyRoomId: values.dutyRoomId || null,
    unit: null,
    supervisorId: values.supervisorId || null,
    allocationSource: standing ? 'standing' : 'adhoc',
    staffShiftAssignmentId: standing
      ? values.staffShiftAssignmentId || null
      : null,
    attendance:
      values.attendance && values.attendance !== 'unmarked'
        ? (values.attendance as SaveRosterAllocationDraftPayload['attendance'])
        : null,
    comments: values.comments || '',
    ...(options?.acknowledgedWarnings
      ? { acknowledgedWarnings: true }
      : {})
  };
}

export function dutyFormValuesToSwapPayload(
  values: DutyRosterFormValues,
  allocationId?: string
): SwapDutyPayload {
  return {
    allocationId,
    staffId: values.staffId,
    otherStaffId: values.otherStaffId,
    dutyDate: values.dutyDate as Date
  };
}

export function dutyFormValuesToReplacePayload(
  values: DutyRosterFormValues,
  allocationId?: string
): ReplaceDutyPayload {
  return {
    allocationId,
    staffId: values.staffId,
    replacementStaffId: values.otherStaffId,
    dutyDate: values.dutyDate as Date
  };
}
