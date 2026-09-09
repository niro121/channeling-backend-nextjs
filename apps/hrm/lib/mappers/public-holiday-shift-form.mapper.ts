import { format, parseISO } from 'date-fns';
import type {
  PublicHolidayShiftPayload,
  PublicHolidayShiftRecord
} from '@/types/roster';

export type HolidayFormValues = {
  holidayId: string;
  holidayTypeId: string;
  staffId: string;
  shiftId: string;
  dutyDate: Date | null;
  workedHours: string;
  payRate: string;
  holidayAllowance: string;
  dutyLocation: string;
  status: string;
  grantLieuLeave: boolean;
  sendToPayroll: boolean;
  remarks: string;
};

function parseNumber(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function holidayRecordToFormValues(
  record: PublicHolidayShiftRecord
): HolidayFormValues {
  return {
    holidayId: record.holidayId,
    holidayTypeId: record.holidayTypeId,
    staffId: record.staffId,
    shiftId: record.shiftTypeId,
    dutyDate: record.dutyDate ? parseISO(record.dutyDate.slice(0, 10)) : null,
    workedHours: record.workedHours.toFixed(2),
    payRate: record.payRate,
    holidayAllowance: record.holidayAllowance.toFixed(2).replace(/,/g, ''),
    dutyLocation: record.dutyLocation,
    status: record.status,
    grantLieuLeave: record.lieuLeave,
    sendToPayroll: record.sendToPayroll,
    remarks: record.remarks
  };
}

export function holidayFormValuesToPayload(
  values: HolidayFormValues
): PublicHolidayShiftPayload {
  return {
    holidayId: values.holidayId,
    staffId: values.staffId,
    shiftTypeId: values.shiftId,
    dutyDate: values.dutyDate ?? '',
    workedHours: parseNumber(values.workedHours),
    payRate: values.payRate,
    holidayAllowance: parseNumber(values.holidayAllowance),
    dutyLocation: values.dutyLocation || null,
    grantLieuLeave: values.grantLieuLeave,
    sendToPayroll: values.sendToPayroll,
    status: values.status,
    remarks: values.remarks || null
  };
}

export function formatHolidayExportDate(value: string): string {
  if (!value) return '';
  return format(parseISO(value.slice(0, 10)), 'yyyy-MM-dd');
}
