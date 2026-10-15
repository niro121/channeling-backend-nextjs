import type {
  LeaveApplicationFormValues,
  LeaveApplicationPayload,
  LeaveApplicationRecord
} from '@/types/leave';

export function leaveApplicationFormValuesToPayload(
  values: LeaveApplicationFormValues,
  extras?: Partial<
    Pick<
      LeaveApplicationPayload,
      | 'lieuShiftLabel'
      | 'entitleSnapshot'
      | 'utilizedSnapshot'
      | 'balanceSnapshot'
      | 'shifts'
    >
  >
): LeaveApplicationPayload {
  const isHalfDay = Boolean(values.isHalfDay);
  const leaveDate = values.fromDate as Date;
  const session =
    isHalfDay && (values.halfDaySession === 'AM' || values.halfDaySession === 'PM')
      ? values.halfDaySession
      : null;

  return {
    staffId: values.staffId,
    leaveTypeId: values.leaveTypeId,
    // Half-day mode: single date stored on both from and to
    fromDate: leaveDate,
    toDate: isHalfDay ? leaveDate : (values.toDate as Date),
    requestedDate: values.requestedDate,
    approverId: values.approverId || null,
    comment: values.comment?.trim() ? values.comment.trim() : null,
    outWithCancel: Boolean(values.outWithCancel),
    isHalfDay,
    halfDaySession: session,
    lieuShiftId: values.lieuShiftId || null,
    lieuShiftLabel: extras?.lieuShiftLabel ?? null,
    entitleSnapshot: extras?.entitleSnapshot ?? null,
    utilizedSnapshot: extras?.utilizedSnapshot ?? null,
    balanceSnapshot: extras?.balanceSnapshot ?? null,
    shifts: extras?.shifts
  };
}

export function leaveApplicationRecordToFormValues(
  record: LeaveApplicationRecord
): LeaveApplicationFormValues {
  const isHalfDay =
    Boolean(record.isHalfDay) ||
    Number(record.days) === 0.5 ||
    record.halfDaySession === 'AM' ||
    record.halfDaySession === 'PM';

  return {
    formNumber: record.formNumber ?? '',
    staffId: record.staffId,
    leaveTypeId: record.leaveTypeId,
    fromDate: record.fromDate ? new Date(record.fromDate) : null,
    toDate: record.toDate ? new Date(record.toDate) : null,
    requestedDate: record.requestedDate
      ? new Date(record.requestedDate)
      : null,
    approverId: record.approverId ?? '',
    approvedDate: record.approvedAt ? new Date(record.approvedAt) : null,
    lieuShiftId: record.lieuShiftId ?? '',
    comment: record.comment ?? '',
    outWithCancel: Boolean(record.outWithCancel),
    isHalfDay,
    halfDaySession:
      record.halfDaySession === 'AM' || record.halfDaySession === 'PM'
        ? record.halfDaySession
        : ''
  };
}
