export type PayslipEmailTemplateInput = {
  staffName: string;
  staffCode: string;
  salaryPeriod: string;
  netSalaryLabel: string;
  grossSalaryLabel: string;
  totalDeductionsLabel: string;
  paymentStatusLabel: string;
  institution: string;
};

export type PayslipEmailContent = {
  subject: string;
  text: string;
  html: string;
};

/**
 * Email template for staff payslip notification.
 */
export function payslipEmailTemplate(
  input: PayslipEmailTemplateInput
): PayslipEmailContent {
  const subject = `Payslip ready · ${input.salaryPeriod} · ${input.staffCode}`;
  const text = [
    `Dear ${input.staffName},`,
    '',
    `Your payslip for ${input.salaryPeriod} is ready.`,
    `Institution: ${input.institution || '—'}`,
    `Gross: ${input.grossSalaryLabel}`,
    `Deductions: ${input.totalDeductionsLabel}`,
    `Net salary: ${input.netSalaryLabel}`,
    `Status: ${input.paymentStatusLabel}`,
    '',
    'Please log in to Archmage HRM to view full details.',
    '',
    '— Archmage HRM'
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;">
      <p>Dear <strong>${escapeHtml(input.staffName)}</strong>,</p>
      <p>Your payslip for <strong>${escapeHtml(input.salaryPeriod)}</strong> is ready.</p>
      <table style="border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Institution</td><td>${escapeHtml(input.institution || '—')}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Gross</td><td>${escapeHtml(input.grossSalaryLabel)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Deductions</td><td>${escapeHtml(input.totalDeductionsLabel)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Net salary</td><td><strong>${escapeHtml(input.netSalaryLabel)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Status</td><td>${escapeHtml(input.paymentStatusLabel)}</td></tr>
      </table>
      <p>Please log in to Archmage HRM to view full details.</p>
      <p style="color:#666;font-size:12px;">— Archmage HRM</p>
    </div>
  `.trim();

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
