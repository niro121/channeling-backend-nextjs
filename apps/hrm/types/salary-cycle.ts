import { endOfMonth, format, setHours, setMinutes, setSeconds, startOfMonth, subMonths } from 'date-fns';
import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';
import { getInstitutionName } from '@/types/institution';

export type SalaryCycleAuditUser = {
  name: string;
  role?: string;
};

/** Persisted / UI record for one institution salary cycle. */
export type SalaryCycleUiRecord = {
  id: string;
  institutionId: number;
  salaryFromDate: string;
  salaryToDate: string;
  advanceFromDate: string | null;
  advanceToDate: string | null;
  otFromDate: string | null;
  otToDate: string | null;
  dayOffFromDate: string | null;
  dayOffToDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdByUser: SalaryCycleAuditUser | null;
  updatedByUser: SalaryCycleAuditUser | null;
};

export type SalaryCycleFormValues = {
  salaryFromDate: Date | null;
  salaryToDate: Date | null;
  advanceFromDate: Date | null;
  advanceToDate: Date | null;
  otFromDate: Date | null;
  otToDate: Date | null;
  dayOffFromDate: Date | null;
  dayOffToDate: Date | null;
};

export type SalaryCyclePayload = {
  institutionId: number;
  salaryFromDate: string | Date;
  salaryToDate: string | Date;
  advanceFromDate?: string | Date | null;
  advanceToDate?: string | Date | null;
  otFromDate?: string | Date | null;
  otToDate?: string | Date | null;
  dayOffFromDate?: string | Date | null;
  dayOffToDate?: string | Date | null;
};

export type GetSalaryCycleParams = {
  institutionId?: number;
  search?: string;
};

export type SalaryCycleServiceRecord = {
  id: string;
  institutionId: number;
  salaryFromDate: string;
  salaryToDate: string;
  advanceFromDate: string | null;
  advanceToDate: string | null;
  otFromDate: string | null;
  otToDate: string | null;
  dayOffFromDate: string | null;
  dayOffToDate: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export function emptySalaryCycleFormValues(): SalaryCycleFormValues {
  return {
    salaryFromDate: null,
    salaryToDate: null,
    advanceFromDate: null,
    advanceToDate: null,
    otFromDate: null,
    otToDate: null,
    dayOffFromDate: null,
    dayOffToDate: null
  };
}

export function formatCycleLabel(
  salaryFromDate: string | Date | null | undefined,
  salaryToDate: string | Date | null | undefined
): string {
  if (!salaryFromDate || !salaryToDate) return 'New salary cycle';
  const from =
    salaryFromDate instanceof Date
      ? salaryFromDate
      : new Date(salaryFromDate);
  const to =
    salaryToDate instanceof Date ? salaryToDate : new Date(salaryToDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return 'New salary cycle';
  }
  return `${format(from, 'yyyy-MM-dd')} to ${format(to, 'yyyy-MM-dd')}`;
}

export function formatCycleMonthLabel(
  salaryFromDate: string | Date | null | undefined
): string {
  if (!salaryFromDate) return '';
  const from =
    salaryFromDate instanceof Date
      ? salaryFromDate
      : new Date(salaryFromDate);
  if (Number.isNaN(from.getTime())) return '';
  return format(from, 'MMMM yyyy');
}

export function formatInstitutionCycleTitle(
  institutionId: number,
  salaryFromDate: string | Date | null | undefined,
  salaryToDate: string | Date | null | undefined
): string {
  const institution = getInstitutionName(institutionId);
  const label = formatCycleLabel(salaryFromDate, salaryToDate);
  return `${institution} · Salary Cycle ${label}`;
}

/**
 * Fill defaults from salary-from month:
 * - Advance: 1st → 20th of salary month
 * - OT & Day-off/PH: 15th previous month 00:00 → 14th of salary month 23:59
 */
export function buildFillDefaults(
  salaryFromDate: Date
): Partial<SalaryCycleFormValues> {
  const monthStart = startOfMonth(salaryFromDate);
  const monthEnd = endOfMonth(salaryFromDate);
  const previousMonth = subMonths(monthStart, 1);

  const otFrom = setSeconds(
    setMinutes(
      setHours(
        new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 15),
        0
      ),
      0
    ),
    0
  );
  const otTo = setSeconds(
    setMinutes(
      setHours(
        new Date(monthStart.getFullYear(), monthStart.getMonth(), 14),
        23
      ),
      59
    ),
    59
  );

  return {
    salaryFromDate: monthStart,
    salaryToDate: monthEnd,
    advanceFromDate: monthStart,
    advanceToDate: new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      20
    ),
    otFromDate: otFrom,
    otToDate: otTo,
    dayOffFromDate: otFrom,
    dayOffToDate: otTo
  };
}

export function recordToFormValues(
  record: SalaryCycleUiRecord
): SalaryCycleFormValues {
  const toDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  return {
    salaryFromDate: toDate(record.salaryFromDate),
    salaryToDate: toDate(record.salaryToDate),
    advanceFromDate: toDate(record.advanceFromDate),
    advanceToDate: toDate(record.advanceToDate),
    otFromDate: toDate(record.otFromDate),
    otToDate: toDate(record.otToDate),
    dayOffFromDate: toDate(record.dayOffFromDate),
    dayOffToDate: toDate(record.dayOffToDate)
  };
}

export function formValuesToIso(values: SalaryCycleFormValues): {
  salaryFromDate: string;
  salaryToDate: string;
  advanceFromDate: string | null;
  advanceToDate: string | null;
  otFromDate: string | null;
  otToDate: string | null;
  dayOffFromDate: string | null;
  dayOffToDate: string | null;
} {
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  return {
    salaryFromDate: values.salaryFromDate!.toISOString(),
    salaryToDate: values.salaryToDate!.toISOString(),
    advanceFromDate: iso(values.advanceFromDate),
    advanceToDate: iso(values.advanceToDate),
    otFromDate: iso(values.otFromDate),
    otToDate: iso(values.otToDate),
    dayOffFromDate: iso(values.dayOffFromDate),
    dayOffToDate: iso(values.dayOffToDate)
  };
}
