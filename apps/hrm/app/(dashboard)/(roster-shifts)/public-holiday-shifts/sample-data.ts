export type PublicHolidayShiftStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'amended';

export type PublicHolidayPayRate = '1.50' | '2.00' | '2.50';

export type PublicHolidayFilterOption = {
  id: string;
  name: string;
};

export type PublicHolidayMasterOption = PublicHolidayFilterOption & {
  typeId: string;
  date: string;
};

export type PublicHolidayShiftOption = PublicHolidayFilterOption & {
  workedHours: string;
};

export type PublicHolidayStaffOption = PublicHolidayFilterOption & {
  staffCode: string;
  department: string;
  unit: string;
  dutyLocation: string;
};

export type PublicHolidayShiftSample = {
  id: string;
  holidayId: string;
  holidayName: string;
  holidayTypeId: string;
  holidayType: string;
  dutyDate: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  shiftId: string;
  shiftLabel: string;
  workedHours: number;
  payRate: PublicHolidayPayRate;
  holidayAllowance: number;
  dutyLocation: string;
  lieuLeave: boolean;
  sendToPayroll: boolean;
  status: PublicHolidayShiftStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type PublicHolidayHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type PublicHolidaySummarySample = {
  holidayDuties: number;
  cycleLabel: string;
  staffOnHolidayDuty: number;
  holidayPayPayableLabel: string;
  lieuDaysGranted: number;
};

export const SAMPLE_HOLIDAY_DEPARTMENTS: PublicHolidayFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'clinical', name: 'Clinical' }
];

export const SAMPLE_HOLIDAY_UNITS: PublicHolidayFilterOption[] = [
  { id: 'ward-3', name: 'Ward 3' },
  { id: 'icu', name: 'ICU' },
  { id: 'etu', name: 'ETU' },
  { id: 'opd', name: 'OPD' },
  { id: 'pathology', name: 'Pathology' }
];

export const SAMPLE_HOLIDAY_TYPES: PublicHolidayFilterOption[] = [
  { id: 'poya', name: 'Poya' },
  { id: 'mercantile', name: 'Mercantile' },
  { id: 'public', name: 'Public' }
];

export const SAMPLE_PUBLIC_HOLIDAYS: PublicHolidayMasterOption[] = [
  {
    id: 'hol-nikini',
    name: 'Nikini Poya Day',
    typeId: 'poya',
    date: '2026-08-11'
  },
  {
    id: 'hol-may-day',
    name: 'May Day',
    typeId: 'mercantile',
    date: '2026-05-01'
  },
  {
    id: 'hol-independence',
    name: 'Independence Day',
    typeId: 'public',
    date: '2026-02-04'
  }
];

export const SAMPLE_HOLIDAY_SHIFTS: PublicHolidayShiftOption[] = [
  { id: 'st-day', name: 'Day Shift (07:00–15:00)', workedHours: '8.00' },
  {
    id: 'st-evening',
    name: 'Evening Shift (15:00–23:00)',
    workedHours: '8.00'
  },
  { id: 'st-night', name: 'Night Shift (23:00–07:00)', workedHours: '8.00' },
  {
    id: 'st-overnight',
    name: 'Overnight 12 Hr (19:00–07:00)',
    workedHours: '12.00'
  }
];

export const SAMPLE_HOLIDAY_STAFF: PublicHolidayStaffOption[] = [
  {
    id: 'staff-1',
    name: 'N. Fernando (RHM-N-118)',
    staffCode: 'RHM-N-118',
    department: 'Nursing',
    unit: 'Ward 3',
    dutyLocation: 'Ward 3'
  },
  {
    id: 'staff-2',
    name: 'S. Wijesinghe (RHM-N-204)',
    staffCode: 'RHM-N-204',
    department: 'Nursing',
    unit: 'ICU',
    dutyLocation: 'ICU'
  },
  {
    id: 'staff-3',
    name: 'R. Perera (RHM-E-091)',
    staffCode: 'RHM-E-091',
    department: 'Emergency',
    unit: 'ETU',
    dutyLocation: 'ETU'
  },
  {
    id: 'staff-4',
    name: 'A. Silva (RHM-L-055)',
    staffCode: 'RHM-L-055',
    department: 'Laboratory',
    unit: 'Pathology',
    dutyLocation: 'Pathology'
  },
  {
    id: 'staff-5',
    name: 'K. Jayasinghe (RHM-N-133)',
    staffCode: 'RHM-N-133',
    department: 'Nursing',
    unit: 'Ward 3',
    dutyLocation: 'Ward 3'
  },
  {
    id: 'staff-6',
    name: 'M. Bandara (RHM-N-177)',
    staffCode: 'RHM-N-177',
    department: 'Clinical',
    unit: 'OPD',
    dutyLocation: 'OPD'
  }
];

export const SAMPLE_HOLIDAY_PAY_RATES: PublicHolidayFilterOption[] = [
  { id: '1.50', name: '1.50x' },
  { id: '2.00', name: '2.00x' },
  { id: '2.50', name: '2.50x' }
];

export const SAMPLE_HOLIDAY_STATUS: PublicHolidayFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'amended', name: 'Amended' }
];

export const SAMPLE_HOLIDAY_SUMMARY: PublicHolidaySummarySample = {
  holidayDuties: 164,
  cycleLabel: 'Aug 2026 cycle',
  staffOnHolidayDuty: 118,
  holidayPayPayableLabel: 'LKR 0.92 M',
  lieuDaysGranted: 72
};

export const SAMPLE_HOLIDAY_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00'
};

export const SAMPLE_PUBLIC_HOLIDAY_SHIFTS: PublicHolidayShiftSample[] = [
  {
    id: 'phs-1',
    holidayId: 'hol-nikini',
    holidayName: 'Nikini Poya Day',
    holidayTypeId: 'poya',
    holidayType: 'Poya',
    dutyDate: '2026-08-11',
    staffId: 'staff-1',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    department: 'Nursing',
    unit: 'Ward 3',
    shiftId: 'st-day',
    shiftLabel: 'Day Shift (07:00–15:00)',
    workedHours: 8,
    payRate: '1.50',
    holidayAllowance: 2500,
    dutyLocation: 'Ward 3',
    lieuLeave: true,
    sendToPayroll: false,
    status: 'approved',
    remarks: 'Covering gazetted Poya duty on Ward 3.',
    createdBy: 'N. Silva',
    createdAt: '2026-07-28T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2026-08-02T11:20:00'
  },
  {
    id: 'phs-2',
    holidayId: 'hol-nikini',
    holidayName: 'Nikini Poya Day',
    holidayTypeId: 'poya',
    holidayType: 'Poya',
    dutyDate: '2026-08-11',
    staffId: 'staff-2',
    staffCode: 'RHM-N-204',
    staffName: 'S. Wijesinghe',
    department: 'Nursing',
    unit: 'ICU',
    shiftId: 'st-night',
    shiftLabel: 'Night Shift (23:00–07:00)',
    workedHours: 8,
    payRate: '2.00',
    holidayAllowance: 3200,
    dutyLocation: 'ICU',
    lieuLeave: false,
    sendToPayroll: true,
    status: 'pending_approval',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2026-07-29T10:00:00',
    updatedBy: 'N. Silva',
    updatedAt: '2026-07-29T10:00:00'
  },
  {
    id: 'phs-3',
    holidayId: 'hol-may-day',
    holidayName: 'May Day',
    holidayTypeId: 'mercantile',
    holidayType: 'Mercantile',
    dutyDate: '2026-05-01',
    staffId: 'staff-3',
    staffCode: 'RHM-E-091',
    staffName: 'R. Perera',
    department: 'Emergency',
    unit: 'ETU',
    shiftId: 'st-overnight',
    shiftLabel: 'Overnight 12 Hr (19:00–07:00)',
    workedHours: 12,
    payRate: '2.50',
    holidayAllowance: 4800,
    dutyLocation: 'ETU',
    lieuLeave: false,
    sendToPayroll: true,
    status: 'approved',
    remarks: 'ETU cover on May Day.',
    createdBy: 'K. Fernando',
    createdAt: '2026-04-18T11:20:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2026-04-22T09:10:00'
  },
  {
    id: 'phs-4',
    holidayId: 'hol-independence',
    holidayName: 'Independence Day',
    holidayTypeId: 'public',
    holidayType: 'Public',
    dutyDate: '2026-02-04',
    staffId: 'staff-4',
    staffCode: 'RHM-L-055',
    staffName: 'A. Silva',
    department: 'Laboratory',
    unit: 'Pathology',
    shiftId: 'st-day',
    shiftLabel: 'Day Shift (07:00–15:00)',
    workedHours: 8,
    payRate: '2.00',
    holidayAllowance: 1800,
    dutyLocation: 'Pathology',
    lieuLeave: true,
    sendToPayroll: false,
    status: 'amended',
    remarks: 'Shift later changed from Evening to Day.',
    createdBy: 'N. Silva',
    createdAt: '2026-01-20T08:30:00',
    updatedBy: 'N. Silva',
    updatedAt: '2026-01-28T14:30:00'
  },
  {
    id: 'phs-5',
    holidayId: 'hol-independence',
    holidayName: 'Independence Day',
    holidayTypeId: 'public',
    holidayType: 'Public',
    dutyDate: '2026-02-04',
    staffId: 'staff-5',
    staffCode: 'RHM-N-133',
    staffName: 'K. Jayasinghe',
    department: 'Nursing',
    unit: 'Ward 3',
    shiftId: 'st-evening',
    shiftLabel: 'Evening Shift (15:00–23:00)',
    workedHours: 8,
    payRate: '1.50',
    holidayAllowance: 2200,
    dutyLocation: 'Ward 3',
    lieuLeave: false,
    sendToPayroll: false,
    status: 'rejected',
    remarks: 'Already rostered off; request declined.',
    createdBy: 'K. Fernando',
    createdAt: '2026-01-22T14:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2026-01-24T09:00:00'
  },
  {
    id: 'phs-6',
    holidayId: 'hol-nikini',
    holidayName: 'Nikini Poya Day',
    holidayTypeId: 'poya',
    holidayType: 'Poya',
    dutyDate: '2026-08-11',
    staffId: 'staff-6',
    staffCode: 'RHM-N-177',
    staffName: 'M. Bandara',
    department: 'Clinical',
    unit: 'OPD',
    shiftId: 'st-day',
    shiftLabel: 'Day Shift (07:00–15:00)',
    workedHours: 8,
    payRate: '1.50',
    holidayAllowance: 2000,
    dutyLocation: 'OPD',
    lieuLeave: true,
    sendToPayroll: false,
    status: 'draft',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2026-08-01T11:22:00',
    updatedBy: 'N. Silva',
    updatedAt: '2026-08-01T11:22:00'
  }
];

export function formatHolidayHours(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatHolidayMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatPayRate(value: PublicHolidayPayRate): string {
  return `${value}x`;
}

export function getSampleHolidayShiftHistory(
  record: PublicHolidayShiftSample
): PublicHolidayHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Holiday shift updated',
      detail: `Duty changed for ${record.staffName} (${record.staffCode}) on ${record.holidayName}.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${
        SAMPLE_HOLIDAY_STATUS.find((s) => s.id === record.status)?.name ??
        record.status
      }.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Created',
      detail: `${record.holidayName} duty recorded for ${record.staffName}.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
