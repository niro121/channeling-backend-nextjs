import { HOLIDAY_TYPES, type HolidayTypeId } from '@/types/holiday-calendar';
import type { HolidayCalendarTypeOption } from '@/types/holiday-calendar';

export const HOLIDAY_TYPE_LABELS: Record<HolidayTypeId, string> = {
  poya: 'Poya',
  mercantile: 'Mercantile',
  public: 'Public'
};

export function holidayTypeLabel(typeId: string | null | undefined): string {
  if (!typeId) return '';
  return HOLIDAY_TYPE_LABELS[typeId as HolidayTypeId] ?? typeId;
}

export function holidayTypeOptions(): HolidayCalendarTypeOption[] {
  return HOLIDAY_TYPES.map((id) => ({
    id,
    name: HOLIDAY_TYPE_LABELS[id]
  }));
}
