import 'server-only';

import prisma from '@/lib/prisma';
import {
  buildObjectKey,
  getHrmObjectPrefix,
  getObjectBytes,
  headObject,
  putObject
} from '@/lib/s3';
import {
  appointmentLetterPdfFileName,
  buildAppointmentLetterPdf,
  type AppointmentLetterPdfInput
} from '@/lib/helpers/recruitment/appointment-letter-pdf';

export type LetterPdfSource = {
  id: string;
  letterNumber: string;
  candidateName: string;
  position: string;
  department: string;
  employmentType: string;
  appointmentDate?: Date | string | null;
  salary: string;
  letterDate?: Date | string | null;
  reportingLocation: string;
  reportingManager: string;
  probationPeriod: string;
  benefits: string;
  termsAndConditions: string;
  letterFileKey?: string | null;
};

function toYmd(date?: Date | string | null): string {
  if (!date) return '';
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return '';
    date = parsed;
  }
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function letterToPdfInput(letter: {
  letterNumber: string;
  candidateName: string;
  position: string;
  department: string;
  employmentType: string;
  appointmentDate?: Date | string | null;
  salary: string;
  letterDate?: Date | string | null;
  reportingLocation: string;
  reportingManager: string;
  probationPeriod: string;
  benefits: string;
  termsAndConditions: string;
}): AppointmentLetterPdfInput {
  return {
    letterNumber: letter.letterNumber,
    candidateName: letter.candidateName,
    position: letter.position,
    department: letter.department,
    employmentType: letter.employmentType,
    appointmentDate: toYmd(letter.appointmentDate),
    salary: letter.salary,
    letterDate: toYmd(letter.letterDate),
    reportingLocation: letter.reportingLocation,
    reportingManager: letter.reportingManager,
    probationPeriod: letter.probationPeriod,
    benefits: letter.benefits,
    termsAndConditions: letter.termsAndConditions
  };
}

export type EnsureLetterPdfResult =
  | {
      success: true;
      fileKey: string;
      bytes: Uint8Array;
      regenerated: boolean;
    }
  | { success: false; error: string };

/**
 * Ensures an appointment letter PDF exists in object storage.
 * Regenerates when `force` is true or the stored key is missing/unreachable.
 * Soft-fails with a clear error when S3 env is not configured yet.
 */
export async function ensureAppointmentLetterPdf(
  letter: LetterPdfSource,
  opts?: { force?: boolean; persist?: boolean }
): Promise<EnsureLetterPdfResult> {
  const force = opts?.force ?? false;
  const persist = opts?.persist ?? true;
  const existingKey = letter.letterFileKey?.trim() || null;

  try {
    if (existingKey && !force) {
      const exists = await headObject(existingKey);
      if (exists) {
        const object = await getObjectBytes(existingKey);
        return {
          success: true,
          fileKey: existingKey,
          bytes: object.body,
          regenerated: false
        };
      }
    }

    const pdfInput = letterToPdfInput(letter);
    const bytes = buildAppointmentLetterPdf(pdfInput);
    const fileKey = buildObjectKey(
      getHrmObjectPrefix('appointmentLetters'),
      [letter.letterNumber || letter.id, Date.now().toString(36)],
      'pdf'
    );

    await putObject(fileKey, Buffer.from(bytes), 'application/pdf');

    if (persist) {
      await prisma.appointmentLetter.update({
        where: { id: letter.id },
        data: { letterFileKey: fileKey }
      });
    }

    return {
      success: true,
      fileKey,
      bytes,
      regenerated: true
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Could not store appointment letter PDF';
    console.error('ensureAppointmentLetterPdf error:', error);
    return { success: false, error: message };
  }
}

export { appointmentLetterPdfFileName };
