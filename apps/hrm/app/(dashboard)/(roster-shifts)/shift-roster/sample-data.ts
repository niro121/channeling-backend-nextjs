import {
  addDays,
  eachDayOfInterval,
  format,
  startOfWeek
} from 'date-fns';

export type ShiftCode = 'D' | 'E' | 'N' | 'O' | 'L';

export type RosterRowStatus =
  | 'published'
  | 'draft'
  | 'pending_approval'
  | 'amended';

export type RosterFilterOption = {
  id: string;
  name: string;
};

export type RosterStaffOption = RosterFilterOption & {
  staffCode: string;
  department: string;
  unit: string;
  designation: string;
};

export type RosterShiftTypeOption = RosterFilterOption & {
  code: ShiftCode;
  timeRange: string;
  durationHours: number;
};

export type ShiftCellSample = {
  code: ShiftCode;
  label: string;
  timeRange: string;
  isLeave: boolean;
};

export type RosterAllocationHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type RosterStaffRowSample = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  designation: string;
  /** ISO date (yyyy-MM-dd) → cell */
  shifts: Record<string, ShiftCellSample | null>;
  totalHours: number;
  otHours: number;
  status: RosterRowStatus;
};

export type RosterSummarySample = {
  staffRostered: number;
  departments: number;
  shiftsThisWeek: number;
  totalHours: number;
  conflicts: number;
};

export type RosterWeekMeta = {
  weekStartIso: string;
  weekEndIso: string;
  /** ISO dates (yyyy-MM-dd) for each day column */
  dayIsos: string[];
  fromDateIso: string;
  toDateIso: string;
  weekLabel: string;
  weekRangeShort: string;
};

export const SHIFT_LEGEND: Array<{
  code: ShiftCode;
  label: string;
  timeRange: string;
}> = [
  { code: 'D', label: 'Day', timeRange: '07:00-15:00' },
  { code: 'E', label: 'Evening', timeRange: '15:00-23:00' },
  { code: 'N', label: 'Night', timeRange: '23:00-07:00' },
  { code: 'O', label: 'Off', timeRange: '—' },
  { code: 'L', label: 'Leave', timeRange: '—' }
];

export const SAMPLE_DEPARTMENTS: RosterFilterOption[] = [
  { id: 'ward-3', name: 'Ward 3' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'cardiology', name: 'Cardiology' },
  { id: 'lab', name: 'Lab' }
];

export const SAMPLE_UNITS: RosterFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'clinical', name: 'Clinical' },
  { id: 'support', name: 'Support' }
];

export const SAMPLE_ROSTERS: RosterFilterOption[] = [
  { id: 'nursing-w3', name: 'Nursing - W3' },
  { id: 'nursing-w1', name: 'Nursing - W1' },
  { id: 'emergency-a', name: 'Emergency - A' }
];

export const SAMPLE_ROSTER_SUMMARY: RosterSummarySample = {
  staffRostered: 248,
  departments: 14,
  shiftsThisWeek: 1736,
  totalHours: 13888,
  conflicts: 0
};

export const SAMPLE_ROSTER_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00',
  publishedLabel: 'Published 22 Aug 2025'
};

export const SAMPLE_ALLOCATION_STATUS_OPTIONS: RosterFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'published', name: 'Published' },
  { id: 'amended', name: 'Amended' }
];

export const SAMPLE_ROSTER_SHIFT_TYPES: RosterShiftTypeOption[] = [
  {
    id: 'st-day',
    name: 'Day Shift',
    code: 'D',
    timeRange: '07:00-15:00',
    durationHours: 8
  },
  {
    id: 'st-evening',
    name: 'Evening Shift',
    code: 'E',
    timeRange: '15:00-23:00',
    durationHours: 8
  },
  {
    id: 'st-night',
    name: 'Night Shift',
    code: 'N',
    timeRange: '23:00-07:00',
    durationHours: 8
  },
  {
    id: 'st-off',
    name: 'Off Duty',
    code: 'O',
    timeRange: '—',
    durationHours: 0
  },
  {
    id: 'st-leave',
    name: 'Leave',
    code: 'L',
    timeRange: '—',
    durationHours: 0
  }
];

export function staffOptionsFromRows(
  rows: RosterStaffRowSample[]
): RosterStaffOption[] {
  return rows.map((row) => ({
    id: row.id,
    name: `${row.staffName} (${row.staffCode})`,
    staffCode: row.staffCode,
    department: row.department,
    unit: row.unit,
    designation: row.designation
  }));
}

export function shiftTypeIdFromCode(code: ShiftCode): string {
  return (
    SAMPLE_ROSTER_SHIFT_TYPES.find((item) => item.code === code)?.id ?? ''
  );
}

export function findFirstAllocatedDay(
  row: RosterStaffRowSample,
  dayIsos: string[]
): string | null {
  for (const dayIso of dayIsos) {
    if (row.shifts[dayIso]) return dayIso;
  }
  return null;
}

export function getSampleAllocationHistory(
  row: RosterStaffRowSample
): RosterAllocationHistoryEntry[] {
  return [
    {
      id: `${row.id}-h1`,
      title: 'Created',
      detail: `Roster allocation created for ${row.staffName} (${row.staffCode}).`,
      userLabel: SAMPLE_ROSTER_AUDIT.createdBy,
      at: SAMPLE_ROSTER_AUDIT.createdAt
    },
    {
      id: `${row.id}-h2`,
      title: 'Shift changed Day → Evening',
      detail: `Shift type updated for ${row.staffName}.`,
      userLabel: SAMPLE_ROSTER_AUDIT.updatedBy,
      at: SAMPLE_ROSTER_AUDIT.updatedAt
    },
    {
      id: `${row.id}-h3`,
      title: 'Published',
      detail: `Roster published for ${row.staffName} (${row.staffCode}).`,
      userLabel: 'Dr. R. Silva (Administrator)',
      at: '2025-08-22T08:05:00'
    }
  ];
}

function cell(code: ShiftCode, isLeave = false): ShiftCellSample {
  const meta = SHIFT_LEGEND.find((item) => item.code === code)!;
  return {
    code,
    label: meta.label,
    timeRange: meta.timeRange,
    isLeave: isLeave || code === 'L'
  };
}

function iso(day: Date): string {
  return format(day, 'yyyy-MM-dd');
}

/** Build week meta for the current calendar week (Sun–Sat). Serializable for RSC → client. */
export function buildCurrentWeekMeta(now = new Date()): RosterWeekMeta {
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const fromDateIso = iso(weekStart);
  const toDateIso = iso(weekEnd);
  return {
    weekStartIso: fromDateIso,
    weekEndIso: toDateIso,
    dayIsos: days.map(iso),
    fromDateIso,
    toDateIso,
    weekLabel: `Week of ${format(weekStart, 'dd MMM yyyy')} - ${format(weekEnd, 'dd MMM yyyy')}`,
    weekRangeShort: `${format(weekStart, 'dd')}-${format(weekEnd, 'dd MMM')}`
  };
}

/** Sample staff rows keyed to the given ISO day list. */
export function buildSampleRosterRows(dayIsos: string[]): RosterStaffRowSample[] {
  const d = dayIsos;
  const empty = Object.fromEntries(d.map((key) => [key, null])) as Record<
    string,
    ShiftCellSample | null
  >;

  return [
    {
      id: 'row-1',
      staffCode: 'ST-1042',
      staffName: 'N. Fernando',
      department: 'Ward 3',
      unit: 'Nursing',
      designation: 'Staff Nurse',
      shifts: {
        ...empty,
        [d[0]]: cell('D'),
        [d[1]]: cell('D'),
        [d[2]]: cell('E'),
        [d[3]]: cell('N'),
        [d[4]]: cell('O'),
        [d[5]]: cell('D'),
        [d[6]]: cell('O')
      },
      totalHours: 48,
      otHours: 6,
      status: 'published'
    },
    {
      id: 'row-2',
      staffCode: 'ST-1188',
      staffName: 'S. Wijesinghe',
      department: 'Emergency',
      unit: 'Clinical',
      designation: 'Senior Nurse',
      shifts: {
        ...empty,
        [d[0]]: cell('N'),
        [d[1]]: cell('N'),
        [d[2]]: cell('O'),
        [d[3]]: cell('D'),
        [d[4]]: cell('D'),
        [d[5]]: cell('E'),
        [d[6]]: cell('L', true)
      },
      totalHours: 40,
      otHours: 2,
      status: 'draft'
    },
    {
      id: 'row-3',
      staffCode: 'ST-0921',
      staffName: 'R. Perera',
      department: 'Cardiology',
      unit: 'Clinical',
      designation: 'Nurse',
      shifts: {
        ...empty,
        [d[0]]: cell('E'),
        [d[1]]: cell('E'),
        [d[2]]: cell('E'),
        [d[3]]: cell('O'),
        [d[4]]: cell('N'),
        [d[5]]: cell('N'),
        [d[6]]: cell('O')
      },
      totalHours: 48,
      otHours: 8,
      status: 'pending_approval'
    },
    {
      id: 'row-4',
      staffCode: 'ST-1305',
      staffName: 'A. Silva',
      department: 'Lab',
      unit: 'Support',
      designation: 'Lab Technician',
      shifts: {
        ...empty,
        [d[0]]: cell('D'),
        [d[1]]: cell('D'),
        [d[2]]: cell('D'),
        [d[3]]: cell('D'),
        [d[4]]: cell('D'),
        [d[5]]: null,
        [d[6]]: cell('O')
      },
      totalHours: 40,
      otHours: 0,
      status: 'published'
    },
    {
      id: 'row-5',
      staffCode: 'ST-0877',
      staffName: 'K. Jayasinghe',
      department: 'Ward 3',
      unit: 'Nursing',
      designation: 'Staff Nurse',
      shifts: {
        ...empty,
        [d[0]]: cell('O'),
        [d[1]]: cell('D'),
        [d[2]]: cell('D'),
        [d[3]]: cell('E'),
        [d[4]]: cell('E'),
        [d[5]]: cell('N'),
        [d[6]]: cell('N')
      },
      totalHours: 48,
      otHours: 4,
      status: 'draft'
    },
    {
      id: 'row-6',
      staffCode: 'ST-1510',
      staffName: 'M. Bandara',
      department: 'Emergency',
      unit: 'Nursing',
      designation: 'Junior Nurse',
      shifts: {
        ...empty,
        [d[0]]: cell('D'),
        [d[1]]: cell('O'),
        [d[2]]: cell('L', true),
        [d[3]]: cell('D'),
        [d[4]]: cell('D'),
        [d[5]]: cell('D'),
        [d[6]]: cell('E')
      },
      totalHours: 40,
      otHours: 0,
      status: 'published'
    }
  ];
}

/** Total records for pagination chrome (mock). */
export const SAMPLE_ROSTER_TOTAL_RECORDS = 248;
