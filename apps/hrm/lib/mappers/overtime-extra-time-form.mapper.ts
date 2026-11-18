import {
  dateTimePartsToDate,
  type DateTimeParts
} from '@/components/custom/custom-datetime-parts';
import type { ExtraTimePayload, ExtraTimeTimeType } from '@/types/overtime';

export type ExtraTimeFormValueInput = {
  staffId: string;
  shiftDate: Date | null;
  shiftId: string;
  timeType: ExtraTimeTimeType | '';
  fromParts: DateTimeParts;
  toParts: DateTimeParts;
  approverId: string;
  comment: string;
};

export function extraTimeFormValuesToPayload(
  values: ExtraTimeFormValueInput,
  extras?: { shiftLabel?: string | null }
): ExtraTimePayload | { error: string } {
  if (!values.shiftDate) {
    return { error: 'Shift date is required' };
  }

  const fromAt = dateTimePartsToDate(values.fromParts);
  const toAt = dateTimePartsToDate(values.toParts);
  if (!fromAt || !toAt) {
    return { error: 'From and To times must be complete dates' };
  }

  const timeType =
    values.timeType === 'inTime' || values.timeType === 'outTime'
      ? values.timeType
      : ('outTime' as ExtraTimeTimeType);

  return {
    staffId: values.staffId,
    shiftDate: values.shiftDate,
    shiftId: values.shiftId || null,
    shiftLabel: extras?.shiftLabel ?? null,
    timeType,
    fromAt,
    toAt,
    approverId: values.approverId || null,
    comment: values.comment?.trim() ? values.comment.trim() : null
  };
}
