export type OvernightShiftStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'amended';

export type OvernightAllocationId = 'shift_start' | 'shift_end';

export type OvernightFilterOption = {
  id: string;
  name: string;
};

export type OvernightShiftTypeOption = OvernightFilterOption & {
  startTime: string;
  endTime: string;
  allowance: string;
};

export type OvernightStaffOption = OvernightFilterOption & {
  staffCode: string;
  department: string;
  unit: string;
};

export type OvernightShiftSample = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  shiftTypeId: string;
  shiftStart: string;
  shiftEnd: string;
  startTime: string;
  endTime: string;
  day1Hours: number;
  day2Hours: number;
  totalHours: number;
  allocationId: OvernightAllocationId;
  attendanceDate: string;
  overnightOt: number;
  allowance: number;
  payrollReady: boolean;
  autoSplit: boolean;
  status: OvernightShiftStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type OvernightHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type OvernightSummarySample = {
  overnightShifts: number;
  cycleLabel: string;
  crossMidnightHours: number;
  overnightOtHours: number;
  allocationConflicts: number;
};

export const SAMPLE_OVERNIGHT_DEPARTMENTS: OvernightFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'clinical', name: 'Clinical' }
];

export const SAMPLE_OVERNIGHT_UNITS: OvernightFilterOption[] = [
  { id: 'etu', name: 'ETU' },
  { id: 'icu', name: 'ICU' },
  { id: 'ward-3', name: 'Ward 3' },
  { id: 'ward-7', name: 'Ward 7' },
  { id: 'pathology', name: 'Pathology' }
];

export const SAMPLE_OVERNIGHT_SHIFT_TYPES: OvernightShiftTypeOption[] = [
  {
    id: 'st-overnight-12',
    name: 'Overnight 12hr (19.00–07.00)',
    startTime: '19:00',
    endTime: '07:00',
    allowance: '3200.00'
  },
  {
    id: 'st-night-8',
    name: 'Night Shift (23.00–07.00)',
    startTime: '23:00',
    endTime: '07:00',
    allowance: '2400.00'
  },
  {
    id: 'st-custom',
    name: 'Custom',
    startTime: '',
    endTime: '',
    allowance: '0.00'
  }
];

export const SAMPLE_OVERNIGHT_STAFF: OvernightStaffOption[] = [
  {
    id: 'staff-1',
    name: 'S. Wijesinghe (RHM-E-045)',
    staffCode: 'RHM-E-045',
    department: 'Emergency',
    unit: 'ETU'
  },
  {
    id: 'staff-2',
    name: 'N. Fernando (RHM-N-118)',
    staffCode: 'RHM-N-118',
    department: 'Nursing',
    unit: 'ICU'
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
    name: 'K. Jayasinghe (RHM-N-133)',
    staffCode: 'RHM-N-133',
    department: 'Nursing',
    unit: 'Ward 3'
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
    name: 'M. Bandara (RHM-N-177)',
    staffCode: 'RHM-N-177',
    department: 'Nursing',
    unit: 'Ward 7'
  }
];

export const SAMPLE_OVERNIGHT_STATUS: OvernightFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'amended', name: 'Amended' }
];

export const SAMPLE_OVERNIGHT_ALLOCATIONS: OvernightFilterOption[] = [
  { id: 'shift_start', name: 'Shift Start Date' },
  { id: 'shift_end', name: 'Shift End Date' },
  { id: 'split_both', name: 'Split Across Both Days' }
];

export const SAMPLE_OVERNIGHT_SUMMARY: OvernightSummarySample = {
  overnightShifts: 248,
  cycleLabel: 'Aug 2026 cycle',
  crossMidnightHours: 2412,
  overnightOtHours: 386,
  allocationConflicts: 3
};

export const SAMPLE_OVERNIGHT_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00'
};

export const SAMPLE_OVERNIGHT_SHIFTS: OvernightShiftSample[] = [
  {
    id: 'os-1',
    staffId: 'staff-1',
    staffCode: 'RHM-E-045',
    staffName: 'S. Wijesinghe',
    department: 'Emergency',
    unit: 'ETU',
    shiftTypeId: 'st-overnight-12',
    shiftStart: '2026-08-10',
    shiftEnd: '2026-08-11',
    startTime: '19:00',
    endTime: '07:00',
    day1Hours: 5,
    day2Hours: 7,
    totalHours: 12,
    allocationId: 'shift_start',
    attendanceDate: '2026-08-10',
    overnightOt: 2,
    allowance: 3200,
    payrollReady: true,
    autoSplit: true,
    status: 'approved',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'os-2',
    staffId: 'staff-2',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    department: 'Nursing',
    unit: 'ICU',
    shiftTypeId: 'st-overnight-12',
    shiftStart: '2026-08-11',
    shiftEnd: '2026-08-12',
    startTime: '19:00',
    endTime: '07:00',
    day1Hours: 5,
    day2Hours: 7,
    totalHours: 12,
    allocationId: 'shift_start',
    attendanceDate: '2026-08-11',
    overnightOt: 1.5,
    allowance: 3200,
    payrollReady: true,
    autoSplit: true,
    status: 'pending_approval',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-11T10:00:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-11T10:00:00'
  },
  {
    id: 'os-3',
    staffId: 'staff-3',
    staffCode: 'RHM-E-091',
    staffName: 'R. Perera',
    department: 'Emergency',
    unit: 'ETU',
    shiftTypeId: 'st-overnight-10',
    shiftStart: '2026-08-12',
    shiftEnd: '2026-08-13',
    startTime: '21:00',
    endTime: '07:00',
    day1Hours: 3,
    day2Hours: 7,
    totalHours: 10,
    allocationId: 'shift_end',
    attendanceDate: '2026-08-13',
    overnightOt: 0,
    allowance: 2800,
    payrollReady: false,
    autoSplit: true,
    status: 'draft',
    remarks: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-13T11:20:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-20T09:10:00'
  },
  {
    id: 'os-4',
    staffId: 'staff-4',
    staffCode: 'RHM-N-133',
    staffName: 'K. Jayasinghe',
    department: 'Nursing',
    unit: 'Ward 3',
    shiftStart: '2026-08-13',
    shiftEnd: '2026-08-14',
    shiftTypeId: 'st-overnight-12',
    startTime: '19:00',
    endTime: '07:00',
    day1Hours: 5,
    day2Hours: 7,
    totalHours: 12,
    allocationId: 'shift_start',
    attendanceDate: '2026-08-13',
    overnightOt: 2,
    allowance: 3200,
    payrollReady: true,
    autoSplit: true,
    status: 'amended',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-16T11:20:00'
  },
  {
    id: 'os-5',
    staffId: 'staff-5',
    staffCode: 'RHM-L-055',
    staffName: 'A. Silva',
    department: 'Laboratory',
    unit: 'Pathology',
    shiftTypeId: 'st-overnight-10',
    shiftStart: '2026-08-14',
    shiftEnd: '2026-08-15',
    startTime: '21:00',
    endTime: '07:00',
    day1Hours: 3,
    day2Hours: 7,
    totalHours: 10,
    allocationId: 'shift_start',
    attendanceDate: '2026-08-14',
    overnightOt: 0,
    allowance: 2800,
    payrollReady: false,
    autoSplit: false,
    status: 'rejected',
    remarks: 'Allocation conflict',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-15T16:00:00'
  },
  {
    id: 'os-6',
    staffId: 'staff-6',
    staffCode: 'RHM-N-177',
    staffName: 'M. Bandara',
    department: 'Nursing',
    unit: 'Ward 7',
    shiftTypeId: 'st-overnight-12',
    shiftStart: '2026-08-15',
    shiftEnd: '2026-08-16',
    startTime: '19:00',
    endTime: '07:00',
    day1Hours: 5,
    day2Hours: 7,
    totalHours: 12,
    allocationId: 'shift_end',
    attendanceDate: '2026-08-16',
    overnightOt: 1,
    allowance: 3200,
    payrollReady: true,
    autoSplit: true,
    status: 'pending_approval',
    remarks: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-15T14:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-22T09:00:00'
  }
];

export function formatOvernightHours(value: number): string {
  return value.toFixed(2);
}

export function formatOvernightMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function combineDateAndTime(
  date: Date | null,
  time: string
): Date | null {
  if (!date || !time) return null;
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function splitHoursAtMidnight(
  start: Date,
  end: Date
): { day1: number; day2: number; total: number } | null {
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end <= start) return null;

  const midnight = new Date(start);
  midnight.setHours(24, 0, 0, 0);
  const msPerHour = 3_600_000;

  if (end <= midnight) {
    const total = (end.getTime() - start.getTime()) / msPerHour;
    return { day1: total, day2: 0, total };
  }

  const day1 = (midnight.getTime() - start.getTime()) / msPerHour;
  const day2 = (end.getTime() - midnight.getTime()) / msPerHour;
  return { day1, day2, total: day1 + day2 };
}

export function attendanceDateForAllocation(
  allocationId: OvernightAllocationId,
  startDate: Date | null,
  endDate: Date | null
): Date | null {
  return allocationId === 'shift_end' ? endDate : startDate;
}

export function getSampleOvernightHistory(
  record: OvernightShiftSample
): OvernightHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Overnight shift updated',
      detail: `Duty changed for ${record.staffName} (${record.staffCode}).`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${
        SAMPLE_OVERNIGHT_STATUS.find((s) => s.id === record.status)?.name ??
        record.status
      }.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Created',
      detail: `Overnight duty recorded for ${record.staffName}.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
