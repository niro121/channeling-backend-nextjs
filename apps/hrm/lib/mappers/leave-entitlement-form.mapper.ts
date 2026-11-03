import type {
  LeaveEntitlementFormValues,
  LeaveEntitlementPayload,
  LeaveEntitlementRecord
} from '@/types/leave';

function parseDayAmount(
  value: string | number | null | undefined,
  fallback = 0
): number {
  // Yup.number() may coerce Formik values to numbers before onSubmit.
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  if (value == null) return fallback;

  const trimmed = String(value).trim();
  if (!trimmed) return fallback;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function leaveEntitlementFormValuesToPayload(
  values: LeaveEntitlementFormValues
): LeaveEntitlementPayload {
  return {
    staffId: values.staffId,
    leaveTypeId: values.leaveTypeId,
    fromDate: values.fromDate as Date,
    toDate: values.toDate as Date,
    entitled: parseDayAmount(values.entitled),
    carryForward: parseDayAmount(values.carryForward, 0),
    status: values.status || 'active'
  };
}

export function leaveEntitlementRecordToFormValues(
  record: LeaveEntitlementRecord
): LeaveEntitlementFormValues {
  return {
    staffId: record.staffId,
    leaveTypeId: record.leaveTypeId,
    fromDate: record.fromDate ? new Date(record.fromDate) : null,
    toDate: record.toDate ? new Date(record.toDate) : null,
    entitled: String(record.entitled ?? 0),
    carryForward: String(record.carryForward ?? 0),
    status: record.status || 'active'
  };
}
