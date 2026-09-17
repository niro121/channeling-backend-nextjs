import type { AuthUserSummary } from '@/lib/helpers/resolve-auth-users.helper';

/** `generateRecordCode('ATD')` → ATD-1 */
export const ATTENDANCE_DEVICE_CODE_PREFIX = 'ATD';

export const ATTENDANCE_DEVICE_STATUSES = ['active', 'inactive'] as const;
export type AttendanceDeviceStatus = (typeof ATTENDANCE_DEVICE_STATUSES)[number];

export const ATTENDANCE_PUNCH_DIRECTIONS = ['in', 'out', 'unknown'] as const;
export type AttendancePunchDirection = (typeof ATTENDANCE_PUNCH_DIRECTIONS)[number];

export const ATTENDANCE_PUNCH_SOURCES = ['device', 'manual', 'import'] as const;
export type AttendancePunchSource = (typeof ATTENDANCE_PUNCH_SOURCES)[number];

export const ATTENDANCE_PUNCH_MATCH_STATUSES = [
  'matched',
  'unmatched',
  'inactive_staff'
] as const;
export type AttendancePunchMatchStatus = (typeof ATTENDANCE_PUNCH_MATCH_STATUSES)[number];

export const ATTENDANCE_DAY_STATUSES = [
  'present',
  'late',
  'absent',
  'missing_punch',
  'on_leave',
  'not_rostered'
] as const;
export type AttendanceDayStatus = (typeof ATTENDANCE_DAY_STATUSES)[number];

export const ATTENDANCE_DAY_FLAGS = [
  'missing_in',
  'missing_out',
  'early_exit',
  'exception'
] as const;
export type AttendanceDayFlag = (typeof ATTENDANCE_DAY_FLAGS)[number];

/** Default local test device when no hardware is registered yet. */
export const DEFAULT_ATTENDANCE_DEVICE_CODE = 'DEV-LOCAL';

export type GetAttendanceDevicesParams = {
  page?: string;
  limit?: string;
  code?: string;
  name?: string;
  location?: string;
  status?: string;
};

export type AttendanceDeviceRecord = {
  id: string;
  code: string;
  name: string;
  location: string;
  status: AttendanceDeviceStatus | string;
  lastSeenAt: string | null;
  /** True when a per-device API key hash is stored (hash never returned). */
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type AttendanceDeviceSummary = {
  total: number;
  active: number;
  inactive: number;
  seenRecently: number;
};

export type AttendanceDevicePayload = {
  code?: string;
  name: string;
  location?: string;
  status?: AttendanceDeviceStatus | string;
  /** Plaintext key — hashed server-side; empty string clears the key. */
  apiKey?: string | null;
};

export type AttendancePunchIngestPayload = {
  deviceCode: string;
  externalPunchId: string;
  rfid: string;
  punchedAt: string | Date;
  direction?: AttendancePunchDirection | string;
  source?: AttendancePunchSource | string;
  rawPayload?: unknown;
};

export type AttendancePunchRecord = {
  id: string;
  deviceId: string;
  deviceCode: string;
  externalPunchId: string;
  rfid: string;
  staffId: string | null;
  punchedAt: string;
  direction: AttendancePunchDirection | string;
  source: AttendancePunchSource | string;
  matchStatus: AttendancePunchMatchStatus | string;
};

export type AttendanceDayRecord = {
  id: string;
  staffId: string;
  date: string;
  staffCode: string;
  staffName: string;
  department: string;
  location: string;
  firstInAt: string | null;
  lastOutAt: string | null;
  verifiedFirstInAt: string | null;
  verifiedLastOutAt: string | null;
  status: AttendanceDayStatus | string;
  flags: string[];
  shiftTypeId: string | null;
  rosterAllocationId: string | null;
  confirmedToRosterAt: string | null;
  correctionReason: string;
};

/** Live-row badge on RFID Attendance (UI), derived from day status/flags. */
export const RFID_LIVE_STATUS_LABELS = [
  'In',
  'Late',
  'Missing Out',
  'Missing In',
  'Absent',
  'Leave',
  'Exception'
] as const;
export type RfidLiveStatusLabel = (typeof RFID_LIVE_STATUS_LABELS)[number];

export type RfidAttendanceFilters = {
  department?: string;
  location?: string;
  date?: string; // yyyy-MM-dd Colombo
  shiftTypeId?: string;
  staffId?: string;
};

export type RfidAttendanceSummary = {
  present: number;
  presentPct: number | null;
  late: number;
  lateAfterLabel: string | null;
  missingPunches: number;
  absent: number;
  absentPct: number | null;
  exceptions: number;
  rosteredTotal: number;
};

export type RfidLiveCheckInRow = {
  id: string;
  staffId: string | null;
  staffCode: string;
  staffName: string;
  department: string;
  timeLabel: string;
  punchedAt: string | null;
  statusLabel: RfidLiveStatusLabel;
  avatarInitials: string;
};

export type RfidFilterOption = {
  id: string;
  name: string;
};

export const ATTENDANCE_DEVICE_STATUS_OPTIONS: RfidFilterOption[] = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' }
];

export type RfidAttendanceDashboard = {
  date: string;
  dateLabel: string;
  activeReaderCount: number;
  streaming: boolean;
  summary: RfidAttendanceSummary;
  liveRows: RfidLiveCheckInRow[];
  filterOptions: {
    departments: RfidFilterOption[];
    locations: RfidFilterOption[];
    shifts: RfidFilterOption[];
    staff: RfidFilterOption[];
  };
};

/* ---------------------------------
Daily Attendance register
--------------------------------- */

export const DAILY_ATTENDANCE_STATUS_OPTIONS: RfidFilterOption[] = [
  { id: 'present', name: 'Present' },
  { id: 'absent', name: 'Absent' },
  { id: 'late', name: 'Late' },
  { id: 'early_out', name: 'Early Out' },
  { id: 'half_day', name: 'Half Day' },
  { id: 'leave', name: 'Leave' },
  { id: 'holiday', name: 'Holiday' },
  { id: 'day_off', name: 'Day Off' },
  { id: 'missing_punch', name: 'Missing Punch' },
  { id: 'incomplete', name: 'Incomplete' }
];

export type DailyAttendanceDisplayStatus =
  (typeof DAILY_ATTENDANCE_STATUS_OPTIONS)[number]['id'];

export type GetDailyAttendanceParams = {
  page?: string;
  limit?: string;
  date?: string; // yyyy-MM-dd Colombo
  institution?: string;
  department?: string;
  room?: string;
  staffCategory?: string;
  designation?: string;
  staffId?: string;
  shiftTypeId?: string;
  status?: string;
};

export type DailyAttendanceSummary = {
  present: number;
  presentPct: number | null;
  absent: number;
  absentPct: number | null;
  lateEarlyOut: number;
  lateCount: number;
  earlyOutCount: number;
  missingPunches: number;
  rosteredTotal: number;
};

export type DailyAttendanceRow = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  date: string;
  dateLabel: string;
  scheduledShift: string;
  shiftStart: string;
  shiftEnd: string;
  checkIn: string;
  checkOut: string;
  totalHours: string;
  late: string;
  earlyOut: string;
  overtime: string;
  status: string;
  statusLabel: string;
  source: string;
  remarks: string;
};

export type DailyAttendanceFilterOptions = {
  institutions: RfidFilterOption[];
  departments: RfidFilterOption[];
  rooms: RfidFilterOption[];
  staffCategories: RfidFilterOption[];
  designations: RfidFilterOption[];
  staff: RfidFilterOption[];
  shifts: RfidFilterOption[];
  statuses: RfidFilterOption[];
};

export type DailyAttendanceRegister = {
  date: string;
  dateLabel: string;
  summary: DailyAttendanceSummary;
  rows: DailyAttendanceRow[];
  totalRecords: number;
  filterOptions: DailyAttendanceFilterOptions;
};

/* ---------------------------------
Attendance Summary (period aggregate)
--------------------------------- */

export type GetAttendanceSummaryParams = {
  page?: string;
  limit?: string;
  fromDate?: string;
  toDate?: string;
  institution?: string;
  department?: string;
  room?: string;
  staffCategory?: string;
  designation?: string;
  staffId?: string;
  shiftTypeId?: string;
};

export type AttendanceSummaryCards = {
  totalStaff: number;
  present: number;
  presentPct: number | null;
  absent: number;
  absentPct: number | null;
  late: number;
  leave: number;
  dayOff: number;
  holiday: number;
  missingAttendance: number;
  overtimeHours: number;
};

export type AttendanceSummaryRow = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  holidayDays: number;
  dayOffDays: number;
  lateCount: number;
  earlyOutCount: number;
  overtimeHours: number;
  missingPunches: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdUser: AuthUserSummary | null;
  updatedUser: AuthUserSummary | null;
};

export type AttendanceSummaryDetailDay = {
  date: string;
  dateLabel: string;
  status: string;
  statusLabel: string;
  checkIn: string;
  checkOut: string;
  scheduledShift: string;
  remarks: string;
};

export type AttendanceSummaryDetail = {
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  fromDate: string;
  toDate: string;
  periodLabel: string;
  totals: Omit<
    AttendanceSummaryRow,
    | 'id'
    | 'staffId'
    | 'staffCode'
    | 'staffName'
    | 'department'
    | 'createdAt'
    | 'updatedAt'
    | 'createdBy'
    | 'updatedBy'
    | 'createdUser'
    | 'updatedUser'
  >;
  days: AttendanceSummaryDetailDay[];
};

export type AttendanceSummaryFilterOptions = {
  institutions: RfidFilterOption[];
  departments: RfidFilterOption[];
  rooms: RfidFilterOption[];
  staffCategories: RfidFilterOption[];
  designations: RfidFilterOption[];
  staff: RfidFilterOption[];
  shifts: RfidFilterOption[];
};

export type AttendanceSummaryRegister = {
  fromDate: string;
  toDate: string;
  periodLabel: string;
  cards: AttendanceSummaryCards;
  rows: AttendanceSummaryRow[];
  totalRecords: number;
  filterOptions: AttendanceSummaryFilterOptions;
};

/* ---------------------------------
Fingerprint Verification
--------------------------------- */

export const FINGERPRINT_VERIFICATION_MODES = ['roster', 'staff'] as const;
export type FingerprintVerificationMode =
  (typeof FINGERPRINT_VERIFICATION_MODES)[number];

export const FINGERPRINT_ROW_STATUSES = [
  'ok',
  'missing',
  'late',
  'early_out'
] as const;
export type FingerprintRowStatus = (typeof FINGERPRINT_ROW_STATUSES)[number];

export type GetFingerprintVerificationParams = {
  mode?: FingerprintVerificationMode | string;
  fromDate?: string;
  toDate?: string;
  shiftRosterId?: string;
  staffId?: string;
};

export type FingerprintVerificationSummary = {
  verified: number;
  late: number;
  missingPunch: number;
  earlyOut: number;
};

export type FingerprintVerificationRow = {
  /** Stable client key: allocationId or attendanceDayId */
  rowKey: string;
  attendanceDayId: string | null;
  rosterAllocationId: string | null;
  staffId: string;
  date: string;
  dateLabel: string;
  no: number;
  shiftLabel: string;
  durationMinutes: number;
  staffCode: string;
  staffLegacyId: string;
  leaveReplace: string;
  staffName: string;
  attStart: string;
  attEnd: string;
  exceptionCode: string;
  verifiedStart: string;
  verifiedEnd: string;
  status: FingerprintRowStatus | string;
  statusLabel: string;
  shiftStartTime: string;
  shiftEndTime: string;
  graceMinutes: number;
  earlyExitThresholdMinutes: number;
};

export type FingerprintVerificationFilterOptions = {
  rosters: RfidFilterOption[];
  staff: RfidFilterOption[];
};

export type FingerprintVerificationWorkspace = {
  mode: FingerprintVerificationMode;
  fromDate: string;
  toDate: string;
  summary: FingerprintVerificationSummary;
  rows: FingerprintVerificationRow[];
  filterOptions: FingerprintVerificationFilterOptions;
};

export type FingerprintVerificationSaveRow = {
  rowKey: string;
  attendanceDayId?: string | null;
  rosterAllocationId?: string | null;
  staffId: string;
  date: string;
  attStart?: string | null;
  attEnd?: string | null;
  verifiedStart?: string | null;
  verifiedEnd?: string | null;
  clearVerified?: boolean;
};

/* ---------------------------------
Attendance Corrections
--------------------------------- */

/** `generateRecordCode('COR')` → COR-1 */
export const ATTENDANCE_CORRECTION_CODE_PREFIX = 'COR';

export const ATTENDANCE_CORRECTION_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled'
] as const;
export type AttendanceCorrectionStatus =
  (typeof ATTENDANCE_CORRECTION_STATUSES)[number];

export const ATTENDANCE_CORRECTION_STATUS_OPTIONS: RfidFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'cancelled', name: 'Cancelled' }
];

/** Statuses HR can set on a corrected day. */
export const ATTENDANCE_CORRECTION_DAY_STATUS_OPTIONS: RfidFilterOption[] = [
  { id: 'present', name: 'Present' },
  { id: 'absent', name: 'Absent' },
  { id: 'late', name: 'Late' },
  { id: 'early_out', name: 'Early Out' },
  { id: 'half_day', name: 'Half Day' },
  { id: 'leave', name: 'Leave' },
  { id: 'missing_punch', name: 'Missing Punch' },
  { id: 'incomplete', name: 'Incomplete' }
];

/** Filter: attendance day statuses (system / original). */
export const ATTENDANCE_CORRECTION_ATTENDANCE_STATUS_OPTIONS: RfidFilterOption[] =
  [
    { id: 'present', name: 'Present' },
    { id: 'late', name: 'Late' },
    { id: 'absent', name: 'Absent' },
    { id: 'missing_punch', name: 'Missing Punch' },
    { id: 'on_leave', name: 'On Leave' }
  ];

export type AttendanceAuditFields = {
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdUser?: AuthUserSummary | null;
  updatedUser?: AuthUserSummary | null;
};

export type AttendanceCorrectionRecord = AttendanceAuditFields & {
  id: string;
  code: string;
  staffId: string;
  date: string;
  attendanceDayId: string | null;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  originalFirstInAt: string | null;
  originalLastOutAt: string | null;
  originalFirstInLabel: string;
  originalLastOutLabel: string;
  originalStatus: string;
  correctedFirstInAt: string | null;
  correctedLastOutAt: string | null;
  correctedFirstInLabel: string;
  correctedLastOutLabel: string;
  correctedStatus: string;
  reason: string;
  status: AttendanceCorrectionStatus | string;
  requestedById: string | null;
  requestedByName: string;
  requestedAt: string | null;
  approvedById: string | null;
  approvedByName: string;
  approvedAt: string | null;
  rejectedById: string | null;
  rejectedByName: string;
  rejectedAt: string | null;
};

export type AttendanceCorrectionPayload = {
  staffId: string;
  date: string; // yyyy-MM-dd Colombo
  correctedFirstIn?: string | null; // HH:mm
  correctedLastOut?: string | null; // HH:mm
  correctedStatus: string;
  reason: string;
  status?: 'draft' | 'pending_approval';
};

export type GetAttendanceCorrectionsParams = {
  page?: string;
  limit?: string;
  staffId?: string;
  staffCode?: string;
  department?: string;
  designation?: string;
  /** Workflow status (draft / pending_approval / …). */
  status?: string;
  /** Original / system attendance status. */
  attendanceStatus?: string;
  /** Corrected day status (present / absent / late / …). */
  correctedStatus?: string;
  requestedById?: string;
  fromDate?: string;
  toDate?: string;
  code?: string;
};

export type AttendanceCorrectionSummary = {
  totalCorrections: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
};

export type AttendanceCorrectionFilterOptions = {
  staff: RfidFilterOption[];
  departments: RfidFilterOption[];
  designations: RfidFilterOption[];
  attendanceStatuses: RfidFilterOption[];
  correctedStatuses: RfidFilterOption[];
  requesters: RfidFilterOption[];
};

export type AttendanceCorrectionFormOptions = {
  staff: RfidFilterOption[];
  dayStatuses: RfidFilterOption[];
  statuses: RfidFilterOption[];
};

export type AttendanceDayLookupForCorrection = {
  attendanceDayId: string | null;
  staffCode: string;
  staffName: string;
  department: string;
  designation: string;
  originalFirstInAt: string | null;
  originalLastOutAt: string | null;
  originalFirstInLabel: string;
  originalLastOutLabel: string;
  originalStatus: string;
};

export function isAttendanceCorrectionLocked(
  status: AttendanceCorrectionStatus | string
): boolean {
  return (
    status === 'approved' || status === 'rejected' || status === 'cancelled'
  );
}

