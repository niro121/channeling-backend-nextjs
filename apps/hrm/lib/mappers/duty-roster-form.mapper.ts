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
    staffId: '',
    otherStaffId: '',
    shiftTypeId: '',
    dutyDate: defaultDate,
    startTime: '07:00',
    endTime: '15:00',
    dutyLocation: '',
    wardUnit: '',
    supervisorId: '',
    attendance: 'unmarked',
    comments: ''
  };
}

export function dutyRosterRowToFormValues(
  row: DutyRosterRow,
  defaultDate: Date
): DutyRosterFormValues {
  return {
    staffId: row.staffId,
    otherStaffId: '',
    shiftTypeId: row.shiftTypeId,
    dutyDate: row.date ? new Date(row.date) : defaultDate,
    startTime: row.startTime || '07:00',
    endTime: row.endTime || '15:00',
    dutyLocation: row.dutyLocation,
    wardUnit: row.wardUnit,
    supervisorId: row.supervisorId ?? '',
    attendance: row.attendance || 'unmarked',
    comments: row.comments
  };
}

export function dutyFormValuesToSavePayload(
  values: DutyRosterFormValues,
  allocationId?: string
): SaveRosterAllocationDraftPayload {
  const dutyDate = values.dutyDate as Date;
  const { from, to } = weekBounds(dutyDate);
  return {
    allocationId,
    staffId: values.staffId,
    shiftTypeId: values.shiftTypeId,
    rosterDate: dutyDate,
    periodFromDate: from,
    periodToDate: to,
    unit: values.wardUnit || null,
    dutyLocation: values.dutyLocation || '',
    supervisorId: values.supervisorId || null,
    attendance:
      values.attendance && values.attendance !== 'unmarked'
        ? (values.attendance as SaveRosterAllocationDraftPayload['attendance'])
        : null,
    comments: values.comments || ''
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
