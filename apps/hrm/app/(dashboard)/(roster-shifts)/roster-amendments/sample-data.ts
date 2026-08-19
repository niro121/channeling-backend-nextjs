export type AmendmentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected';

export type AmendmentTypeId =
  | 'shift_change'
  | 'shift_swap'
  | 'staff_replacement'
  | 'duty_cancellation'
  | 'location_change'
  | 'extra_duty';

export type AmendmentFilterOption = {
  id: string;
  name: string;
};

export type AmendmentShiftOption = AmendmentFilterOption & {
  label: string;
};

export type AmendmentStaffOption = AmendmentFilterOption & {
  staffCode: string;
  originalShiftId: string;
  originalShiftLabel: string;
  department: string;
};

export type RosterAmendmentSample = {
  id: string;
  amendmentNo: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  rosterDate: string;
  originalShiftId: string;
  originalShift: string;
  amendedShiftId: string;
  amendedShift: string;
  amendmentTypeId: AmendmentTypeId;
  amendmentType: string;
  reason: string;
  requestedById: string;
  requestedBy: string;
  status: AmendmentStatus;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type AmendmentHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type AmendmentSummarySample = {
  totalAmendments: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
};

export const NEXT_AMENDMENT_NO = 'AMD-2026-0143';

export const SAMPLE_AMENDMENT_DEPARTMENTS: AmendmentFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'clinical', name: 'Clinical' }
];

export const SAMPLE_AMENDMENT_TYPES: AmendmentFilterOption[] = [
  { id: 'shift_change', name: 'Shift Change' },
  { id: 'shift_swap', name: 'Shift Swap' },
  { id: 'staff_replacement', name: 'Staff Replacement' },
  { id: 'duty_cancellation', name: 'Duty Cancellation' },
  { id: 'location_change', name: 'Location Change' },
  { id: 'extra_duty', name: 'Extra Duty' }
];

export const SAMPLE_AMENDMENT_STATUS: AmendmentFilterOption[] = [
  { id: 'draft', name: 'Draft' },
  { id: 'pending_approval', name: 'Pending Approval' },
  { id: 'approved', name: 'Approved' },
  { id: 'rejected', name: 'Rejected' }
];

export const SAMPLE_AMENDMENT_SHIFTS: AmendmentShiftOption[] = [
  {
    id: 'st-day',
    name: 'Day Shift',
    label: 'Day Shift (07:00–15:00)'
  },
  {
    id: 'st-evening',
    name: 'Evening Shift',
    label: 'Evening Shift (15:00–23:00)'
  },
  {
    id: 'st-night',
    name: 'Night Shift',
    label: 'Night Shift (23:00–07:00)'
  },
  {
    id: 'st-fixed',
    name: 'Fixed 09:00–17:00',
    label: 'Fixed 09:00–17:00'
  }
];

export const SAMPLE_AMENDMENT_STAFF: AmendmentStaffOption[] = [
  {
    id: 'staff-1',
    name: 'N. Fernando (RHM-N-118)',
    staffCode: 'RHM-N-118',
    originalShiftId: 'st-day',
    originalShiftLabel: 'Day Shift (07:00–15:00)',
    department: 'Nursing'
  },
  {
    id: 'staff-2',
    name: 'S. Wijesinghe (RHM-N-204)',
    staffCode: 'RHM-N-204',
    originalShiftId: 'st-night',
    originalShiftLabel: 'Night Shift (23:00–07:00)',
    department: 'Nursing'
  },
  {
    id: 'staff-3',
    name: 'R. Perera (RHM-E-091)',
    staffCode: 'RHM-E-091',
    originalShiftId: 'st-evening',
    originalShiftLabel: 'Evening Shift (15:00–23:00)',
    department: 'Emergency'
  },
  {
    id: 'staff-4',
    name: 'A. Silva (RHM-L-055)',
    staffCode: 'RHM-L-055',
    originalShiftId: 'st-fixed',
    originalShiftLabel: 'Fixed 09:00–17:00',
    department: 'Laboratory'
  },
  {
    id: 'staff-5',
    name: 'K. Jayasinghe (RHM-N-133)',
    staffCode: 'RHM-N-133',
    originalShiftId: 'st-day',
    originalShiftLabel: 'Day Shift (07:00–15:00)',
    department: 'Nursing'
  },
  {
    id: 'staff-6',
    name: 'M. Bandara (RHM-N-177)',
    staffCode: 'RHM-N-177',
    originalShiftId: 'st-fixed',
    originalShiftLabel: 'Fixed 09:00–17:00',
    department: 'Clinical'
  }
];

export const SAMPLE_AMENDMENT_REQUESTERS: AmendmentFilterOption[] = [
  { id: 'req-1', name: 'Sr. K. Jayasuriya' },
  { id: 'req-2', name: 'Dr. P. Bandara' },
  { id: 'req-3', name: 'N. Silva (HR Officer)' },
  { id: 'req-4', name: 'Administrator' }
];

export const SAMPLE_AMENDMENT_SUMMARY: AmendmentSummarySample = {
  totalAmendments: 142,
  pendingApproval: 9,
  approved: 121,
  rejected: 12
};

export const SAMPLE_AMENDMENT_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00'
};

export const SAMPLE_ROSTER_AMENDMENTS: RosterAmendmentSample[] = [
  {
    id: 'amd-1',
    amendmentNo: 'AMD-2026-0142',
    staffId: 'staff-1',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    department: 'Nursing',
    rosterDate: '2026-08-12',
    originalShiftId: 'st-day',
    originalShift: 'Day Shift',
    amendedShiftId: 'st-evening',
    amendedShift: 'Evening Shift',
    amendmentTypeId: 'shift_change',
    amendmentType: 'Shift Change',
    reason: 'ICU staffing shortfall',
    requestedById: 'req-1',
    requestedBy: 'Sr. K. Jayasuriya',
    status: 'pending_approval',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'amd-2',
    amendmentNo: 'AMD-2026-0141',
    staffId: 'staff-2',
    staffCode: 'RHM-N-204',
    staffName: 'S. Wijesinghe',
    department: 'Nursing',
    rosterDate: '2026-08-12',
    originalShiftId: 'st-night',
    originalShift: 'Night Shift',
    amendedShiftId: 'st-day',
    amendedShift: 'Day Shift',
    amendmentTypeId: 'shift_swap',
    amendmentType: 'Shift Swap',
    reason: 'Mutual swap — family commitment',
    requestedById: 'req-2',
    requestedBy: 'Dr. P. Bandara',
    status: 'approved',
    remarks: 'Applied to roster',
    createdBy: 'N. Silva',
    createdAt: '2025-08-11T10:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-16T11:20:00'
  },
  {
    id: 'amd-3',
    amendmentNo: 'AMD-2026-0140',
    staffId: 'staff-3',
    staffCode: 'RHM-E-091',
    staffName: 'R. Perera',
    department: 'Emergency',
    rosterDate: '2026-08-13',
    originalShiftId: 'st-evening',
    originalShift: 'Evening Shift',
    amendedShiftId: '',
    amendedShift: '—',
    amendmentTypeId: 'duty_cancellation',
    amendmentType: 'Duty Cancellation',
    reason: 'Medical leave',
    requestedById: 'req-1',
    requestedBy: 'Sr. K. Jayasuriya',
    status: 'pending_approval',
    remarks: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-13T11:20:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-20T09:10:00'
  },
  {
    id: 'amd-4',
    amendmentNo: 'AMD-2026-0139',
    staffId: 'staff-4',
    staffCode: 'RHM-L-055',
    staffName: 'A. Silva',
    department: 'Laboratory',
    rosterDate: '2026-08-14',
    originalShiftId: 'st-fixed',
    originalShift: 'Fixed 09:00–17:00',
    amendedShiftId: 'st-fixed',
    amendedShift: 'Fixed 09:00–17:00',
    amendmentTypeId: 'location_change',
    amendmentType: 'Location Change',
    reason: 'Cover pathology overflow',
    requestedById: 'req-4',
    requestedBy: 'Administrator',
    status: 'rejected',
    remarks: 'Original roster retained',
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-15T16:00:00'
  },
  {
    id: 'amd-5',
    amendmentNo: 'AMD-2026-0138',
    staffId: 'staff-5',
    staffCode: 'RHM-N-133',
    staffName: 'K. Jayasinghe',
    department: 'Nursing',
    rosterDate: '2026-08-15',
    originalShiftId: 'st-day',
    originalShift: 'Day Shift',
    amendedShiftId: 'st-evening',
    amendedShift: 'Evening Shift',
    amendmentTypeId: 'extra_duty',
    amendmentType: 'Extra Duty',
    reason: 'Ward 7 short-staffed',
    requestedById: 'req-1',
    requestedBy: 'Sr. K. Jayasuriya',
    status: 'approved',
    remarks: '',
    createdBy: 'K. Fernando',
    createdAt: '2025-08-15T14:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-22T09:00:00'
  },
  {
    id: 'amd-6',
    amendmentNo: 'AMD-2026-0137',
    staffId: 'staff-6',
    staffCode: 'RHM-N-177',
    staffName: 'M. Bandara',
    department: 'Clinical',
    rosterDate: '2026-08-16',
    originalShiftId: 'st-fixed',
    originalShift: 'Fixed 09:00–17:00',
    amendedShiftId: 'st-day',
    amendedShift: 'Day Shift',
    amendmentTypeId: 'shift_change',
    amendmentType: 'Shift Change',
    reason: 'OPD cover',
    requestedById: 'req-3',
    requestedBy: 'N. Silva (HR Officer)',
    status: 'draft',
    remarks: '',
    createdBy: 'N. Silva',
    createdAt: '2025-08-16T11:22:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-16T11:22:00'
  }
];

export function isAmendmentLocked(status: AmendmentStatus): boolean {
  return status === 'approved' || status === 'rejected';
}

export function getSampleAmendmentHistory(
  record: RosterAmendmentSample
): AmendmentHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Amendment updated',
      detail: `${record.amendmentNo} changed for ${record.staffName} (${record.staffCode}).`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${
        SAMPLE_AMENDMENT_STATUS.find((s) => s.id === record.status)?.name ??
        record.status
      }.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Created',
      detail: `${record.amendmentType} raised for ${record.staffName}.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
