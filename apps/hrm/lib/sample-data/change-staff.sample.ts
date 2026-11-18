import type {
  ChangeStaffHistoryRow,
  ChangeStaffMemberOption
} from '@/types/change-staff';

/** Phase 0 sample staff — replaced by live Staff list in CRUD wave. */
export const SAMPLE_CHANGE_STAFF_MEMBERS: ChangeStaffMemberOption[] = [
  {
    id: 'sample-staff-1',
    name: 'MR. DUSHAN MADURANGA',
    staffCode: 'EMP-1002',
    epfNumber: 'E-3421',
    nic: '199120041234',
    joinedLabel: '2018 Jan 27',
    departmentId: 'administration',
    employeeStatusId: 'permanent',
    categoryId: '',
    gradeId: '',
    designationId: 'other',
    basic: '49900'
  },
  {
    id: 'sample-staff-2',
    name: 'MS. NIMALI PERERA',
    staffCode: 'EMP-1045',
    epfNumber: 'E-3510',
    nic: '199505152345',
    joinedLabel: '2020 Mar 12',
    departmentId: 'nursing',
    employeeStatusId: 'permanent',
    categoryId: 'nursing',
    gradeId: 'grade_ii',
    designationId: 'nurse',
    basic: '62500'
  },
  {
    id: 'sample-staff-3',
    name: 'MR. KAVINDU SILVA',
    staffCode: 'EMP-1108',
    epfNumber: 'E-3602',
    nic: '199812203456',
    joinedLabel: '2022 Jun 01',
    departmentId: 'laboratory',
    employeeStatusId: 'probation',
    categoryId: 'technical',
    gradeId: 'grade_iii',
    designationId: 'technician',
    basic: '48000'
  }
];

/** Phase 0 history aligned to mock for sample-staff-1. */
export const SAMPLE_CHANGE_STAFF_HISTORY: ChangeStaffHistoryRow[] = [
  {
    id: 'hist-dept-1',
    staffId: 'sample-staff-1',
    field: 'department',
    from: '2018 Jan 27',
    to: '',
    value: 'Administration',
    changeUser: 'VARUNI JAYARATNE'
  },
  {
    id: 'hist-status-1',
    staffId: 'sample-staff-1',
    field: 'employeeStatus',
    from: '2018 Jan 27',
    to: '',
    value: 'Permanent',
    changeUser: 'VARUNI JAYARATNE'
  },
  {
    id: 'hist-desig-1',
    staffId: 'sample-staff-1',
    field: 'designation',
    from: '2018 Jan 27',
    to: '',
    value: 'Trainee Dispenser',
    changeUser: 'VARUNI JAYARATNE'
  },
  {
    id: 'hist-dept-2',
    staffId: 'sample-staff-2',
    field: 'department',
    from: '2020 Mar 12',
    to: '',
    value: 'Nursing',
    changeUser: 'VARUNI JAYARATNE'
  }
];
