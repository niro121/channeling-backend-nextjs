import 'server-only';

import { jsPDF } from 'jspdf';
import {
  PROBATION_PERIOD_OPTIONS,
  VACANCY_EMPLOYMENT_TYPE_LABELS,
  type VacancyEmploymentType
} from '@/types/recruitment';

export type AppointmentLetterPdfInput = {
  letterNumber: string;
  candidateName: string;
  position: string;
  department: string;
  employmentType: string;
  appointmentDate: string;
  salary: string;
  letterDate: string;
  reportingLocation: string;
  reportingManager: string;
  probationPeriod: string;
  benefits: string;
  termsAndConditions: string;
};

function formatDay(ymd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd.trim());
  if (!match) return ymd || '—';
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

function employmentLabel(value: string): string {
  return (
    VACANCY_EMPLOYMENT_TYPE_LABELS[value as VacancyEmploymentType] ||
    value ||
    '—'
  );
}

function probationLabel(value: string): string {
  return (
    PROBATION_PERIOD_OPTIONS.find((o) => o.id === value)?.name ||
    value ||
    '—'
  );
}

/**
 * Builds an English appointment-letter PDF (A4) for storage / email attachment.
 */
export function buildAppointmentLetterPdf(
  input: AppointmentLetterPdfInput
): Uint8Array {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  let y = 64;

  const write = (
    text: string,
    opts?: { bold?: boolean; size?: number; center?: boolean }
  ) => {
    const size = opts?.size ?? 11;
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, maxWidth);
    for (const line of lines) {
      if (y > 780) {
        doc.addPage();
        y = 64;
      }
      if (opts?.center) {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
      } else {
        doc.text(line, margin, y);
      }
      y += size + 6;
    }
  };

  write('Ruhunu Hospitals', { bold: true, size: 16, center: true });
  write('Appointment Letter', { size: 12, center: true });
  y += 8;
  write(`Date: ${formatDay(input.letterDate)}`, { size: 10 });
  write(`Ref: ${input.letterNumber}`, { size: 10 });
  y += 10;

  write(`Dear ${input.candidateName},`, { bold: true });
  y += 4;

  write(
    `We are pleased to offer you the position of ${input.position || '—'} in the ${
      input.department || '—'
    } department on a ${employmentLabel(input.employmentType)} basis, commencing on ${formatDay(
      input.appointmentDate
    )}.`
  );
  y += 4;
  write(
    `Your remuneration will be ${input.salary || '—'}. Probation period: ${probationLabel(
      input.probationPeriod
    )}.`
  );

  if (input.reportingLocation?.trim()) {
    y += 4;
    const manager = input.reportingManager?.trim()
      ? `, reporting to ${input.reportingManager.trim()}`
      : '';
    write(
      `Please report to ${input.reportingLocation.trim()}${manager}.`
    );
  }

  if (input.benefits?.trim()) {
    y += 4;
    write(`Benefits: ${input.benefits.trim()}`);
  }

  if (input.termsAndConditions?.trim()) {
    y += 4;
    write(`Terms: ${input.termsAndConditions.trim()}`);
  }

  y += 16;
  write('Yours sincerely,');
  y += 20;
  write('Human Resources', { bold: true });
  write('Ruhunu Hospitals', { size: 10 });

  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

export function appointmentLetterPdfFileName(letterNumber: string): string {
  const safe = letterNumber.replace(/[^a-zA-Z0-9._-]/g, '_') || 'letter';
  return `${safe}.pdf`;
}
