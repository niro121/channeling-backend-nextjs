import type {
  AppointmentLetterRecord,
  AppointmentLetterStatus,
  VacancyEmploymentType
} from '@/types/recruitment';

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

function toYmd(date?: Date | null): string {
  if (!date) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type AppointmentLetterDbRecord = {
  id: string;
  letterNumber: string;
  evaluationId: string;
  evaluationCode: string;
  applicationId: string;
  applicationCode: string;
  candidateName: string;
  position: string;
  department: string;
  employmentType: string;
  appointmentDate?: Date | null;
  salary: string;
  letterDate?: Date | null;
  reportingLocation: string;
  reportingManager: string;
  probationPeriod: string;
  benefits: string;
  termsAndConditions: string;
  status: string;
  letterGenerated: boolean;
  declineReason?: string | null;
  letterFileKey?: string | null;
  staffId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdUser?: { name: string } | null;
  updatedUser?: { name: string } | null;
};

export function mapAppointmentLetterRecord(
  record: AppointmentLetterDbRecord
): AppointmentLetterRecord {
  return {
    id: record.id,
    letterNumber: record.letterNumber,
    evaluationId: record.evaluationId,
    evaluationCode: record.evaluationCode,
    applicationRefId: record.applicationId,
    applicationId: record.applicationCode,
    candidateName: record.candidateName,
    position: record.position,
    department: record.department,
    employmentType: record.employmentType as VacancyEmploymentType,
    appointmentDate: toYmd(record.appointmentDate),
    salary: record.salary,
    letterDate: toYmd(record.letterDate),
    reportingLocation: record.reportingLocation,
    reportingManager: record.reportingManager,
    probationPeriod: record.probationPeriod,
    benefits: record.benefits,
    termsAndConditions: record.termsAndConditions,
    status: record.status as AppointmentLetterStatus,
    letterGenerated: record.letterGenerated,
    declineReason: record.declineReason ?? undefined,
    letterFileKey: record.letterFileKey ?? null,
    staffId: record.staffId ?? null,
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}
