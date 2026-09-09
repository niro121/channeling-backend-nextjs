import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

export const OVERTIME_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled'
] as const;

export type OvertimeStatus = (typeof OVERTIME_STATUSES)[number];

export const EXTRA_TIME_TIME_TYPES = ['outTime', 'inTime'] as const;
export type ExtraTimeTimeType = (typeof EXTRA_TIME_TIME_TYPES)[number];

export const DAY_OFF_PH_TYPES = ['DO', 'PH'] as const;
export type DayOffPhType = (typeof DAY_OFF_PH_TYPES)[number];

export const OVERTIME_REQUEST_CODE_PREFIX = 'OT';
export const EXTRA_TIME_CODE_PREFIX = 'AET';
export const EXTRA_SHIFT_NORMAL_CODE_PREFIX = 'ES';

export type OvertimeFilterOption = {
  id: string;
  name: string;
};

export type ExtraTimeListFilters = {
  staffId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
};

export type ExtraTimeRecord = {
  id: string;
  formNumber: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  roster: string;
  shiftId: string;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  timeType: ExtraTimeTimeType;
  fromAt: string;
  toAt: string;
  hours: number;
  approverId: string;
  approverName: string;
  comment: string;
  status: OvertimeStatus | string;
  createdByName: string;
  createdByPosition?: string;
  updatedByName: string;
  updatedByPosition?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

export type ExtraTimePayload = {
  staffId: string;
  shiftDate: Date;
  shiftId?: string | null;
  shiftLabel?: string | null;
  timeType: ExtraTimeTimeType;
  fromAt: Date;
  toAt: Date;
  approverId?: string | null;
  comment?: string | null;
};

export type GetExtraTimeParams = ExtraTimeListFilters & {
  page?: string;
  limit?: string;
};
