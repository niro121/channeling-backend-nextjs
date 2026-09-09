export const OVERTIME_REQUEST_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'cancelled'
] as const;

export type OvertimeRequestStatus = (typeof OVERTIME_REQUEST_STATUSES)[number];

export type OvertimeRequestSample = {
  id: string;
  staffCode: string;
  staffName: string;
  department: string;
  otDate: string;
  hours: number;
  reason: string;
  status: OvertimeRequestStatus;
};

export type OvertimeSummarySample = {
  pending: number;
  approvedMonth: number;
  totalHours: number;
  costLabel: string;
};

/** Phase 0 mock totals — replace in Phase 4. */
export const SAMPLE_OT_SUMMARY: OvertimeSummarySample = {
  pending: 9,
  approvedMonth: 146,
  totalHours: 2140,
  costLabel: 'LKR 1.8M'
};

/** Phase 0 mock rows — match the OT dashboard design. */
export const SAMPLE_OT_REQUESTS: OvertimeRequestSample[] = [
  {
    id: 'ot-sample-1',
    staffCode: 'ST-1',
    staffName: 'N. Fernando',
    department: 'Ward 3',
    otDate: '2026-08-13',
    hours: 4,
    reason: 'Ward coverage',
    status: 'pending'
  },
  {
    id: 'ot-sample-2',
    staffCode: 'ST-2',
    staffName: 'S. Wijesinghe',
    department: 'Emergency',
    otDate: '2026-08-12',
    hours: 6,
    reason: 'Emergency intake',
    status: 'approved'
  },
  {
    id: 'ot-sample-3',
    staffCode: 'ST-3',
    staffName: 'R. Perera',
    department: 'Cardiology',
    otDate: '2026-08-12',
    hours: 3,
    reason: 'Night shift extension',
    status: 'pending'
  },
  {
    id: 'ot-sample-4',
    staffCode: 'ST-4',
    staffName: 'A. Silva',
    department: 'Lab',
    otDate: '2026-08-11',
    hours: 5,
    reason: 'Additional consultation',
    status: 'rejected'
  },
  {
    id: 'ot-sample-5',
    staffCode: 'ST-5',
    staffName: 'K. Jayasinghe',
    department: 'Ward 3',
    otDate: '2026-08-11',
    hours: 4,
    reason: 'Sample backlog',
    status: 'approved'
  }
];
