import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';
import type { HolidayTypeId } from '@/types/roster';

export { HOLIDAY_TYPES, type HolidayTypeId } from '@/types/roster';

export type HolidayCalendarAuditUser = {
  name: string;
  role?: string;
};

/** Client list/detail record for Holiday Calendar UI. */
export type HolidayCalendarUiRecord = {
  id: string;
  code: string;
  name: string;
  typeId: HolidayTypeId | string;
  /** ISO date string; use first 10 chars (yyyy-MM-dd) for display. */
  date: string;
  createdAt: string;
  updatedAt: string;
  createdByUser: HolidayCalendarAuditUser;
  updatedByUser: HolidayCalendarAuditUser;
  allocationCount: number;
};

export type HolidayCalendarFormValues = {
  name: string;
  typeId: string;
  date: Date | null;
};

export type HolidayCalendarTypeOption = {
  id: HolidayTypeId | string;
  name: string;
};

export type HolidayCalendarPayload = {
  name: string;
  typeId: HolidayTypeId | string;
  date: Date | string;
};

export type GetHolidayCalendarParams = {
  year?: string | number;
  typeId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
};

export type HolidayCalendarServiceRecord = {
  id: string;
  code: string;
  name: string;
  typeId: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
  allocationCount: number;
};
