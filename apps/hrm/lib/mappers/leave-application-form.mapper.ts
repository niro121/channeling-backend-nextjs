import { toValidDate } from '@/lib/utils/date';
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
      | 'acknowledgedWarnings'
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
    comment: values.comment?.trim() ? values.comment.trim() : null,
    outWithCancel: Boolean(values.outWithCancel),
    isHalfDay,
    halfDaySession: session,
    lieuShiftId: values.lieuShiftId || null,
    lieuShiftLabel: extras?.lieuShiftLabel ?? null,
    entitleSnapshot: extras?.entitleSnapshot ?? null,
    utilizedSnapshot: extras?.utilizedSnapshot ?? null,
    balanceSnapshot: extras?.balanceSnapshot ?? null,
    shifts: extras?.shifts,
    ...(extras?.acknowledgedWarnings
      ? { acknowledgedWarnings: true }
      : {})
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
    // List API returns display strings (dd/MM/yyyy); parse those safely.
    fromDate: toValidDate(record.fromDate),
    toDate: toValidDate(record.toDate),
    requestedDate: toValidDate(record.requestedDate),
    approverId: record.approverId ?? '',
    approvedDate: toValidDate(record.approvedAt),
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
