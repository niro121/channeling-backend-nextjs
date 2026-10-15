import type {
  EmploymentFormValues,
  StaffEmploymentDetails,
  StaffEmploymentPayload,
  StaffRecord
} from '@/types/staff';

function toNumberString(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}

function toOptionalNumber(value: string): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function staffRecordToEmploymentFormValues(
  staff: StaffRecord
): EmploymentFormValues {
  const details = staff.employmentDetails;
  const welfare = details?.welfare;
  const employment = details?.employment;
  const payroll = details?.payroll;
  const workingHours = details?.workingHours;
  const permissions = details?.permissions;
  const notes = details?.notes;

  return {
    eligibleWelfareValue: toNumberString(welfare?.eligibleValue),
    utilizedThisYear: toNumberString(welfare?.utilizedThisYear),
    institution: employment?.institution ?? '',
    department: employment?.department ?? '',
    employeeStatus: employment?.employeeStatus ?? '',
    staffCategory: employment?.staffCategory ?? '',
    staffGrade: employment?.staffGrade ?? '',
    staffDesignation: employment?.staffDesignation ?? '',
    roster: employment?.roster ?? '',
    shift: employment?.shift ?? '',
    payingMethod: payroll?.payingMethod ?? '',
    salaryPaymentMethod: payroll?.salaryPaymentMethod ?? '',
    bank: payroll?.bank ?? '',
    bankBranch: payroll?.bankBranch ?? '',
    accountNumber: payroll?.accountNumber ?? '',
    perWeekStandard: toNumberString(workingHours?.perWeekStandard),
    perWeekOt: toNumberString(workingHours?.perWeekOt),
    perWeekNoPay: toNumberString(workingHours?.perWeekNoPay),
    allowedLateInLeave: permissions?.allowedLateInLeave ?? false,
    allowedEarlyOutLeave: permissions?.allowedEarlyOutLeave ?? false,
    memo: notes?.memo ?? ''
  };
}

export function employmentFormValuesToPayload(
  values: EmploymentFormValues
): StaffEmploymentPayload {
  return {
    employmentDetails: mapFormValuesToEmploymentDetails(values)
  };
}

function mapFormValuesToEmploymentDetails(
  values: EmploymentFormValues
): StaffEmploymentDetails {
  return {
    welfare: {
      eligibleValue: toOptionalNumber(values.eligibleWelfareValue),
      utilizedThisYear: toOptionalNumber(values.utilizedThisYear)
    },
    employment: {
      institution: values.institution || null,
      department: values.department || null,
      employeeStatus: values.employeeStatus || null,
      staffCategory: values.staffCategory || null,
      staffGrade: values.staffGrade || null,
      staffDesignation: values.staffDesignation || null,
      roster: values.roster || null,
      shift: values.shift || null
    },
    payroll: {
      payingMethod: values.payingMethod || null,
      salaryPaymentMethod: values.salaryPaymentMethod || null,
      bank: values.bank || null,
      bankBranch: values.bankBranch || null,
      accountNumber: values.accountNumber || null
    },
    workingHours: {
      perWeekStandard: toOptionalNumber(values.perWeekStandard),
      perWeekOt: toOptionalNumber(values.perWeekOt),
      perWeekNoPay: toOptionalNumber(values.perWeekNoPay)
    },
    permissions: {
      allowedLateInLeave: values.allowedLateInLeave ?? false,
      allowedEarlyOutLeave: values.allowedEarlyOutLeave ?? false
    },
    notes: {
      memo: values.memo || null
    }
  };
}
