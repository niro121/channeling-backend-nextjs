'use client';

import { formatAmount } from '@/lib/utils/currency';
import {
  PAYSLIP_PAYMENT_STATUS_LABELS,
  type PayslipRecord
} from '@/types/payroll';

/** Build a printable HTML document for a payslip (browser print / download). */
export function buildPayslipPrintHtml(record: PayslipRecord): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Payslip · ${escapeHtml(record.staffCode)} · ${escapeHtml(record.salaryPeriod)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .muted { color: #666; font-size: 12px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px; }
    .box { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 13px; }
    .totals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 16px; }
    .totals div { background: #f5f5f5; border-radius: 8px; padding: 10px; }
    .net { color: #047857; font-weight: 700; font-size: 16px; }
  </style>
</head>
<body>
  <h1>${escapeHtml(record.institution || 'Payslip')}</h1>
  <p class="muted">Payslip · ${escapeHtml(record.salaryPeriod)} · ${escapeHtml(
    PAYSLIP_PAYMENT_STATUS_LABELS[record.paymentStatus]
  )}</p>
  <div class="grid">
    <div>
      <strong>${escapeHtml(record.staffName)}</strong><br/>
      <span class="muted">Code: ${escapeHtml(record.staffCode)}</span><br/>
      <span class="muted">Department: ${escapeHtml(record.department)}</span><br/>
      <span class="muted">Designation: ${escapeHtml(record.designation)}</span>
    </div>
    <div>
      <span class="muted">Bank A/C: ${escapeHtml(record.bankAccountMasked)}</span><br/>
      <span class="muted">EPF No: ${escapeHtml(record.epfNumber)}</span><br/>
      <span class="muted">Run: ${escapeHtml(record.payrollRunCode)}</span>
    </div>
  </div>
  <div class="grid">
    <div class="box">
      <strong>Earnings</strong>
      <div class="row"><span>Basic</span><span>${formatAmount(record.basicSalary)}</span></div>
      <div class="row"><span>Allowances</span><span>${formatAmount(record.totalAllowances)}</span></div>
      <div class="row"><span>Other (OT etc.)</span><span>${formatAmount(record.otherEarnings)}</span></div>
    </div>
    <div class="box">
      <strong>Deductions</strong>
      <div class="row"><span>EPF (8%)</span><span>${formatAmount(record.epfStaff)}</span></div>
      <div class="row"><span>PAYE</span><span>${formatAmount(record.paye)}</span></div>
      <div class="row"><span>Loans</span><span>${formatAmount(record.loans)}</span></div>
      <div class="row"><span>Advances</span><span>${formatAmount(record.advances)}</span></div>
      <div class="row"><span>Other</span><span>${formatAmount(record.otherDeductions)}</span></div>
    </div>
  </div>
  <div class="totals">
    <div><div class="muted">Gross</div><div>${formatAmount(record.grossSalary)}</div></div>
    <div><div class="muted">Deductions</div><div>${formatAmount(record.totalDeductions)}</div></div>
    <div><div class="muted">Net</div><div class="net">${formatAmount(record.netSalary)}</div></div>
  </div>
  <p class="muted" style="margin-top:16px;">
    Employer contributions: EPF 12% ${formatAmount(record.employerEpf)} · ETF 3% ${formatAmount(record.employerEtf)}
  </p>
</body>
</html>`;
}

export function printPayslip(record: PayslipRecord) {
  const html = buildPayslipPrintHtml(record);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}

export function downloadPayslipHtml(record: PayslipRecord) {
  const html = buildPayslipPrintHtml(record);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payslip-${record.staffCode}-${record.salaryYear}-${record.salaryMonth}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
