import type {
  HolidayCalendarFormValues,
  HolidayCalendarServiceRecord,
  HolidayCalendarUiRecord
} from '@/types/holiday-calendar';

export function emptyHolidayFormValues(): HolidayCalendarFormValues {
  return {
    name: '',
    typeId: 'public',
    date: new Date()
  };
}

export function holidayRecordToFormValues(
  record: HolidayCalendarUiRecord
): HolidayCalendarFormValues {
  return {
    name: record.name,
    typeId: record.typeId,
    date: new Date(`${record.date.slice(0, 10)}T00:00:00`)
  };
}

export function holidayFormValuesToDateKey(date: Date | null): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function mapHolidayToUiRecord(
  record: HolidayCalendarServiceRecord
): HolidayCalendarUiRecord {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    typeId: record.typeId,
    date: record.date,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdByUser: {
      name: record.createdUser?.name ?? '—',
      role: undefined
    },
    updatedByUser: {
      name: record.updatedUser?.name ?? '—',
      role: undefined
    },
    allocationCount: record.allocationCount
  };
}
