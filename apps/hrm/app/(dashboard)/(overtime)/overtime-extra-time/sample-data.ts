export const EXTRA_TIME_TIME_TYPES = ['outTime', 'inTime'] as const;
export type ExtraTimeTimeType = (typeof EXTRA_TIME_TIME_TYPES)[number];

export type ExtraTimeRecord = {
  id: string;
  formNumber: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  roster: string;
  shiftId: string;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  timeType: ExtraTimeTimeType;
  fromAt: string;
  toAt: string;
  approverId: string;
  approverName: string;
  comment: string;
  createdByName: string;
  createdByPosition?: string;
  updatedByName: string;
  updatedByPosition?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExtraTimeFilterOption = {
  id: string;
  name: string;
};

export const SAMPLE_EXTRA_TIME_STAFF: ExtraTimeFilterOption[] = [
  { id: 'st-1', name: 'ST-1 — MR. DUSHAN MADURANGA' },
  { id: 'st-2', name: 'ST-2 — MS. N. FERNANDO' },
  { id: 'st-3', name: 'ST-3 — R. Perera' }
];

export const SAMPLE_EXTRA_TIME_APPROVERS: ExtraTimeFilterOption[] = [
  { id: 'ap-1', name: 'K. Silva' },
  { id: 'ap-2', name: 'N. Silva (HR Officer)' }
];

export const SAMPLE_EXTRA_TIME_SHIFTS: ExtraTimeFilterOption[] = [
  { id: 'shift-830-430', name: '8.30-4.30' },
  { id: 'shift-700-300', name: '7.00-3.00' },
  { id: 'shift-night', name: '19.00-07.00' }
];

export const SAMPLE_EXTRA_TIME_RECORDS: ExtraTimeRecord[] = [
  {
    id: 'aet-142',
    formNumber: 'AET-142',
    staffId: 'st-1',
    staffCode: 'ST-1',
    staffName: 'MR. DUSHAN MADURANGA',
    roster: 'Nursing - W3',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T18:00:00',
    approverId: 'ap-1',
    approverName: 'K. Silva',
    comment: 'OT Ward Cover',
    createdByName: 'N. Silva',
    createdByPosition: 'HR Officer',
    updatedByName: 'K. Fernando',
    updatedByPosition: 'Payroll Admin',
    createdAt: '2025-08-12T09:14:00',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
  {
    id: 'aet-143',
    formNumber: 'AET-143',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W1',
    shiftId: 'shift-830-430',
    shiftLabel: '8.30-4.30',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    timeType: 'outTime',
    fromAt: '2026-04-08T16:30:00',
    toAt: '2026-04-08T17:30:00',
    approverId: '',
    approverName: '',
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-08T16:35:00',
    updatedAt: '2026-04-08T16:35:00'
  },
];

export type ExtraTimeListFilters = {
  staffId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
};

export function filterExtraTimeRecords(
  records: ExtraTimeRecord[],
  filters: ExtraTimeListFilters
): ExtraTimeRecord[] {
  return records.filter((record) => {
    if (filters.staffId && record.staffId !== filters.staffId) return false;
    if (filters.approverId && record.approverId !== filters.approverId) {
      return false;
    }
    const day = record.fromAt.slice(0, 10);
    if (filters.fromDate && day < filters.fromDate) return false;
    if (filters.toDate && day > filters.toDate) return false;
    return true;
  });
}
