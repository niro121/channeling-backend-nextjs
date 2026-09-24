import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import type {
  NightShiftPayload,
  NightShiftRecord,
  SaveRosterAllocationDraftPayload
} from '@/types/roster';
import type { NightShiftFormValues } from '@/app/(dashboard)/(roster-shifts)/night-shifts/sheet-night-shift-form';

function weekBounds(shiftDate: Date): { from: Date; to: Date } {
  const from = startOfWeek(shiftDate, { weekStartsOn: 0 });
  return { from, to: addDays(from, 6) };
}

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function nightShiftRecordToFormValues(
  record: NightShiftRecord
): NightShiftFormValues {
  return {
    staffId: record.staffId,
    shiftTypeId: record.shiftTypeId,
    shiftDate: record.shiftDate ? parseISO(record.shiftDate.slice(0, 10)) : null,
    startTime: record.startTime,
    endTime: record.endTime,
    nightHours: record.nightHours.toFixed(2),
    nightOt: record.nightOt.toFixed(2),
    nightAllowance: record.nightAllowance.toFixed(2),
    mealAllowance: record.mealAllowance.toFixed(2),
    consecutiveNights: String(record.consecutiveNights),
    sendToPayroll: record.payrollReady,
    remarks: record.remarks
  };
}

export function nightShiftFormValuesToPayload(
  values: NightShiftFormValues
): NightShiftPayload {
  return {
    staffId: values.staffId,
    shiftTypeId: values.shiftTypeId,
    shiftDate: values.shiftDate ?? '',
    nightHours: parseNumber(values.nightHours),
    nightOt: parseNumber(values.nightOt),
    nightAllowance: parseNumber(values.nightAllowance),
    mealAllowance: parseNumber(values.mealAllowance),
    sendToPayroll: values.sendToPayroll,
    remarks: values.remarks || null
  };
}

export function nightShiftFormValuesToDraftPayload(
  values: NightShiftFormValues,
  allocationId?: string,
  department?: string,
  unit?: string,
  roster?: string
): SaveRosterAllocationDraftPayload {
  const shiftDate = values.shiftDate as Date;
  const { from, to } = weekBounds(shiftDate);
  return {
    allocationId,
    staffId: values.staffId,
    shiftTypeId: values.shiftTypeId,
    rosterDate: shiftDate,
    periodFromDate: from,
    periodToDate: to,
    department: department ?? null,
    unit: unit ?? null,
    roster: roster ?? null,
    comments: values.remarks || ''
  };
}

export function formatNightShiftExportDate(value: string): string {
  if (!value) return '';
  return format(parseISO(value.slice(0, 10)), 'yyyy-MM-dd');
}
