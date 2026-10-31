/** Placeholder options until Institution / Department masters exist. */
export const INSTITUTION_OPTIONS = [
  { id: 'ruhunu_hospitals', name: 'Ruhunu Hospitals' }
] as const;

export const DEPARTMENT_OPTIONS = [
  { id: 'administration', name: 'Administration' },
  { id: 'nursing', name: 'Nursing' },
  { id: 'laboratory', name: 'Laboratory' },
  { id: 'pharmacy', name: 'Pharmacy' },
  { id: 'reception', name: 'Reception' },
  { id: 'other', name: 'Other' }
] as const;

export const EMPLOYEE_STATUS_OPTIONS = [
  { id: 'permanent', name: 'Permanent' },
  { id: 'probation', name: 'Probation' },
  { id: 'contract', name: 'Contract' },
  { id: 'casual', name: 'Casual' },
  { id: 'intern', name: 'Intern' }
] as const;

export const STAFF_CATEGORY_OPTIONS = [
  { id: 'medical', name: 'Medical' },
  { id: 'nursing', name: 'Nursing' },
  { id: 'administrative', name: 'Administrative' },
  { id: 'technical', name: 'Technical' },
  { id: 'support', name: 'Support' }
] as const;

export const STAFF_GRADE_OPTIONS = [
  { id: 'grade_i', name: 'Grade I' },
  { id: 'grade_ii', name: 'Grade II' },
  { id: 'grade_iii', name: 'Grade III' },
  { id: 'executive', name: 'Executive' }
] as const;

export const STAFF_DESIGNATION_OPTIONS = [
  { id: 'nurse', name: 'Nurse' },
  { id: 'receptionist', name: 'Receptionist' },
  { id: 'manager', name: 'Manager' },
  { id: 'technician', name: 'Technician' },
  { id: 'coordinator', name: 'Coordinator' },
  { id: 'other', name: 'Other' }
] as const;

export const ROSTER_OPTIONS = [
  { id: 'roster_a', name: 'Roster A' },
  { id: 'roster_b', name: 'Roster B' },
  { id: 'roster_c', name: 'Roster C' },
  { id: 'flexible', name: 'Flexible' }
] as const;

export const SHIFT_OPTIONS = [
  { id: 'morning', name: 'Morning' },
  { id: 'evening', name: 'Evening' },
  { id: 'night', name: 'Night' },
  { id: 'general', name: 'General' }
] as const;

export const PAYING_METHOD_OPTIONS = [
  { id: 'monthly', name: 'Monthly' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'daily', name: 'Daily' },
  { id: 'hourly', name: 'Hourly' }
] as const;

export const SALARY_PAYMENT_METHOD_OPTIONS = [
  { id: 'bank_transfer', name: 'Bank Transfer' },
  { id: 'cash', name: 'Cash' },
  { id: 'cheque', name: 'Cheque' }
] as const;

export const BANK_OPTIONS = [
  { id: 'boc', name: 'Bank of Ceylon' },
  { id: 'peoples', name: "People's Bank" },
  { id: 'nsb', name: 'National Savings Bank' },
  { id: 'commercial', name: 'Commercial Bank' },
  { id: 'sampath', name: 'Sampath Bank' },
  { id: 'hnb', name: 'HNB' },
  { id: 'ntb', name: 'NTB' }
] as const;
