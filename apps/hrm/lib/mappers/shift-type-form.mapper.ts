import {
  SHIFT_TYPE_CATEGORY_OPTIONS,
  type ShiftTypeFormValues,
  type ShiftTypePayload,
  type ShiftTypeRecord
} from '@/types/roster';
import { normalizeShiftTime } from '@/lib/helpers/shift-duration';

function parseNonNegativeInt(value: string, fallback = 0): number {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function shiftTypeCategoryIdFromName(name?: string | null): string {
  if (!name) return '';
  return (
    SHIFT_TYPE_CATEGORY_OPTIONS.find((option) => option.name === name)?.id ?? ''
  );
}

export function shiftTypeCategoryNameFromId(id?: string | null): string {
  if (!id) return '';
  return (
    SHIFT_TYPE_CATEGORY_OPTIONS.find((option) => option.id === id)?.name ?? ''
  );
}

export function shiftTypeFormValuesToPayload(
  values: ShiftTypeFormValues
): ShiftTypePayload {
  return {
    name: values.name.trim(),
    category: shiftTypeCategoryNameFromId(values.categoryId) || null,
    startTime: normalizeShiftTime(values.startTime),
    endTime: normalizeShiftTime(values.endTime),
    breakMinutes: parseNonNegativeInt(values.breakMinutes),
    graceMinutes: parseNonNegativeInt(values.graceMinutes),
    lateThresholdMinutes: parseNonNegativeInt(values.lateThresholdMinutes),
    earlyExitThresholdMinutes: parseNonNegativeInt(
      values.earlyExitThresholdMinutes
    ),
    isOvernight: Boolean(values.isOvernight),
    isNightShift: Boolean(values.isNightShift),
    holidayEligible: Boolean(values.holidayEligible),
    status: values.isActive ? 'active' : 'inactive'
  };
}

export function shiftTypeRecordToFormValues(
  record: ShiftTypeRecord,
  options?: { duplicate?: boolean }
): ShiftTypeFormValues {
  const duplicate = Boolean(options?.duplicate);
  return {
    code: duplicate ? '' : (record.code ?? ''),
    name: duplicate ? `Copy of ${record.name}` : (record.name ?? ''),
    categoryId: shiftTypeCategoryIdFromName(record.category),
    startTime: record.startTime ?? '',
    endTime: record.endTime ?? '',
    breakMinutes: String(record.breakMinutes ?? 0),
    durationHours: String(record.durationHours ?? 0),
    graceMinutes: String(record.graceMinutes ?? 0),
    lateThresholdMinutes: String(record.lateThresholdMinutes ?? 0),
    earlyExitThresholdMinutes: String(record.earlyExitThresholdMinutes ?? 0),
    isOvernight: Boolean(record.isOvernight),
    isNightShift: Boolean(record.isNightShift),
    holidayEligible: Boolean(record.holidayEligible),
    isActive: record.status !== 'inactive'
  };
}
