export type PayslipSmsTemplateInput = {
  staffName: string;
  staffCode: string;
  salaryPeriod: string;
  netSalaryLabel: string;
};

/**
 * SMS template for staff payslip notification.
 */
export function payslipSmsTemplate(input: PayslipSmsTemplateInput): string {
  return `Archmage HRM: Payslip ready for ${input.staffCode} (${input.salaryPeriod}). Net ${input.netSalaryLabel}. Log in to view details.`;
}
