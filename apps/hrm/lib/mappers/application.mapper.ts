import type {
  ApplicationHistoryEntry,
  ApplicationRecord,
  ApplicationSource,
  ApplicationStage,
  ApplicationStatus,
  ShortlistingStatus
} from '@/types/recruitment';

function toIso(date?: Date | null): string {
  if (!date) return '';
  return date.toISOString();
}

function mapHistory(
  entries: {
    id: string;
    title: string;
    detail: string;
    userLabel: string;
    at: Date;
  }[]
): ApplicationHistoryEntry[] {
  return (entries ?? []).map((entry) => ({
    id: entry.id,
    title: entry.title,
    detail: entry.detail,
    userLabel: entry.userLabel,
    at: toIso(entry.at)
  }));
}

export type ApplicationDbRecord = {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobPostId: string;
  jobPostCode: string;
  jobTitle: string;
  departmentName: string;
  designationId?: string | null;
  designationName?: string;
  appliedDate: Date;
  experienceYears: number;
  qualifications?: string;
  skills?: string[];
  source: string;
  currentStage: string;
  status: string;
  shortlistStatus?: string;
  screeningScore?: number;
  resumeFileName: string;
  resumeFileKey: string | null;
  resumeBankProfileId: string | null;
  notes: string;
  rejectReason: string | null;
  holdReason?: string | null;
  history: {
    id: string;
    title: string;
    detail: string;
    userLabel: string;
    at: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  createdUser?: { name: string } | null;
  updatedUser?: { name: string } | null;
};

export function mapApplicationRecord(
  record: ApplicationDbRecord
): ApplicationRecord {
  return {
    id: record.id,
    applicationId: record.applicationId,
    candidateName: record.candidateName,
    candidateEmail: record.candidateEmail,
    candidatePhone: record.candidatePhone,
    jobPostId: record.jobPostId,
    jobPostCode: record.jobPostCode,
    jobTitle: record.jobTitle,
    department: record.departmentName,
    designation: record.designationName ?? '',
    designationId: record.designationId ?? null,
    appliedDate: toIso(record.appliedDate),
    experienceYears: record.experienceYears,
    qualifications: record.qualifications ?? '',
    skills: record.skills ?? [],
    source: record.source as ApplicationSource,
    currentStage: record.currentStage as ApplicationStage,
    status: record.status as ApplicationStatus,
    shortlistStatus: (record.shortlistStatus ??
      'to_review') as ShortlistingStatus,
    screeningScore: record.screeningScore ?? 0,
    resumeFileName: record.resumeFileName,
    resumeFileKey: record.resumeFileKey,
    resumeBankProfileId: record.resumeBankProfileId,
    notes: record.notes,
    rejectReason: record.rejectReason ?? undefined,
    holdReason: record.holdReason ?? undefined,
    history: mapHistory(record.history ?? []),
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}
