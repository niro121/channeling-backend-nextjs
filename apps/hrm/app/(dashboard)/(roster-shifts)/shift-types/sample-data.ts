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
  durationHours: number;
  isNightShift: boolean;
  isOvernight: boolean;
  holidayEligible: boolean;
  status: ShiftTypeStatus;
  createdByLabel: string;
  createdAtLabel: string;
  updatedByLabel: string;
  updatedAtLabel: string;
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
  { id: 'holiday', name: 'Holiday' },
  { id: 'clinical', name: 'Clinical' },
  { id: 'support', name: 'Support' }
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
    code: 'SHF-001',
    name: 'Day Shift',
    category: 'General',
    startTime: '07:00',
    endTime: '15:00',
    durationHours: 8,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: true,
    status: 'active',
    createdByLabel: 'N. Silva',
    createdAtLabel: '12 Aug 2025 - 09:14',
    updatedByLabel: 'K. Fernando',
    updatedAtLabel: '18 Aug 2025 - 15:42'
  },
  {
    id: 'st-2',
    code: 'SHF-002',
    name: 'Evening Shift',
    category: 'General',
    startTime: '15:00',
    endTime: '23:00',
    durationHours: 8,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: true,
    status: 'active',
    createdByLabel: 'N. Silva',
    createdAtLabel: '12 Aug 2025 - 09:20',
    updatedByLabel: 'N. Silva',
    updatedAtLabel: '12 Aug 2025 - 09:20'
  },
  {
    id: 'st-3',
    code: 'SHF-003',
    name: 'Night Shift',
    category: 'Nursing',
    startTime: '23:00',
    endTime: '07:00',
    durationHours: 8,
    isNightShift: true,
    isOvernight: true,
    holidayEligible: true,
    status: 'active',
    createdByLabel: 'K. Fernando',
    createdAtLabel: '13 Aug 2025 - 10:05',
    updatedByLabel: 'K. Fernando',
    updatedAtLabel: '20 Aug 2025 - 11:12'
  },
  {
    id: 'st-4',
    code: 'SHF-004',
    name: 'Long Day',
    category: 'Clinical',
    startTime: '07:00',
    endTime: '19:00',
    durationHours: 12,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: false,
    status: 'active',
    createdByLabel: 'N. Silva',
    createdAtLabel: '14 Aug 2025 - 08:30',
    updatedByLabel: 'N. Silva',
    updatedAtLabel: '14 Aug 2025 - 08:30'
  },
  {
    id: 'st-5',
    code: 'SHF-005',
    name: 'Off Duty',
    category: 'General',
    startTime: '00:00',
    endTime: '00:00',
    durationHours: 0,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: false,
    status: 'active',
    createdByLabel: 'N. Silva',
    createdAtLabel: '14 Aug 2025 - 08:40',
    updatedByLabel: 'N. Silva',
    updatedAtLabel: '14 Aug 2025 - 08:40'
  },
  {
    id: 'st-6',
    code: 'SHF-006',
    name: 'Holiday Cover',
    category: 'Holiday',
    startTime: '08:00',
    endTime: '20:00',
    durationHours: 12,
    isNightShift: false,
    isOvernight: false,
    holidayEligible: true,
    status: 'inactive',
    createdByLabel: 'K. Fernando',
    createdAtLabel: '15 Aug 2025 - 16:00',
    updatedByLabel: 'K. Fernando',
    updatedAtLabel: '22 Aug 2025 - 09:00'
  },
  {
    id: 'st-7',
    code: 'SHF-007',
    name: 'Support Overnight',
    category: 'Support',
    startTime: '20:00',
    endTime: '08:00',
    durationHours: 12,
    isNightShift: true,
    isOvernight: true,
    holidayEligible: true,
    status: 'active',
    createdByLabel: 'N. Silva',
    createdAtLabel: '16 Aug 2025 - 11:22',
    updatedByLabel: 'N. Silva',
    updatedAtLabel: '16 Aug 2025 - 11:22'
  }
];

export function getSampleShiftTypeById(
  id: string
): ShiftTypeSample | undefined {
  return SAMPLE_SHIFT_TYPES.find((row) => row.id === id);
}
