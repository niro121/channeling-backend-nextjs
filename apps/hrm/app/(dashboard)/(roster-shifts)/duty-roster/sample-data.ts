export type DutyRosterStatus =
  | 'draft'
  | 'published'
  | 'pending_approval'
  | 'amended';

export type DutyAttendance = 'present' | 'late' | 'absent';

export type DutyRosterFilterOption = {
  id: string;
  name: string;
};

export type DutyRosterShiftOption = DutyRosterFilterOption & {
  startTime: string;
  endTime: string;
};

export type DutyRosterStaffOption = DutyRosterFilterOption & {
  staffCode: string;
  dutyLocation: string;
  wardUnit: string;
};

export type DutyRosterSample = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  dutyLocation: string;
  wardUnit: string;
  supervisorId: string;
  supervisorName: string;
  status: DutyRosterStatus;
  attendance: DutyAttendance;
  comments: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type DutyRosterHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type DutyRosterSummarySample = {
  onDutyToday: number;
  present: number;
  lateArrivals: number;
  unfilledDuties: number;
};

export const SAMPLE_DUTY_DEPARTMENTS: DutyRosterFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'clinical', name: 'Clinical' }
];

export const SAMPLE_DUTY_UNITS: DutyRosterFilterOption[] = [
  { id: 'ward-3', name: 'Ward 3' },
  { id: 'icu', name: 'ICU' },
  { id: 'etu', name: 'ETU' },
  { id: 'pathology', name: 'Pathology' },
  { id: 'ward-7', name: 'Ward 7' },
  { id: 'opd', name: 'OPD' }
];

export const SAMPLE_DUTY_ROSTERS: DutyRosterFilterOption[] = [
  { id: 'nursing-w3', name: 'Nursing - W3' },
  { id: 'nursing-icu', name: 'Nursing - ICU' },
  { id: 'emergency-a', name: 'Emergency - A' }
];

export const SAMPLE_DUTY_SHIFTS: DutyRosterShiftOption[] = [
  { id: 'st-day', name: 'Day Shift', startTime: '07:00', endTime: '15:00' },
  { id: 'st-evening', name: 'Evening Shift', startTime: '15:00', endTime: '23:00' },
  { id: 'st-night', name: 'Night Shift', startTime: '23:00', endTime: '07:00' },
  { id: 'st-fixed', name: 'Fixed 09:00–17:00', startTime: '09:00', endTime: '17:00' }
];

export const SAMPLE_DUTY_STAFF: DutyRosterStaffOption[] = [
  {
    id: 'staff-1',
    name: 'N. Fernando (RHM-N-118)',
    staffCode: 'RHM-N-118',
    dutyLocation: 'Ward Block A',
    wardUnit: 'Ward 3'
  },
  {
    id: 'staff-2',
    name: 'S. Wijesinghe (RHM-N-204)',
    staffCode: 'RHM-N-204',
    dutyLocation: 'ICU Block',
    wardUnit: 'ICU'
  },
  {
    id: 'staff-3',
    name: 'R. Perera (RHM-E-091)',
    staffCode: 'RHM-E-091',
    dutyLocation: 'ETU',
    wardUnit: 'ETU'
  },
  {
    id: 'staff-4',
    name: 'A. Silva (RHM-L-055)',
    staffCode: 'RHM-L-055',
    dutyLocation: 'Lab Block',
    wardUnit: 'Pathology'
  },
  {
    id: 'staff-5',
    name: 'K. Jayasinghe (RHM-N-133)',
    staffCode: 'RHM-N-133',
    dutyLocation: 'Ward Block B',
    wardUnit: 'Ward 7'
  },
  {
    id: 'staff-6',
    name: 'M. Bandara (RHM-N-177)',
    staffCode: 'RHM-N-177',
    dutyLocation: 'Channel Centre',
    wardUnit: 'OPD'
  }
];

export const SAMPLE_DUTY_SUPERVISORS: DutyRosterFilterOption[] = [
  { id: 'sup-1', name: 'Sr. K. Jayasuriya' },
  { id: 'sup-2', name: 'Dr. P. Bandara' },
  { id: 'sup-3', name: 'Administrator' }
];

export const SAMPLE_DUTY_STATUS: DutyRosterFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'published', name: 'Published' },
  { id: 'amended', name: 'Amended' }
];

export const SAMPLE_DUTY_SUMMARY: DutyRosterSummarySample = {
  onDutyToday: 186,
  present: 174,
  lateArrivals: 8,
  unfilledDuties: 4
};

export const SAMPLE_DUTY_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00'
};

export const SAMPLE_DUTY_ROSTER_ROWS: DutyRosterSample[] = [
  {
    id: 'dr-1',
    staffId: 'staff-1',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    shiftId: 'st-day',
    shiftName: 'Day Shift',
    startTime: '07:00',
    endTime: '15:00',
    dutyLocation: 'Ward Block A',
    wardUnit: 'Ward 3',
    supervisorId: 'sup-1',
    supervisorName: 'Sr. K. Jayasuriya',
    status: 'published',
    attendance: 'present',
    comments: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'dr-2',
    staffId: 'staff-2',
    staffCode: 'RHM-N-204',
    staffName: 'S. Wijesinghe',
    shiftId: 'st-night',
    shiftName: 'Night Shift',
    startTime: '23:00',
    endTime: '07:00',
    dutyLocation: 'ICU Block',
    wardUnit: 'ICU',
    supervisorId: 'sup-2',
    supervisorName: 'Dr. P. Bandara',
    status: 'published',
    attendance: 'late',
    comments: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T10:00:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-12T10:00:00'
  },
  {
    id: 'dr-3',
    staffId: 'staff-3',
    staffCode: 'RHM-E-091',
    staffName: 'R. Perera',
    shiftId: 'st-evening',
    shiftName: 'Evening Shift',
    startTime: '15:00',
    endTime: '23:00',
    dutyLocation: 'ETU',
    wardUnit: 'ETU',
    supervisorId: 'sup-1',
    supervisorName: 'Sr. K. Jayasuriya',
    status: 'pending_approval',
    attendance: 'present',
    comments: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-13T11:20:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-20T09:10:00'
  },
  {
    id: 'dr-4',
    staffId: 'staff-4',
    staffCode: 'RHM-L-055',
    staffName: 'A. Silva',
    shiftId: 'st-fixed',
    shiftName: 'Fixed 09:00–17:00',
    startTime: '09:00',
    endTime: '17:00',
    dutyLocation: 'Lab Block',
    wardUnit: 'Pathology',
    supervisorId: 'sup-3',
    supervisorName: 'Administrator',
    status: 'published',
    attendance: 'absent',
    comments: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-14T08:30:00'
  },
  {
    id: 'dr-5',
    staffId: 'staff-5',
    staffCode: 'RHM-N-133',
    staffName: 'K. Jayasinghe',
    shiftId: 'st-day',
    shiftName: 'Day Shift',
    startTime: '07:00',
    endTime: '15:00',
    dutyLocation: 'Ward Block B',
    wardUnit: 'Ward 7',
    supervisorId: 'sup-1',
    supervisorName: 'Sr. K. Jayasuriya',
    status: 'amended',
    attendance: 'present',
    comments: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-15T14:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-22T09:00:00'
  },
  {
    id: 'dr-6',
    staffId: 'staff-6',
    staffCode: 'RHM-N-177',
    staffName: 'M. Bandara',
    shiftId: 'st-fixed',
    shiftName: 'Fixed 09:00–17:00',
    startTime: '09:00',
    endTime: '17:00',
    dutyLocation: 'Channel Centre',
    wardUnit: 'OPD',
    supervisorId: 'sup-3',
    supervisorName: 'Administrator',
    status: 'draft',
    attendance: 'present',
    comments: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-16T11:22:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-16T11:22:00'
  }
];

export function getSampleDutyHistory(
  record: DutyRosterSample
): DutyRosterHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Duty updated',
      detail: `Duty assignment changed for ${record.staffName} (${record.staffCode}).`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${
        SAMPLE_DUTY_STATUS.find((s) => s.id === record.status)?.name ??
        record.status
      }.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Duty created',
      detail: `${record.shiftName} assigned to ${record.staffName}.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
