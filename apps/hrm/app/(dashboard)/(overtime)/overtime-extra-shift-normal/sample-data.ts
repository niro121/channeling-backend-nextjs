export type ExtraShiftNormalRecord = {
  id: string;
  formNumber: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  roster: string;
  shiftStart: string;
  shiftEnd: string;
  fromAt: string;
  toAt: string;
  approverId: string;
  approverName: string;
  approvedAt: string | null;
  comment: string;
  createdByName: string;
  createdByPosition?: string;
  updatedByName: string;
  updatedByPosition?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExtraShiftNormalFilterOption = {
  id: string;
  name: string;
};

export const SAMPLE_EXTRA_SHIFT_NORMAL_STAFF: ExtraShiftNormalFilterOption[] = [
  { id: 'st-1', name: 'ST-1 — MR. DUSHAN MADURANGA' },
  { id: 'st-2', name: 'ST-2 — MS. N. FERNANDO' },
  { id: 'st-3', name: 'ST-3 — R. Perera' }
];

export const SAMPLE_EXTRA_SHIFT_NORMAL_APPROVERS: ExtraShiftNormalFilterOption[] =
  [
    { id: 'ap-1', name: 'K. Silva' },
    { id: 'ap-2', name: 'N. Silva (HR Officer)' }
  ];

export const SAMPLE_EXTRA_SHIFT_NORMAL_RECORDS: ExtraShiftNormalRecord[] = [
  {
    id: 'es-0091',
    formNumber: 'ES-0091',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W3',
    shiftStart: '07:00',
    shiftEnd: '15:00',
    fromAt: '2026-04-08T07:00:00',
    toAt: '2026-04-08T15:00:00',
    approverId: 'ap-1',
    approverName: 'K. Silva',
    approvedAt: '2026-04-07T10:00:00',
    comment: 'Weekend cover',
    createdByName: 'N. Silva',
    createdByPosition: 'HR Officer',
    updatedByName: 'K. Fernando',
    updatedByPosition: 'Payroll Admin',
    createdAt: '2026-04-06T09:14:00',
    updatedAt: '2026-04-07T15:42:00'
  },
  {
    id: 'es-0092',
    formNumber: 'ES-0092',
    staffId: 'st-1',
    staffCode: 'ST-1',
    staffName: 'MR. DUSHAN MADURANGA',
    roster: 'Nursing - W1',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    fromAt: '2026-04-10T08:30:00',
    toAt: '2026-04-10T16:30:00',
    approverId: '',
    approverName: '',
    approvedAt: null,
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-09T16:35:00',
    updatedAt: '2026-04-09T16:35:00'
  }
];

export type ExtraShiftNormalListFilters = {
  staffId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
};

export function filterExtraShiftNormalRecords(
  records: ExtraShiftNormalRecord[],
  filters: ExtraShiftNormalListFilters
): ExtraShiftNormalRecord[] {
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
