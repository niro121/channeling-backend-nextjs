/** Employment fields versioned by Change Staff (no roster on this screen). */
export const CHANGE_STAFF_FIELDS = [
  'department',
  'employeeStatus',
  'category',
  'grade',
  'designation',
  'basic'
] as const;

export type ChangeStaffFieldId = (typeof CHANGE_STAFF_FIELDS)[number];

export const CHANGE_STAFF_FIELD_LABELS: Record<ChangeStaffFieldId, string> = {
  department: 'Worked Department',
  employeeStatus: 'Employee Status',
  category: 'Category',
  grade: 'Grade',
  designation: 'Designation',
  basic: 'Basic'
};

export type ChangeStaffHistoryRow = {
  id: string;
  staffId: string;
  field: ChangeStaffFieldId;
  /** Display date for FROM column */
  from: string;
  /** Display date or empty for open-ended */
  to: string;
  value: string;
  changeUser: string;
};

export type ChangeStaffMemberOption = {
  id: string;
  name: string;
  staffCode: string;
  epfNumber: string;
  nic: string;
  joinedLabel: string;
  departmentId: string;
  employeeStatusId: string;
  categoryId: string;
  gradeId: string;
  designationId: string;
  basic: string;
};

export type ChangeStaffFormValues = {
  staffId: string;
  departmentId: string;
  employeeStatusId: string;
  categoryId: string;
  gradeId: string;
  designationId: string;
  basic: string;
  activeFrom: Date | null;
};

export type ChangeStaffSelectOption = {
  id: string;
  name: string;
};

export type ChangeStaffFormOptions = {
  departments: ChangeStaffSelectOption[];
  designations: ChangeStaffSelectOption[];
  grades: ChangeStaffSelectOption[];
};

/** Payload for applying one Change Staff submit (only changed fields required). */
export type ApplyChangeStaffPayload = {
  staffId: string;
  activeFrom: Date;
  departmentId?: string;
  employeeStatusId?: string;
  categoryId?: string;
  gradeId?: string;
  designationId?: string;
  basic?: string;
  /**
   * When true, soft warnings were shown and the user chose Continue.
   * Hard blocks are always enforced regardless of this flag.
   */
  acknowledgedWarnings?: boolean;
  /** Display labels for history grids (resolved by action/UI). */
  labels?: Partial<
    Record<
      | 'department'
      | 'employeeStatus'
      | 'category'
      | 'grade'
      | 'designation'
      | 'basic',
      string
    >
  >;
};

/** CS3 guard preview / apply gate result. */
export type ChangeStaffGuardResult = {
  /** Cannot proceed — show InfoAlertDialog (OK only). */
  hardBlocks: string[];
  /** Proceed only after Cancel/Continue confirm. */
  softWarnings: string[];
};
