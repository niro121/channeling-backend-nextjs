import type {
  InterviewRecord,
  InterviewStatus,
  InterviewType
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

export type InterviewDbRecord = {
  id: string;
  interviewCode: string;
  applicationId: string;
  applicationCode: string;
  candidateName: string;
  jobPostId: string;
  jobPostCode: string;
  jobTitle: string;
  departmentName: string;
  interviewDate: Date;
  startTime: string;
  endTime: string;
  interviewerPanel: string;
  interviewType: string;
  location: string;
  notesToCandidate: string;
  status: string;
  cancelReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdUser?: { name: string } | null;
  updatedUser?: { name: string } | null;
};

export function mapInterviewRecord(record: InterviewDbRecord): InterviewRecord {
  return {
    id: record.id,
    interviewCode: record.interviewCode,
    candidateName: record.candidateName,
    applicationRefId: record.applicationId,
    applicationId: record.applicationCode,
    jobPostId: record.jobPostId,
    jobPostCode: record.jobPostCode,
    jobTitle: record.jobTitle,
    department: record.departmentName,
    interviewDate: toYmd(record.interviewDate),
    startTime: record.startTime,
    endTime: record.endTime,
    interviewerPanel: record.interviewerPanel,
    interviewType: record.interviewType as InterviewType,
    location: record.location,
    notesToCandidate: record.notesToCandidate,
    status: record.status as InterviewStatus,
    cancelReason: record.cancelReason ?? undefined,
    createdAt: toIso(record.createdAt),
    createdBy: record.createdUser?.name ?? '',
    updatedAt: toIso(record.updatedAt),
    updatedBy: record.updatedUser?.name ?? ''
  };
}
