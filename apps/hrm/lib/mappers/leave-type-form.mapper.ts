import type {
  LeaveTypeFormValues,
  LeaveTypePayload,
  LeaveTypeRecord
} from '@/types/leave';

function yesNoToBoolean(value: string): boolean {
  return value === 'yes';
}

function booleanToYesNo(value: boolean): 'yes' | 'no' {
  return value ? 'yes' : 'no';
}

function parseOptionalFloat(
  value: string | number | null | undefined
): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

type LeaveTypeFormVariant = 'normal' | 'lieu';

export function leaveTypeFormValuesToPayload(
  values: LeaveTypeFormValues,
  options?: { variant?: LeaveTypeFormVariant }
): LeaveTypePayload {
  // Code is always server-generated via Sequence; never take it from the form.
  const variant = options?.variant ?? (values.isLieuLeave ? 'lieu' : 'normal');

  if (variant === 'lieu') {
    return {
      name: String(values.name ?? '').trim(),
      description: String(values.description ?? '').trim() || null,
      isPaid: true,
      requiresApproval: yesNoToBoolean(values.requiresApproval),
      allowHalfDay: false,
      isLieuLeave: true,
      carryForwardAllowed: false,
      maxDaysPerYear: null,
      maxCarryForwardDays: null,
      status: Number.parseInt(String(values.status), 10) === 0 ? 0 : 1
    };
  }

  const carryForwardAllowed = yesNoToBoolean(values.carryForwardAllowed);

  return {
    name: String(values.name ?? '').trim(),
    description: String(values.description ?? '').trim() || null,
    isPaid: yesNoToBoolean(values.isPaid),
    requiresApproval: yesNoToBoolean(values.requiresApproval),
    allowHalfDay: yesNoToBoolean(values.allowHalfDay),
    isLieuLeave: false,
    carryForwardAllowed,
    maxDaysPerYear: parseOptionalFloat(values.maxDaysPerYear),
    maxCarryForwardDays: carryForwardAllowed
      ? parseOptionalFloat(values.maxCarryForwardDays)
      : null,
    status: Number.parseInt(String(values.status), 10) === 0 ? 0 : 1
  };
}

export function leaveTypeRecordToFormValues(
  record: LeaveTypeRecord
): LeaveTypeFormValues {
  return {
    code: record.code ?? '',
    name: record.name ?? '',
    description: record.description ?? '',
    isPaid: booleanToYesNo(Boolean(record.isPaid)),
    requiresApproval: booleanToYesNo(Boolean(record.requiresApproval)),
    allowHalfDay: booleanToYesNo(Boolean(record.allowHalfDay)),
    isLieuLeave: Boolean(record.isLieuLeave),
    carryForwardAllowed: booleanToYesNo(Boolean(record.carryForwardAllowed)),
    maxDaysPerYear:
      record.maxDaysPerYear != null ? String(record.maxDaysPerYear) : '',
    maxCarryForwardDays:
      record.maxCarryForwardDays != null
        ? String(record.maxCarryForwardDays)
        : '',
    status: String(record.status ?? 1)
  };
}
