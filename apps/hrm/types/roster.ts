import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** `generateRecordCode('SHF')` → SHF-1 */
export const SHIFT_TYPE_CODE_PREFIX = 'SHF';
/** `generateRecordCode('SA')` → SA-1 */
export const SHIFT_ASSIGNMENT_CODE_PREFIX = 'SA';
/** `generateRecordCode('SR')` → SR-1 */
export const SHIFT_ROSTER_CODE_PREFIX = 'SR';
/** `generateRecordCode('RA')` → RA-1 */
export const ROSTER_AMENDMENT_CODE_PREFIX = 'RA';
/** `generateRecordCode('HOL')` → HOL-1 */
export const HOLIDAY_CALENDAR_CODE_PREFIX = 'HOL';

export const SHIFT_TYPE_STATUSES = ['active', 'inactive'] as const;
export type ShiftTypeStatus = (typeof SHIFT_TYPE_STATUSES)[number];

/** Locked Shift Type categories. Independent of Night / Overnight / Holiday *rules*. */
export const SHIFT_TYPE_CATEGORIES = [
  'General',
  'Nursing',
  'Emergency',
  'Rotational',
  'Night',
  'Overnight',
  'Holiday'
] as const;
export type ShiftTypeCategory = (typeof SHIFT_TYPE_CATEGORIES)[number];

export const SHIFT_ASSIGNMENT_STATUSES = [
  'active',
  'pending',
  'inactive'
] as const;
export type ShiftAssignmentStatus = (typeof SHIFT_ASSIGNMENT_STATUSES)[number];

export const SHIFT_ROSTER_PERIOD_STATUSES = ['draft', 'published'] as const;
export type ShiftRosterPeriodStatus =
  (typeof SHIFT_ROSTER_PERIOD_STATUSES)[number];

export const ROSTER_ALLOCATION_STATUSES = [
  'draft',
  'published',
  'amended'
] as const;
export type RosterAllocationStatus = (typeof ROSTER_ALLOCATION_STATUSES)[number];

export const ROSTER_AMENDMENT_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected'
] as const;
export type RosterAmendmentStatus = (typeof ROSTER_AMENDMENT_STATUSES)[number];

export const ROSTER_AMENDMENT_TYPES = [
  'shift_change',
  'shift_swap',
  'staff_replacement',
  'duty_cancellation',
  'location_change',
  'extra_duty'
] as const;
export type RosterAmendmentType = (typeof ROSTER_AMENDMENT_TYPES)[number];

export const DUTY_ATTENDANCE_VALUES = ['present', 'late', 'absent'] as const;
export type DutyAttendance = (typeof DUTY_ATTENDANCE_VALUES)[number];

export const DUTY_ATTENDANCE_OPTIONS: RosterFilterOption[] = [
  { id: 'present', name: 'Present' },
  { id: 'late', name: 'Late' },
  { id: 'absent', name: 'Absent' }
];

export const DUTY_ALLOCATION_STATUS_OPTIONS: RosterFilterOption[] =
  ROSTER_ALLOCATION_STATUSES.map((id) => ({
    id,
    name: id === 'draft' ? 'Draft' : id === 'published' ? 'Published' : 'Amended'
  }));

export const OVERNIGHT_ALLOCATION_DATES = ['shift_start', 'shift_end', 'split_both'] as const;
export type OvernightAllocationDate =
  (typeof OVERNIGHT_ALLOCATION_DATES)[number];

export const HOLIDAY_TYPES = ['poya', 'mercantile', 'public'] as const;
export type HolidayTypeId = (typeof HOLIDAY_TYPES)[number];

export const HOLIDAY_PAY_RATES = ['1.50', '2.00', '2.50'] as const;
export type HolidayPayRate = (typeof HOLIDAY_PAY_RATES)[number];

export type RosterFilterOption = {
  id: string;
  name: string;
};

export const SHIFT_TYPE_CATEGORY_OPTIONS: RosterFilterOption[] =
  SHIFT_TYPE_CATEGORIES.map((name) => ({
    id: name.toLowerCase(),
    name
  }));

export const SHIFT_TYPE_STATUS_OPTIONS: RosterFilterOption[] = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' }
];

export const ROSTER_YES_NO_OPTIONS: RosterFilterOption[] = [
  { id: 'yes', name: 'Yes' },
  { id: 'no', name: 'No' }
];

export type RosterAuditFields = {
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

/* ---------------------------------
Shift Type
--------------------------------- */

export type ShiftTypeRecord = RosterAuditFields & {
  id: string;
  code: string;
  name: string;
  category: string;
  chipLabel: string | null;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  durationHours: number;
  graceMinutes: number;
  lateThresholdMinutes: number;
  earlyExitThresholdMinutes: number;
  isNightShift: boolean;
  isOvernight: boolean;
  holidayEligible: boolean;
  status: ShiftTypeStatus | string;
};

export type ShiftTypePayload = {
  name: string;
  category?: string | null;
  chipLabel?: string | null;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  durationHours?: number;
  graceMinutes?: number;
  lateThresholdMinutes?: number;
  earlyExitThresholdMinutes?: number;
  isNightShift?: boolean;
  isOvernight?: boolean;
  holidayEligible?: boolean;
  status?: ShiftTypeStatus | string;
};

export type GetShiftTypesParams = {
  page?: string;
  limit?: string;
  search?: string;
  code?: string;
  name?: string;
  category?: string;
  status?: string;
  nightShift?: string;
  overnight?: string;
  holidayEligible?: string;
};

export type ShiftTypeFormValues = {
  code: string;
  name: string;
  categoryId: string;
  startTime: string;
  endTime: string;
  breakMinutes: string;
  durationHours: string;
  graceMinutes: string;
  lateThresholdMinutes: string;
  earlyExitThresholdMinutes: string;
  isOvernight: boolean;
  isNightShift: boolean;
  holidayEligible: boolean;
  isActive: boolean;
};

export type ShiftTypeSummary = {
  total: number;
  categories: number;
  active: number;
  nightOrOvernight: number;
  holidayEligible: number;
};

export type ShiftTypeHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

/* ---------------------------------
Shift Assignment (standing rule)
--------------------------------- */

export type ShiftAssignmentRecord = RosterAuditFields & {
  id: string;
  code: string;
  staffId: string;
  shiftTypeId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  designation: string;
  rotationPattern: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  weeklyOffDay: string;
  autoAssign: boolean;
  status: ShiftAssignmentStatus | string;
  shiftTypeName?: string;
};

export type ShiftAssignmentPayload = {
  staffId: string;
  shiftTypeId: string;
  rotationPattern?: string | null;
  effectiveFrom: Date | string;
  effectiveTo?: Date | string | null;
  weeklyOffDay?: string | null;
  autoAssign?: boolean;
  status?: ShiftAssignmentStatus | string;
};

export const SHIFT_ASSIGNMENT_ROTATION_PATTERNS = [
  { id: 'fixed', name: 'Fixed' },
  { id: '2-shift', name: '2-Shift Rotation' },
  { id: '3-shift', name: '3-Shift Rotation' },
  { id: '4-on-2-off', name: '4 On 2 Off' },
  { id: 'weekly', name: 'Weekly Rotation' },
  { id: 'custom', name: 'Custom' }
] as const;

export const SHIFT_ASSIGNMENT_WEEKLY_OFF_DAYS = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' }
] as const;

export const SHIFT_ASSIGNMENT_STATUS_OPTIONS: RosterFilterOption[] = [
  { id: 'active', name: 'Active' },
  { id: 'pending', name: 'Pending' },
  { id: 'inactive', name: 'Inactive' }
];

export type ShiftAssignmentFormValues = {
  staffId: string;
  shiftTypeId: string;
  rotationPatternId: string;
  effectiveFrom: Date | null;
  effectiveTo: Date | null;
  weeklyOffDayId: string;
  status: string;
  autoAssign: boolean;
};

export type ShiftAssignmentSummary = {
  assignedStaff: number;
  activeStaffTotal: number;
  unassigned: number;
  rotationPatterns: number;
  expiringSoon: number;
};

export type ShiftAssignmentHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type ShiftAssignmentFilterOptions = {
  institutions: RosterFilterOption[];
  departments: RosterFilterOption[];
  units: RosterFilterOption[];
  designations: RosterFilterOption[];
  staffCategories: RosterFilterOption[];
  staffGrades: RosterFilterOption[];
  employeeStatuses: RosterFilterOption[];
};

export type GetShiftAssignmentsParams = {
  page?: string;
  limit?: string;
  staffId?: string;
  shiftTypeId?: string;
  institution?: string;
  department?: string;
  unit?: string;
  designation?: string;
  staffCategory?: string;
  staffGrade?: string;
  employeeStatus?: string;
  status?: string;
  search?: string;
};

/* ---------------------------------
Shift Roster period header
--------------------------------- */

export type ShiftRosterRecord = RosterAuditFields & {
  id: string;
  code: string;
  name: string;
  department: string;
  unit: string;
  roster: string;
  fromDate: string;
  toDate: string;
  status: ShiftRosterPeriodStatus | string;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type ShiftRosterPayload = {
  name?: string | null;
  department?: string | null;
  unit?: string | null;
  roster?: string | null;
  fromDate: Date | string;
  toDate: Date | string;
};

export type GetShiftRostersParams = {
  page?: string;
  limit?: string;
  department?: string;
  unit?: string;
  roster?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
};

/* ---------------------------------
Roster Allocation (the store)
--------------------------------- */

export type RosterAllocationRecord = RosterAuditFields & {
  id: string;
  shiftRosterId: string;
  staffId: string;
  shiftTypeId: string;
  date: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  roster: string;
  status: RosterAllocationStatus | string;
  isLeave: boolean;
  hours: number;
  otHours: number;
  dutyLocation: string;
  supervisorId: string | null;
  supervisorName: string;
  attendance: DutyAttendance | string | null;
  comments: string;
  startAt: string | null;
  endAt: string | null;
  day1Hours: number | null;
  day2Hours: number | null;
  totalHours: number | null;
  attendanceAllocation: OvernightAllocationDate | string | null;
  nightHours: number | null;
  nightOt: number | null;
  nightAllowance: number | null;
  mealAllowance: number | null;
  holidayId: string | null;
  payRate: HolidayPayRate | string | null;
  holidayAllowance: number | null;
  grantLieuLeave: boolean;
  sendToPayroll: boolean;
  shiftTypeName?: string;
  holidayName?: string;
};

export type RosterAllocationPayload = {
  shiftRosterId: string;
  staffId: string;
  shiftTypeId: string;
  date: Date | string;
  isLeave?: boolean;
  hours?: number;
  otHours?: number;
  dutyLocation?: string | null;
  supervisorId?: string | null;
  supervisorName?: string | null;
  attendance?: DutyAttendance | string | null;
  comments?: string | null;
  startAt?: Date | string | null;
  endAt?: Date | string | null;
  day1Hours?: number | null;
  day2Hours?: number | null;
  totalHours?: number | null;
  attendanceAllocation?: OvernightAllocationDate | string | null;
  nightHours?: number | null;
  nightOt?: number | null;
  nightAllowance?: number | null;
  mealAllowance?: number | null;
  holidayId?: string | null;
  payRate?: HolidayPayRate | string | null;
  holidayAllowance?: number | null;
  grantLieuLeave?: boolean;
  sendToPayroll?: boolean;
};

export type GetRosterAllocationsParams = {
  page?: string;
  limit?: string;
  shiftRosterId?: string;
  staffId?: string;
  shiftTypeId?: string;
  department?: string;
  unit?: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  status?: string;
  nightShift?: string;
  overnight?: string;
  holidayId?: string;
  search?: string;
};

/* ---------------------------------
Shift Roster grid (D4 — Load Roster)
--------------------------------- */

export type ShiftCell = {
  allocationId: string;
  shiftTypeId: string;
  code: string;
  label: string;
  timeRange: string;
  isLeave: boolean;
  hours: number;
  otHours: number;
  status: RosterAllocationStatus | string;
  comments?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

export type RosterStaffRow = {
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  designation: string;
  shifts: Record<string, ShiftCell | null>;
  totalHours: number;
  otHours: number;
  status: 'published' | 'draft' | 'amended' | 'none';
};

export type RosterGridSummary = {
  staffRostered: number;
  departments: number;
  shiftsThisWeek: number;
  totalHours: number;
  conflicts: number;
};

export type RosterFilterOptions = {
  departments: RosterFilterOption[];
  units: RosterFilterOption[];
  rosters: RosterFilterOption[];
};

export type ShiftTypeChip = {
  id: string;
  code: string;
  name: string;
  timeRange: string;
  durationHours: number;
};

export type LoadRosterParams = {
  department?: string;
  unit?: string;
  roster?: string;
  fromDate: string;
  toDate: string;
  search?: string;
  page?: string;
  limit?: string;
};

export type ShiftRosterPeriodAudit = {
  createdByLabel: string;
  createdAt: string | null;
  updatedByLabel: string;
  updatedAt: string | null;
  publishedLabel: string | null;
};

export type LoadRosterResult = {
  rows: RosterStaffRow[];
  totalRecords: number;
  summary: RosterGridSummary;
  filterOptions: RosterFilterOptions;
  shiftTypes: ShiftTypeChip[];
  weekLabel: string;
  weekRangeShort: string;
  dayIsos: string[];
  periodAudit: ShiftRosterPeriodAudit | null;
};

export type SaveRosterAllocationDraftPayload = {
  allocationId?: string;
  staffId: string;
  shiftTypeId: string;
  rosterDate: Date | string;
  periodFromDate: Date | string;
  periodToDate: Date | string;
  department?: string | null;
  unit?: string | null;
  designation?: string | null;
  roster?: string | null;
  isLeave?: boolean;
  otHours?: number;
  comments?: string | null;
  dutyLocation?: string | null;
  supervisorId?: string | null;
  attendance?: DutyAttendance | string | null;
};

/* ---------------------------------
Duty Roster (D7 — same RosterAllocation store)
--------------------------------- */

export type DutyRosterRow = RosterAuditFields & {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  shiftTypeId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  dutyLocation: string;
  wardUnit: string;
  department: string;
  roster: string;
  supervisorId: string | null;
  supervisorName: string;
  status: RosterAllocationStatus | string;
  attendance: DutyAttendance | string | null;
  comments: string;
  isLeave: boolean;
  date: string;
};

export type DutyRosterSummary = {
  onDutyToday: number;
  present: number;
  lateArrivals: number;
  unfilledDuties: number;
};

export const DUTY_ROSTER_VIEW_MODES = ['daily', 'weekly', 'monthly'] as const;
export type DutyRosterViewMode = (typeof DUTY_ROSTER_VIEW_MODES)[number];

export type DutyRosterFilterOptions = {
  departments: RosterFilterOption[];
  units: RosterFilterOption[];
  rosters: RosterFilterOption[];
  shifts: RosterFilterOption[];
};

export type DutyRosterShiftOption = RosterFilterOption & {
  startTime: string;
  endTime: string;
};

export type DutyRosterStaffOption = RosterFilterOption & {
  staffCode: string;
  dutyLocation: string;
  wardUnit: string;
};

export type DutyRosterFormOptions = {
  staff: DutyRosterStaffOption[];
  shiftTypes: DutyRosterShiftOption[];
  supervisors: RosterFilterOption[];
  locations: RosterFilterOption[];
  units: RosterFilterOption[];
};

export type DutyRosterFormValues = {
  staffId: string;
  otherStaffId: string;
  shiftTypeId: string;
  dutyDate: Date | null;
  startTime: string;
  endTime: string;
  dutyLocation: string;
  wardUnit: string;
  supervisorId: string;
  attendance: string;
  comments: string;
};

export type GetDutyRosterParams = {
  page?: string;
  limit?: string;
  department?: string;
  unit?: string;
  roster?: string;
  shiftTypeId?: string;
  dutyDate?: string;
  view?: DutyRosterViewMode | string;
  search?: string;
};

export type DutyRosterHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type SwapDutyPayload = {
  allocationId?: string;
  staffId: string;
  otherStaffId: string;
  dutyDate: Date | string;
};

export type ReplaceDutyPayload = {
  allocationId?: string;
  staffId: string;
  replacementStaffId: string;
  dutyDate: Date | string;
};

export type UpdateDutyAttendancePayload = {
  allocationId: string;
  attendance: DutyAttendance | string | null;
};

export type ToggleRosterAllocationLeavePayload = {
  allocationId: string;
  isLeave: boolean;
};

/* ---------------------------------
Roster Amendment
--------------------------------- */

export type RosterAmendmentRecord = RosterAuditFields & {
  id: string;
  code: string;
  staffId: string;
  dutyDate: string;
  originalShiftTypeId: string;
  amendedShiftTypeId: string | null;
  amendmentType: RosterAmendmentType | string;
  staffCode: string;
  staffName: string;
  department: string;
  originalShiftLabel: string;
  amendedShiftLabel: string;
  swapStaffId: string | null;
  swapStaffName: string;
  dutyLocation: string;
  reason: string;
  remarks: string;
  requestedById: string | null;
  requestedByName: string;
  decidedById: string | null;
  decidedAt: string | null;
  status: RosterAmendmentStatus | string;
};

export type RosterAmendmentPayload = {
  staffId: string;
  dutyDate: Date | string;
  originalShiftTypeId: string;
  amendedShiftTypeId?: string | null;
  amendmentType: RosterAmendmentType | string;
  swapStaffId?: string | null;
  dutyLocation?: string | null;
  reason?: string | null;
  remarks?: string | null;
  requestedById?: string | null;
  status?: RosterAmendmentStatus | string;
};

export type GetRosterAmendmentsParams = {
  page?: string;
  limit?: string;
  amendmentNo?: string;
  staffSearch?: string;
  staffId?: string;
  department?: string;
  amendmentType?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  requestedById?: string;
  search?: string;
};

export type RosterAmendmentSummary = {
  totalAmendments: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
};

export type RosterAmendmentFilterOptions = {
  departments: RosterFilterOption[];
  amendmentTypes: RosterFilterOption[];
  statuses: RosterFilterOption[];
  requesters: RosterFilterOption[];
};

export type RosterAmendmentStaffOption = RosterFilterOption & {
  staffCode: string;
  department: string;
  originalShiftTypeId: string;
  originalShiftLabel: string;
};

export type RosterAmendmentFormOptions = {
  staff: RosterAmendmentStaffOption[];
  replacementStaff: RosterFilterOption[];
  shiftTypes: RosterFilterOption[];
  amendmentTypes: RosterFilterOption[];
  statuses: RosterFilterOption[];
  requesters: RosterFilterOption[];
};

export type RosterAmendmentHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type RosterAmendmentAllocationLookup = {
  allocationId: string;
  originalShiftTypeId: string;
  originalShiftLabel: string;
  department: string;
  status: RosterAllocationStatus | string;
} | null;

export function isRosterAmendmentLocked(
  status: RosterAmendmentStatus | string
): boolean {
  return status === 'approved' || status === 'rejected';
}

export const ROSTER_AMENDMENT_TYPE_OPTIONS: RosterFilterOption[] = [
  { id: 'shift_change', name: 'Shift Change' },
  { id: 'shift_swap', name: 'Shift Swap' },
  { id: 'staff_replacement', name: 'Staff Replacement' },
  { id: 'duty_cancellation', name: 'Duty Cancellation' },
  { id: 'location_change', name: 'Location Change' },
  { id: 'extra_duty', name: 'Extra Duty' }
];

export const ROSTER_AMENDMENT_STATUS_OPTIONS: RosterFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' }
];

/* ---------------------------------
Night Shifts (D9 — derived from RosterAllocation)
--------------------------------- */

export const CONSECUTIVE_NIGHT_LIMIT = 3;

export type NightShiftRecord = RosterAuditFields & {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  shiftDate: string;
  shiftTypeId: string;
  nightShift: string;
  startTime: string;
  endTime: string;
  nightHours: number;
  nightOt: number;
  nightAllowance: number;
  mealAllowance: number;
  consecutiveNights: number;
  payrollReady: boolean;
  status: RosterAllocationStatus | string;
  remarks: string;
};

export type NightShiftSummary = {
  nightShiftsThisCycle: number;
  cycleLabel: string;
  staffOnNightDuty: number;
  staffUnitsLabel: string;
  nightAllowancePayable: string;
  consecutiveNightAlerts: number;
};

export type GetNightShiftsParams = {
  page?: string;
  limit?: string;
  fromDate?: string;
  toDate?: string;
  department?: string;
  unit?: string;
  shiftTypeId?: string;
  staffSearch?: string;
  status?: string;
  search?: string;
};

export type NightShiftPayload = {
  staffId: string;
  shiftTypeId: string;
  shiftDate: Date | string;
  nightHours?: number | null;
  nightOt?: number | null;
  nightAllowance?: number | null;
  mealAllowance?: number | null;
  sendToPayroll?: boolean;
  remarks?: string | null;
};

export type NightShiftFilterOptions = {
  departments: RosterFilterOption[];
  units: RosterFilterOption[];
  shiftTypes: RosterFilterOption[];
  statuses: RosterFilterOption[];
};

export type NightShiftTypeFormOption = RosterFilterOption & {
  startTime: string;
  endTime: string;
  nightHours: string;
  nightAllowance: string;
  mealAllowance: string;
};

export type NightShiftFormOptions = {
  staff: RosterFilterOption[];
  shiftTypes: NightShiftTypeFormOption[];
};

export type NightShiftHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export const NIGHT_SHIFT_STATUS_OPTIONS: RosterFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'published', name: 'Published' },
  { id: 'amended', name: 'Amended' }
];

export function exceedsConsecutiveNightPolicy(nights: number): boolean {
  return nights > CONSECUTIVE_NIGHT_LIMIT;
}

/* ---------------------------------
Overnight Shifts (derived register)
--------------------------------- */

export type OvernightShiftRecord = RosterAuditFields & {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  shiftTypeId: string;
  overnightShift: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  day1Hours: number;
  day2Hours: number;
  totalHours: number;
  attendanceAllocation: OvernightAllocationDate;
  attendanceDate: string;
  overnightOt: number;
  overnightAllowance: number;
  payrollReady: boolean;
  autoSplit: boolean;
  status: RosterAllocationStatus | string;
  remarks: string;
};

export type OvernightShiftSummary = {
  overnightShifts: number;
  cycleLabel: string;
  crossMidnightHours: number;
  overnightOtHours: number;
  allocationConflicts: number;
};

export type GetOvernightShiftsParams = {
  page?: string;
  limit?: string;
  fromDate?: string;
  toDate?: string;
  department?: string;
  unit?: string;
  shiftTypeId?: string;
  allocationDate?: string;
  staffSearch?: string;
  status?: string;
  search?: string;
};

export type OvernightShiftPayload = {
  staffId: string;
  shiftTypeId: string;
  startDate: Date | string;
  endDate: Date | string;
  startTime: string;
  endTime: string;
  day1Hours?: number | null;
  day2Hours?: number | null;
  totalHours?: number | null;
  attendanceAllocation?: OvernightAllocationDate;
  overnightOt?: number | null;
  overnightAllowance?: number | null;
  autoSplit?: boolean;
  sendToPayroll?: boolean;
  remarks?: string | null;
};

export type OvernightShiftFilterOptions = {
  departments: RosterFilterOption[];
  units: RosterFilterOption[];
  shiftTypes: RosterFilterOption[];
  allocationOptions: RosterFilterOption[];
  statuses: RosterFilterOption[];
};

export type OvernightShiftTypeFormOption = RosterFilterOption & {
  startTime: string;
  endTime: string;
  allowance: string;
};

export type OvernightShiftFormOptions = {
  staff: RosterFilterOption[];
  shiftTypes: OvernightShiftTypeFormOption[];
};

export type OvernightShiftHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export const OVERNIGHT_SHIFT_STATUS_OPTIONS: RosterFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'published', name: 'Published' },
  { id: 'amended', name: 'Amended' }
];

export const OVERNIGHT_ALLOCATION_OPTIONS: RosterFilterOption[] = [
  { id: 'shift_start', name: 'Shift Start Date' },
  { id: 'shift_end', name: 'Shift End Date' },
  { id: 'split_both', name: 'Split Across Both Days' }
];

/* ---------------------------------
Holiday Calendar (v1 stub)
--------------------------------- */

export type HolidayCalendarRecord = RosterAuditFields & {
  id: string;
  code: string;
  name: string;
  typeId: HolidayTypeId | string;
  date: string;
};

export type HolidayCalendarPayload = {
  name: string;
  typeId: HolidayTypeId | string;
  date: Date | string;
};

export type GetHolidayCalendarParams = {
  page?: string;
  limit?: string;
  typeId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
};
