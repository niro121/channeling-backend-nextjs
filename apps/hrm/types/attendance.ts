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

