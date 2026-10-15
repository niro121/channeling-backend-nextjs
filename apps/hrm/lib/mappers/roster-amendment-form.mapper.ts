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
    requestedById: record.requestedById ?? '',
    status: record.status,
    reason: record.reason,
    remarks: record.remarks
  };
}

export function amendmentFormValuesToPayload(
  values: AmendmentFormValues
): RosterAmendmentPayload {
  const isCancellation = values.amendmentTypeId === 'duty_cancellation';
  const isStaffReplacement = values.amendmentTypeId === 'staff_replacement';

  return {
    staffId: values.staffId,
    dutyDate: values.rosterDate
      ? format(values.rosterDate, 'yyyy-MM-dd')
      : '',
    originalShiftTypeId: values.originalShiftTypeId,
    amendedShiftTypeId: isCancellation
      ? null
      : isStaffReplacement
        ? values.originalShiftTypeId || null
        : values.amendedShiftId || null,
    amendmentType: values.amendmentTypeId,
    swapStaffId: isStaffReplacement ? values.replacementStaffId || null : null,
    reason: values.reason,
    remarks: values.remarks || null,
    requestedById: values.requestedById || null,
    status: values.status
  };
}
