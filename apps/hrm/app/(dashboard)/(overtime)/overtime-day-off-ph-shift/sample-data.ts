export const EXTRA_SHIFT_TYPES = ['DO', 'PH'] as const;
export type ExtraShiftType = (typeof EXTRA_SHIFT_TYPES)[number];

export type ExtraShiftRecord = {
  id: string;
  formNumber: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  roster: string;
  shiftType: ExtraShiftType;
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

export type ExtraShiftFilterOption = {
  id: string;
  name: string;
};

export const SAMPLE_EXTRA_SHIFT_STAFF: ExtraShiftFilterOption[] = [
  { id: 'st-1', name: 'ST-1 — MR. DUSHAN MADURANGA' },
  { id: 'st-2', name: 'ST-2 — MS. N. FERNANDO' },
  { id: 'st-3', name: 'ST-3 — R. Perera' }
];

export const SAMPLE_EXTRA_SHIFT_APPROVERS: ExtraShiftFilterOption[] = [
  { id: 'ap-1', name: 'K. Silva' },
  { id: 'ap-2', name: 'N. Silva (HR Officer)' }
];

export const SAMPLE_EXTRA_SHIFT_RECORDS: ExtraShiftRecord[] = [
  {
    id: 'do-321',
    formNumber: 'DO-321',
    staffId: 'st-2',
    staffCode: 'ST-2',
    staffName: 'MS. N. FERNANDO',
    roster: 'Nursing - W3',
    shiftType: 'DO',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    fromAt: '2026-04-18T00:00:00',
    toAt: '2026-04-18T08:30:00',
    approverId: 'ap-1',
    approverName: 'K. Silva',
    approvedAt: '2026-04-17T10:00:00',
    comment: 'Poya day cover',
    createdByName: 'N. Silva',
    createdByPosition: 'HR Officer',
    updatedByName: 'K. Fernando',
    updatedByPosition: 'Payroll Admin',
    createdAt: '2026-04-16T09:14:00',
    updatedAt: '2026-04-17T15:42:00'
  },
  {
    id: 'ph-118',
    formNumber: 'PH-118',
    staffId: 'st-1',
    staffCode: 'ST-1',
    staffName: 'MR. DUSHAN MADURANGA',
    roster: 'Nursing - W1',
    shiftType: 'PH',
    shiftStart: '08:30',
    shiftEnd: '16:30',
    fromAt: '2026-04-13T00:00:00',
    toAt: '2026-04-13T16:30:00',
    approverId: '',
    approverName: '',
    approvedAt: null,
    comment: 'Pending',
    createdByName: 'System',
    updatedByName: 'System',
    createdAt: '2026-04-12T16:35:00',
    updatedAt: '2026-04-12T16:35:00'
  }
];

export type ExtraShiftListFilters = {
  staffId?: string;
  approverId?: string;
  fromDate?: string;
  toDate?: string;
};

export function filterExtraShiftRecords(
  records: ExtraShiftRecord[],
  filters: ExtraShiftListFilters
): ExtraShiftRecord[] {
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
