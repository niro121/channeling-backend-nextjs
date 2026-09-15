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

