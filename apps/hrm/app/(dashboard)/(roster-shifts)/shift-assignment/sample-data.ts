export type ShiftAssignmentStatus = 'active' | 'pending' | 'inactive';

export type ShiftAssignmentFilterOption = {
  id: string;
  name: string;
};

export type ShiftAssignmentSample = {
  id: string;
  staffId: string;
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  designation: string;
  assignedShift: string;
  shiftTypeId: string;
  rotationPatternId: string;
  rotationPattern: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  weeklyOffDayId: string;
  status: ShiftAssignmentStatus;
  autoAssign: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type ShiftAssignmentHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type ShiftAssignmentSummarySample = {
  assignedStaff: number;
  activeStaffTotal: number;
  unassigned: number;
  rotationPatterns: number;
  expiringSoon: number;
};

export const SAMPLE_INSTITUTIONS: ShiftAssignmentFilterOption[] = [
  { id: 'ruhunu', name: 'Ruhunu Hospitals' },
  { id: 'city', name: 'City Campus' }
];

export const SAMPLE_DEPARTMENTS: ShiftAssignmentFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'emergency', name: 'Emergency' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'clinical', name: 'Clinical' }
];

export const SAMPLE_UNITS: ShiftAssignmentFilterOption[] = [
  { id: 'ward-3', name: 'Ward 3' },
  { id: 'icu', name: 'ICU' },
  { id: 'etu', name: 'ETU' },
  { id: 'pathology', name: 'Pathology' }
];

export const SAMPLE_DESIGNATIONS: ShiftAssignmentFilterOption[] = [
  { id: 'staff-nurse', name: 'Staff Nurse' },
  { id: 'senior-nurse', name: 'Senior Nurse' },
  { id: 'consultant', name: 'Consultant' },
  { id: 'mlt', name: 'MLT' }
];

export const SAMPLE_STAFF_CATEGORIES: ShiftAssignmentFilterOption[] = [
  { id: 'nursing', name: 'Nursing' },
  { id: 'medical', name: 'Medical' },
  { id: 'allied', name: 'Allied Health' }
];

export const SAMPLE_STAFF_GRADES: ShiftAssignmentFilterOption[] = [
  { id: 'g1', name: 'Grade I' },
  { id: 'g2', name: 'Grade II' },
  { id: 'g3', name: 'Grade III' }
];

export const SAMPLE_EMPLOYEE_STATUS: ShiftAssignmentFilterOption[] = [
  { id: 'active', name: 'Active' },
  { id: 'probation', name: 'Probation' },
  { id: 'inactive', name: 'Inactive' }
];

export const SAMPLE_ASSIGNMENT_STATUS: ShiftAssignmentFilterOption[] = [
  { id: 'active', name: 'Active' },
  { id: 'pending', name: 'Pending' },
  { id: 'inactive', name: 'Inactive' }
];

export const SAMPLE_ROTATION_PATTERNS: ShiftAssignmentFilterOption[] = [
  { id: 'fixed', name: 'Fixed' },
  { id: '2-shift', name: '2-Shift Rotation' },
  { id: '3-shift', name: '3-Shift Rotation' },
  { id: '4-on-2-off', name: '4 On 2 Off' },
  { id: 'weekly', name: 'Weekly Rotation' },
  { id: 'custom', name: 'Custom' }
];

export const SAMPLE_WEEKLY_OFF_DAYS: ShiftAssignmentFilterOption[] = [
  { id: 'monday', name: 'Monday' },
  { id: 'tuesday', name: 'Tuesday' },
  { id: 'wednesday', name: 'Wednesday' },
  { id: 'thursday', name: 'Thursday' },
  { id: 'friday', name: 'Friday' },
  { id: 'saturday', name: 'Saturday' },
  { id: 'sunday', name: 'Sunday' }
];

export const SAMPLE_SHIFT_TYPES: ShiftAssignmentFilterOption[] = [
  { id: 'st-day', name: 'Day Shift' },
  { id: 'st-evening', name: 'Evening Shift' },
  { id: 'st-night', name: 'Night Shift' },
  { id: 'st-overnight', name: 'Overnight 12 Hr' },
  { id: 'st-general', name: '8.30–5.00 General' },
  { id: 'st-3shift', name: '3-Shift Rotation' },
  { id: 'st-fixed', name: 'Fixed' }
];

export const SAMPLE_STAFF_OPTIONS: ShiftAssignmentFilterOption[] = [
  { id: 'staff-1', name: 'N. Fernando (RHM-N-118)' },
  { id: 'staff-2', name: 'S. Wijesinghe (RHM-N-204)' },
  { id: 'staff-3', name: 'R. Perera (RHM-E-091)' },
  { id: 'staff-4', name: 'A. Silva (RHM-L-055)' },
  { id: 'staff-5', name: 'K. Jayasinghe (RHM-N-133)' },
  { id: 'staff-6', name: 'M. Bandara (RHM-N-177)' }
];

export const SAMPLE_ASSIGNMENT_SUMMARY: ShiftAssignmentSummarySample = {
  assignedStaff: 238,
  activeStaffTotal: 248,
  unassigned: 10,
  rotationPatterns: 6,
  expiringSoon: 17
};

export const SAMPLE_ASSIGNMENT_AUDIT = {
  createdBy: 'N. Silva (HR Officer)',
  createdAt: '2025-08-12T09:14:00',
  updatedBy: 'K. Fernando (Payroll Admin)',
  updatedAt: '2025-08-18T15:42:00'
};

export const SAMPLE_SHIFT_ASSIGNMENTS: ShiftAssignmentSample[] = [
  {
    id: 'sa-1',
    staffId: 'staff-1',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    department: 'Nursing',
    unit: 'Ward 3',
    designation: 'Staff Nurse',
    assignedShift: '3-Shift Rotation',
    shiftTypeId: 'st-3shift',
    rotationPatternId: '3-shift',
    rotationPattern: '3-Shift Rotation',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    weeklyOffDayId: 'sunday',
    status: 'active',
    autoAssign: true,
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T09:14:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-18T15:42:00'
  },
  {
    id: 'sa-2',
    staffId: 'staff-2',
    staffCode: 'RHM-N-204',
    staffName: 'S. Wijesinghe',
    department: 'Nursing',
    unit: 'ICU',
    designation: 'Senior Nurse',
    assignedShift: 'Night Shift',
    shiftTypeId: 'st-night',
    rotationPatternId: 'fixed',
    rotationPattern: 'Fixed',
    effectiveFrom: '2025-02-01',
    effectiveTo: '2025-12-31',
    weeklyOffDayId: 'monday',
    status: 'active',
    autoAssign: true,
    createdBy: 'N. Silva',
    createdAt: '2025-08-12T10:00:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-12T10:00:00'
  },
  {
    id: 'sa-3',
    staffId: 'staff-3',
    staffCode: 'RHM-E-091',
    staffName: 'R. Perera',
    department: 'Emergency',
    unit: 'ETU',
    designation: 'Consultant',
    assignedShift: 'Overnight 12 Hr',
    shiftTypeId: 'st-overnight',
    rotationPatternId: '4-on-2-off',
    rotationPattern: '4 On 2 Off',
    effectiveFrom: '2025-01-15',
    effectiveTo: null,
    weeklyOffDayId: 'sunday',
    status: 'pending',
    autoAssign: false,
    createdBy: 'K. Fernando',
    createdAt: '2025-08-13T11:20:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-20T09:10:00'
  },
  {
    id: 'sa-4',
    staffId: 'staff-4',
    staffCode: 'RHM-L-055',
    staffName: 'A. Silva',
    department: 'Laboratory',
    unit: 'Pathology',
    designation: 'MLT',
    assignedShift: 'Day Shift',
    shiftTypeId: 'st-day',
    rotationPatternId: 'fixed',
    rotationPattern: 'Fixed',
    effectiveFrom: '2025-03-01',
    effectiveTo: '2025-09-30',
    weeklyOffDayId: 'saturday',
    status: 'active',
    autoAssign: true,
    createdBy: 'N. Silva',
    createdAt: '2025-08-14T08:30:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-14T08:30:00'
  },
  {
    id: 'sa-5',
    staffId: 'staff-5',
    staffCode: 'RHM-N-133',
    staffName: 'K. Jayasinghe',
    department: 'Nursing',
    unit: 'Ward 3',
    designation: 'Staff Nurse',
    assignedShift: '8.30–5.00 General',
    shiftTypeId: 'st-general',
    rotationPatternId: 'weekly',
    rotationPattern: 'Weekly Rotation',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    weeklyOffDayId: 'sunday',
    status: 'inactive',
    autoAssign: false,
    createdBy: 'K. Fernando',
    createdAt: '2025-08-15T14:00:00',
    updatedBy: 'K. Fernando',
    updatedAt: '2025-08-22T09:00:00'
  },
  {
    id: 'sa-6',
    staffId: 'staff-6',
    staffCode: 'RHM-N-177',
    staffName: 'M. Bandara',
    department: 'Emergency',
    unit: 'ETU',
    designation: 'Staff Nurse',
    assignedShift: 'Fixed',
    shiftTypeId: 'st-fixed',
    rotationPatternId: 'fixed',
    rotationPattern: 'Fixed',
    effectiveFrom: '2025-04-01',
    effectiveTo: null,
    weeklyOffDayId: 'friday',
    status: 'active',
    autoAssign: true,
    createdBy: 'N. Silva',
    createdAt: '2025-08-16T11:22:00',
    updatedBy: 'N. Silva',
    updatedAt: '2025-08-16T11:22:00'
  }
];

export function getSampleAssignmentById(
  id: string
): ShiftAssignmentSample | undefined {
  return SAMPLE_SHIFT_ASSIGNMENTS.find((row) => row.id === id);
}

export function getSampleAssignmentHistory(
  record: ShiftAssignmentSample
): ShiftAssignmentHistoryEntry[] {
  return [
    {
      id: `${record.id}-h1`,
      title: 'Assignment updated',
      detail: `Shift assignment changed for ${record.staffName} (${record.staffCode}).`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h2`,
      title: 'Status set',
      detail: `Marked as ${record.status === 'active' ? 'Active' : record.status === 'pending' ? 'Pending' : 'Inactive'}.`,
      userLabel: record.updatedBy,
      at: record.updatedAt
    },
    {
      id: `${record.id}-h3`,
      title: 'Assignment created',
      detail: `${record.assignedShift} assigned to ${record.staffName}.`,
      userLabel: record.createdBy,
      at: record.createdAt
    }
  ];
}
