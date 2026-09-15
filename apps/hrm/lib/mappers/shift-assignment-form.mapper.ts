import type {
  ShiftAssignmentFormValues,
  ShiftAssignmentPayload,
  ShiftAssignmentRecord
} from '@/types/roster';

export function shiftAssignmentFormValuesToPayload(
  values: ShiftAssignmentFormValues
): ShiftAssignmentPayload {
  return {
    staffId: values.staffId,
    shiftTypeId: values.shiftTypeId,
    rotationPattern: values.rotationPatternId || 'fixed',
    effectiveFrom: values.effectiveFrom as Date,
    effectiveTo: values.effectiveTo,
    weeklyOffDay: values.weeklyOffDayId || 'sunday',
    autoAssign: Boolean(values.autoAssign),
    status: values.status || 'active'
  };
}

export function shiftAssignmentRecordToFormValues(
  record: ShiftAssignmentRecord
): ShiftAssignmentFormValues {
  return {
    staffId: record.staffId,
    shiftTypeId: record.shiftTypeId,
    rotationPatternId: record.rotationPattern || 'fixed',
    effectiveFrom: record.effectiveFrom
      ? new Date(record.effectiveFrom)
      : null,
    effectiveTo: record.effectiveTo ? new Date(record.effectiveTo) : null,
    weeklyOffDayId: record.weeklyOffDay || 'sunday',
    status: record.status || 'active',
    autoAssign: Boolean(record.autoAssign)
  };
}

export function shiftAssignmentFormValuesToBulkPayload(
  values: Omit<ShiftAssignmentFormValues, 'staffId'>,
  staffIds: string[]
): Omit<ShiftAssignmentPayload, 'staffId'> & { staffIds: string[] } {
  return {
    staffIds,
    shiftTypeId: values.shiftTypeId,
    rotationPattern: values.rotationPatternId || 'fixed',
    effectiveFrom: values.effectiveFrom as Date,
    effectiveTo: values.effectiveTo,
    weeklyOffDay: values.weeklyOffDayId || 'sunday',
    autoAssign: Boolean(values.autoAssign),
    status: values.status || 'active'
  };
}
