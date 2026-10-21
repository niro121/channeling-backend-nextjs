'use client';

import {
  PROBATION_PERIOD_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type AppointmentLetterRecord
} from '@/types/recruitment';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDay(dateStr: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return dateStr || '—';
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];
  const month = months[Number(match[2]) - 1] ?? match[2];
  return `${Number(match[3])} ${month} ${match[1]}`;
}

function probationLabel(id: string): string {
  return PROBATION_PERIOD_OPTIONS.find((o) => o.id === id)?.name ?? id ?? '—';
}

/** Printable HTML for appointment letters (works without S3). */
export function buildAppointmentLetterPrintHtml(
  record: AppointmentLetterRecord
): string {
  const employment =
    VACANCY_EMPLOYMENT_TYPE_LABELS[record.employmentType] ??
    record.employmentType;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Appointment Letter · ${escapeHtml(record.letterNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 40px; line-height: 1.55; font-size: 14px; }
    h1 { font-size: 20px; margin: 0 0 4px; text-align: center; }
    .eyebrow { text-align: center; text-transform: uppercase; letter-spacing: 0.08em; color: #666; font-size: 12px; margin-bottom: 24px; }
    .meta { text-align: right; color: #666; font-size: 12px; margin-bottom: 24px; }
    p { margin: 0 0 12px; }
    .sign { margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Ruhunu Hospitals</h1>
  <p class="eyebrow">Appointment Letter</p>
  <p class="meta">${escapeHtml(formatDay(record.letterDate))}<br/>Ref: ${escapeHtml(
    record.letterNumber
  )}</p>
  <p>Dear <strong>${escapeHtml(record.candidateName)}</strong>,</p>
  <p>
    We are pleased to offer you the position of
    <strong>${escapeHtml(record.position)}</strong> in the
    <strong>${escapeHtml(record.department)}</strong> department on a
    <strong>${escapeHtml(employment)}</strong> basis, commencing on
    <strong>${escapeHtml(formatDay(record.appointmentDate))}</strong>.
  </p>
  <p>
    Your remuneration will be <strong>${escapeHtml(record.salary)}</strong>.
    Probation period: <strong>${escapeHtml(
      probationLabel(record.probationPeriod)
    )}</strong>.
  </p>
  ${
    record.reportingLocation
      ? `<p>Please report to <strong>${escapeHtml(record.reportingLocation)}</strong>${
          record.reportingManager
            ? `, reporting to ${escapeHtml(record.reportingManager)}`
            : ''
        }.</p>`
      : ''
  }
  ${
    record.benefits
      ? `<p><strong>Benefits:</strong> ${escapeHtml(record.benefits)}</p>`
      : ''
  }
  ${
    record.termsAndConditions
      ? `<p><strong>Terms:</strong> ${escapeHtml(record.termsAndConditions)}</p>`
      : ''
  }
  <div class="sign">
    <p>Yours sincerely,</p>
    <p><strong>Human Resources</strong><br/>Ruhunu Hospitals</p>
  </div>
</body>
</html>`;
}

export function printAppointmentLetter(record: AppointmentLetterRecord): boolean {
  const html = buildAppointmentLetterPrintHtml(record);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
  return true;
}
