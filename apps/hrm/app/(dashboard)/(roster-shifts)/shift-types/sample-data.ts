export type ShiftTypeStatus = 'active' | 'inactive';

export type ShiftTypeFilterOption = {
  id: string;
  name: string;
};

export type ShiftTypeSample = {
  id: string;
  code: string;
  name: string;
  category: string;
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
  status: ShiftTypeStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type ShiftTypeHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type ShiftTypeSummarySample = {
  total: number;
  categories: number;
  active: number;
  nightOrOvernight: number;
  holidayEligible: number;
};

export const SAMPLE_SHIFT_CATEGORIES: ShiftTypeFilterOption[] = [
  { id: 'general', name: 'General' },
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'rotational', name: 'Rotational' },
  { id: 'night', name: 'Night' },
  { id: 'overnight', name: 'Overnight' },
  { id: 'holiday', name: 'Holiday' }
];

export const SAMPLE_YES_NO_OPTIONS: ShiftTypeFilterOption[] = [
  { id: 'yes', name: 'Yes' },
  { id: 'no', name: 'No' }
];

export const SAMPLE_STATUS_OPTIONS: ShiftTypeFilterOption[] = [
  { id: 'active', name: 'Active' },
  { id: 'inactive', name: 'Inactive' }
];

export const SAMPLE_SHIFT_TYPE_SUMMARY: ShiftTypeSummarySample = {
  total: 24,
  categories: 7,
  active: 21,
  nightOrOvernight: 6,
  holidayEligible: 15
};

export const SAMPLE_SHIFT_TYPES: ShiftTypeSample[] = [
  {
    id: 'st-1',
    code: 'SHF-1',
    name: 'Day Shift',
    category: 'General',
    startTime: '07:00',
    endTime: '15:00',
    breakMinutes: 60,
    durationHours: 7,
    graceMinutes: 10,
    lateThresholdMinutes: 15,
    earlyExitThresholdMinutes: 10,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: true,
    status: 'active',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'st-2',
    code: 'SHF-2',
    name: 'Evening Shift',
    category: 'Nursing',
    startTime: '15:00',
    endTime: '23:00',
    breakMinutes: 45,
    durationHours: 7.3,
    graceMinutes: 10,
    lateThresholdMinutes: 15,
    earlyExitThresholdMinutes: 10,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: true,
    status: 'active',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:20:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-12T09:20:00'
  },
  {
    id: 'st-3',
    code: 'SHF-3',
    name: 'Night Shift',
    category: 'Night',
    startTime: '23:00',
    endTime: '07:00',
    breakMinutes: 60,
    durationHours: 7,
    graceMinutes: 15,
    lateThresholdMinutes: 20,
    earlyExitThresholdMinutes: 15,
    isNightShift: true,
    isOvernight: true,
    holidayEligible: true,
    status: 'active',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-13T10:05:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-20T11:12:00'
  },
  {
    id: 'st-4',
    code: 'SHF-4',
    name: 'Long Day',
    category: 'Emergency',
    startTime: '07:00',
    endTime: '19:00',
    breakMinutes: 60,
    durationHours: 11,
    graceMinutes: 10,
    lateThresholdMinutes: 15,
    earlyExitThresholdMinutes: 10,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: false,
    status: 'active',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-14T08:30:00'
  },
  {
    id: 'st-5',
    code: 'SHF-5',
    name: 'Off Duty',
    category: 'General',
    startTime: '00:00',
    endTime: '00:00',
    breakMinutes: 0,
    durationHours: 0,
    graceMinutes: 0,
    lateThresholdMinutes: 0,
    earlyExitThresholdMinutes: 0,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: false,
    status: 'active',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:40:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-14T08:40:00'
  },
  {
    id: 'st-6',
    code: 'SHF-6',
    name: 'Holiday Cover',
    category: 'Holiday',
    startTime: '08:00',
    endTime: '20:00',
    breakMinutes: 60,
    durationHours: 11,
    graceMinutes: 10,
    lateThresholdMinutes: 15,
    earlyExitThresholdMinutes: 10,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: true,
    status: 'inactive',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-15T16:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-22T09:00:00'
  },
  {
    id: 'st-7',
    code: 'SHF-7',
    name: 'Support Overnight',
    category: 'Overnight',
    startTime: '20:00',
    endTime: '08:00',
    breakMinutes: 60,
    durationHours: 11,
    graceMinutes: 15,
    lateThresholdMinutes: 20,
    earlyExitThresholdMinutes: 15,
    isNightShift: true,
    isOvernight: true,
    holidayEligible: true,
    status: 'active',
    createdBy: 'N. Silva',
    createdAt: '2025-08-16T11:22:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-16T11:22:00'
  }
];

/** Parse HH:mm → minutes from midnight. */
function timeToMinutesOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

/** Auto total working hours from start/end/break (overnight when flagged or end ≤ start). */
export function calcTotalWorkingHours(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  isOvernight: boolean
): number {
  const start = timeToMinutesOfDay(startTime);
  const end = timeToMinutesOfDay(endTime);
  if (start === null || end === null) return 0;

  let span = end - start;
  if (isOvernight || span <= 0) {
    span += 24 * 60;
  }

  const worked = Math.max(0, span - Math.max(0, breakMinutes || 0));
  return Math.round((worked / 60) * 10) / 10;
}

export function getSampleShiftTypeById(
  id: string
): ShiftTypeSample | undefined {
  return SAMPLE_SHIFT_TYPES.find((row) => row.id === id);
}

export function getSampleShiftTypeHistory(
  record: ShiftTypeSample
): ShiftTypeHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Shift type updated',
      detail: `Timings or rules changed for ${record.name} (${record.code}).`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${record.status === 'active' ? 'Active' : 'Inactive'}.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Shift type created',
      detail: `${record.name} (${record.code}) added to the shift master.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
