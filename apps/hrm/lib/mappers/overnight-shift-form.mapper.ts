import { addDays, format, parseISO, startOfWeek } from 'date-fns';
import type {
  OvernightAllocationDate,
  OvernightShiftPayload,
  OvernightShiftRecord,
  SaveRosterAllocationDraftPayload
} from '@/types/roster';
import type { OvernightFormValues } from '@/app/(dashboard)/(roster-shifts)/overnight-shifts/sheet-overnight-form';

function weekBounds(shiftDate: Date): { from: Date; to: Date } {
  const from = startOfWeek(shiftDate, { weekStartsOn: 0 });
  return { from, to: addDays(from, 6) };
}

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function overnightRecordToFormValues(
  record: OvernightShiftRecord
): OvernightFormValues {
  return {
    staffId: record.staffId,
    shiftTypeId: record.shiftTypeId,
    allocationId: record.attendanceAllocation || 'shift_start',
    startDate: record.startDate ? parseISO(record.startDate.slice(0, 10)) : null,
    startTime: record.startTime,
    endDate: record.endDate ? parseISO(record.endDate.slice(0, 10)) : null,
    endTime: record.endTime,
    day1Hours: record.day1Hours.toFixed(2),
    day2Hours: record.day2Hours.toFixed(2),
    totalHours: record.totalHours.toFixed(2),
    overnightOt: record.overnightOt.toFixed(2),
    allowance: record.overnightAllowance.toFixed(2),
    status: record.status,
    autoSplit: record.autoSplit,
    sendToPayroll: record.payrollReady,
    remarks: record.remarks
  };
}

export function overnightFormValuesToPayload(
  values: OvernightFormValues
): OvernightShiftPayload {
  return {
    staffId: values.staffId,
    shiftTypeId: values.shiftTypeId,
    startDate: values.startDate ?? '',
    endDate: values.endDate ?? '',
    startTime: values.startTime,
    endTime: values.endTime,
    day1Hours: parseNumber(values.day1Hours),
    day2Hours: parseNumber(values.day2Hours),
    totalHours: parseNumber(values.totalHours),
    attendanceAllocation: (values.allocationId as OvernightAllocationDate) || 'shift_start',
    overnightOt: parseNumber(values.overnightOt),
    overnightAllowance: parseNumber(values.allowance),
    autoSplit: values.autoSplit,
    sendToPayroll: values.sendToPayroll,
    remarks: values.remarks || null
  };
}

export function overnightFormValuesToDraftPayload(
  values: OvernightFormValues,
  allocationId?: string,
  department?: string,
  unit?: string,
  roster?: string
): SaveRosterAllocationDraftPayload {
  const shiftDate = values.startDate as Date;
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

export function formatOvernightExportDate(value: string): string {
  if (!value) return '';
  return format(parseISO(value.slice(0, 10)), 'yyyy-MM-dd');
}
