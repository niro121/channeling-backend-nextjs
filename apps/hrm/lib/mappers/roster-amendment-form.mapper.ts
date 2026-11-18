import { format, parseISO } from 'date-fns';
import type { RosterAmendmentPayload, RosterAmendmentRecord } from '@/types/roster';
import type { AmendmentFormValues } from '@/app/(dashboard)/(roster-shifts)/roster-amendments/sheet-amendment-form';

export function amendmentRecordToFormValues(
  record: RosterAmendmentRecord
): AmendmentFormValues {
  return {
    amendmentNo: record.code,
    amendmentTypeId: record.amendmentType,
    staffId: record.staffId,
    rosterDate: record.dutyDate ? parseISO(record.dutyDate.slice(0, 10)) : null,
    originalShift: record.originalShiftLabel,
    originalShiftTypeId: record.originalShiftTypeId,
    amendedShiftId: record.amendedShiftTypeId ?? '',
    replacementStaffId: record.swapStaffId ?? '',
    dutyLocationDepartmentId: record.dutyLocationDepartmentId ?? '',
    dutyZoneId: record.dutyZoneId ?? '',
    dutyRoomId: record.dutyRoomId ?? '',
    requestedById: record.requestedById ?? '',
    status: record.status,
    reason: record.reason,
    remarks: record.remarks
  };
}

export function amendmentFormValuesToPayload(
  values: AmendmentFormValues,
  options?: { acknowledgedWarnings?: boolean }
): RosterAmendmentPayload {
  const type = values.amendmentTypeId;
  const isCancellation = type === 'duty_cancellation';
  const isStaffReplacement = type === 'staff_replacement';
  const isShiftSwap = type === 'shift_swap';
  const isLocationChange = type === 'location_change';
  const isExtraDuty = type === 'extra_duty';

  const originalShiftTypeId =
    isExtraDuty && !values.originalShiftTypeId
      ? values.amendedShiftId
      : values.originalShiftTypeId;

  let amendedShiftTypeId: string | null = values.amendedShiftId || null;
  if (isCancellation || isLocationChange) {
    amendedShiftTypeId = null;
  } else if (isStaffReplacement) {
    amendedShiftTypeId = originalShiftTypeId || null;
  } else if (isShiftSwap) {
    // Partner duty's shift type (Approve resolves secondary cell by this).
    amendedShiftTypeId = values.amendedShiftId || null;
  }

  return {
    staffId: values.staffId,
    dutyDate: values.rosterDate
      ? format(values.rosterDate, 'yyyy-MM-dd')
      : '',
    originalShiftTypeId,
    amendedShiftTypeId,
    amendmentType: type,
    swapStaffId:
      isStaffReplacement || isShiftSwap
        ? values.replacementStaffId || null
        : null,
    dutyLocation: null,
    dutyLocationDepartmentId: isLocationChange
      ? values.dutyLocationDepartmentId || null
      : null,
    dutyZoneId: isLocationChange ? values.dutyZoneId || null : null,
    dutyRoomId: isLocationChange ? values.dutyRoomId || null : null,
    reason: values.reason,
    remarks: values.remarks || null,
    requestedById: values.requestedById || null,
    status: values.status,
    ...(options?.acknowledgedWarnings
      ? { acknowledgedWarnings: true }
      : {})
  };
}
