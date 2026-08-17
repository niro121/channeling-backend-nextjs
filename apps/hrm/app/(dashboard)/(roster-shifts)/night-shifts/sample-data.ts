export const CONSECUTIVE_NIGHT_LIMIT = 3;

export type NightShiftStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected';

export type NightShiftFilterOption = {
  id: string;
  name: string;
};

export type NightShiftTypeOption = NightShiftFilterOption & {
  startTime: string;
  endTime: string;
  nightHours: string;
  nightAllowance: string;
  mealAllowance: string;
};

export type NightShiftStaffOption = NightShiftFilterOption & {
  staffCode: string;
  department: string;
  unit: string;
};

export type NightShiftSample = {
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
  salaryCycleId: string;
  status: NightShiftStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type NightShiftHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type NightShiftSummarySample = {
  nightShiftsThisCycle: number;
  cycleLabel: string;
  staffOnNightDuty: number;
  staffUnitsLabel: string;
  nightAllowancePayable: string;
  consecutiveNightAlerts: number;
};

export const SAMPLE_NIGHT_DEPARTMENTS: NightShiftFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'clinical', name: 'Clinical' }
];

export const SAMPLE_NIGHT_UNITS: NightShiftFilterOption[] = [
  { id: 'icu', name: 'ICU' },
  { id: 'ward-3', name: 'Ward 3' },
  { id: 'etu', name: 'ETU' },
  { id: 'pathology', name: 'Pathology' },
  { id: 'ward-7', name: 'Ward 7' }
];

export const SAMPLE_NIGHT_SHIFT_TYPES: NightShiftTypeOption[] = [
  {
    id: 'st-night',
    name: 'Night Shift (23:00–07:00)',
    startTime: '23:00',
    endTime: '07:00',
    nightHours: '8.00',
    nightAllowance: '2500.00',
    mealAllowance: '450.00'
  },
  {
    id: 'st-night-12',
    name: 'Night 12 Hr (19:00–07:00)',
    startTime: '19:00',
    endTime: '07:00',
    nightHours: '12.00',
    nightAllowance: '3200.00',
    mealAllowance: '550.00'
  }
];

export const SAMPLE_NIGHT_STAFF: NightShiftStaffOption[] = [
  {
    id: 'staff-1',
    name: 'A. Kumara (RHM-N-201)',
    staffCode: 'RHM-N-201',
    department: 'Nursing',
    unit: 'ICU'
  },
  {
    id: 'staff-2',
    name: 'N. Fernando (RHM-N-118)',
    staffCode: 'RHM-N-118',
    department: 'Nursing',
    unit: 'Ward 3'
  },
  {
    id: 'staff-3',
    name: 'R. Perera (RHM-E-091)',
    staffCode: 'RHM-E-091',
    department: 'Emergency',
    unit: 'ETU'
  },
  {
    id: 'staff-4',
    name: 'S. Wijesinghe (RHM-N-204)',
    staffCode: 'RHM-N-204',
    department: 'Nursing',
    unit: 'ICU'
  },
  {
    id: 'staff-5',
    name: 'A. Silva (RHM-L-055)',
    staffCode: 'RHM-L-055',
    department: 'Laboratory',
    unit: 'Pathology'
  },
  {
    id: 'staff-6',
    name: 'K. Jayasinghe (RHM-N-133)',
    staffCode: 'RHM-N-133',
    department: 'Nursing',
    unit: 'Ward 7'
  }
];

export const SAMPLE_NIGHT_STATUS: NightShiftFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' }
];

export const SAMPLE_SALARY_CYCLES: NightShiftFilterOption[] = [
  { id: '2026-08', name: 'Aug 2026' },
  { id: '2026-07', name: 'Jul 2026' },
  { id: '2026-06', name: 'Jun 2026' }
];

export const SAMPLE_NIGHT_SUMMARY: NightShiftSummarySample = {
  nightShiftsThisCycle: 612,
  cycleLabel: 'Aug 2026 cycle',
  staffOnNightDuty: 94,
  staffUnitsLabel: 'Nursing, ETU, ICU, Lab',
  nightAllowancePayable: 'LKR 1.48 M',
  consecutiveNightAlerts: 6
};

export const SAMPLE_NIGHT_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00'
};

export const SAMPLE_NIGHT_SHIFTS: NightShiftSample[] = [
  {
    id: 'ns-1',
    staffId: 'staff-1',
    staffCode: 'RHM-N-201',
    staffName: 'A. Kumara',
    department: 'Nursing',
    unit: 'ICU',
    shiftDate: '2026-08-10',
    shiftTypeId: 'st-night',
    nightShift: 'Night Shift (23:00–07:00)',
    startTime: '23:00',
    endTime: '07:00',
    nightHours: 8,
    nightOt: 1.5,
    nightAllowance: 2500,
    mealAllowance: 450,
    consecutiveNights: 4,
    payrollReady: true,
    salaryCycleId: '2026-08',
    status: 'approved',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'ns-2',
    staffId: 'staff-2',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    department: 'Nursing',
    unit: 'Ward 3',
    shiftDate: '2026-08-11',
    shiftTypeId: 'st-night',
    nightShift: 'Night Shift (23:00–07:00)',
    startTime: '23:00',
    endTime: '07:00',
    nightHours: 8,
    nightOt: 0,
    nightAllowance: 2500,
    mealAllowance: 450,
    consecutiveNights: 3,
    payrollReady: true,
    salaryCycleId: '2026-08',
    status: 'pending_approval',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-11T10:00:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-11T10:00:00'
  },
  {
    id: 'ns-3',
    staffId: 'staff-3',
    staffCode: 'RHM-E-091',
    staffName: 'R. Perera',
    department: 'Emergency',
    unit: 'ETU',
    shiftDate: '2026-08-12',
    shiftTypeId: 'st-night-12',
    nightShift: 'Night 12 Hr (19:00–07:00)',
    startTime: '19:00',
    endTime: '07:00',
    nightHours: 12,
    nightOt: 2,
    nightAllowance: 3200,
    mealAllowance: 550,
    consecutiveNights: 1,
    payrollReady: false,
    salaryCycleId: '2026-08',
    status: 'draft',
    remarks: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-13T11:20:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-20T09:10:00'
  },
  {
    id: 'ns-4',
    staffId: 'staff-4',
    staffCode: 'RHM-N-204',
    staffName: 'S. Wijesinghe',
    department: 'Nursing',
    unit: 'ICU',
    shiftDate: '2026-08-12',
    shiftTypeId: 'st-night',
    nightShift: 'Night Shift (23:00–07:00)',
    startTime: '23:00',
    endTime: '07:00',
    nightHours: 8,
    nightOt: 0,
    nightAllowance: 2500,
    mealAllowance: 450,
    consecutiveNights: 5,
    payrollReady: true,
    salaryCycleId: '2026-08',
    status: 'approved',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T08:30:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-16T11:20:00'
  },
  {
    id: 'ns-5',
    staffId: 'staff-5',
    staffCode: 'RHM-L-055',
    staffName: 'A. Silva',
    department: 'Laboratory',
    unit: 'Pathology',
    shiftDate: '2026-08-13',
    shiftTypeId: 'st-night',
    nightShift: 'Night Shift (23:00–07:00)',
    startTime: '23:00',
    endTime: '07:00',
    nightHours: 8,
    nightOt: 0,
    nightAllowance: 2500,
    mealAllowance: 450,
    consecutiveNights: 1,
    payrollReady: false,
    salaryCycleId: '2026-08',
    status: 'rejected',
    remarks: 'Roster cancelled',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-15T16:00:00'
  },
  {
    id: 'ns-6',
    staffId: 'staff-6',
    staffCode: 'RHM-N-133',
    staffName: 'K. Jayasinghe',
    department: 'Nursing',
    unit: 'Ward 7',
    shiftDate: '2026-08-14',
    shiftTypeId: 'st-night',
    nightShift: 'Night Shift (23:00–07:00)',
    startTime: '23:00',
    endTime: '07:00',
    nightHours: 8,
    nightOt: 1,
    nightAllowance: 2500,
    mealAllowance: 450,
    consecutiveNights: 2,
    payrollReady: true,
    salaryCycleId: '2026-08',
    status: 'pending_approval',
    remarks: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-15T14:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-22T09:00:00'
  }
];

export function exceedsConsecutiveNightPolicy(nights: number): boolean {
  return nights > CONSECUTIVE_NIGHT_LIMIT;
}

export function formatNightHours(value: number): string {
  return value.toFixed(2);
}

export function formatNightMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function getSampleNightShiftHistory(
  record: NightShiftSample
): NightShiftHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Night shift updated',
      detail: `Duty changed for ${record.staffName} (${record.staffCode}).`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${
        SAMPLE_NIGHT_STATUS.find((s) => s.id === record.status)?.name ??
        record.status
      }.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Created',
      detail: `${record.nightShift} recorded for ${record.staffName}.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
