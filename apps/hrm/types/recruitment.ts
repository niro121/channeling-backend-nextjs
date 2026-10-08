export const VACANCY_EMPLOYMENT_TYPES = [
  'permanent',
  'contract',
  'temporary',
  'casual'
] as const;

export type VacancyEmploymentType = (typeof VACANCY_EMPLOYMENT_TYPES)[number];

export const VACANCY_EMPLOYMENT_TYPE_LABELS: Record<
  VacancyEmploymentType,
  string
> = {
  permanent: 'Permanent',
  contract: 'Contract',
  temporary: 'Temporary',
  casual: 'Casual'
};

export const VACANCY_PRIORITIES = [
  'low',
  'medium',
  'high',
  'urgent'
] as const;

export type VacancyPriority = (typeof VACANCY_PRIORITIES)[number];

export const VACANCY_PRIORITY_LABELS: Record<VacancyPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent'
};

export const VACANCY_REQUEST_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'closed',
  'cancelled'
] as const;

export type VacancyRequestStatus = (typeof VACANCY_REQUEST_STATUSES)[number];

export const VACANCY_REQUEST_STATUS_LABELS: Record<
  VacancyRequestStatus,
  string
> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  closed: 'Closed',
  cancelled: 'Cancelled'
};

export type VacancyRequestRecord = {
  id: string;
  requestId: string;
  department: string;
  designation: string;
  vacancies: number;
  employmentType: VacancyEmploymentType;
  requestedBy: string;
  requestedDate: string;
  requiredDate: string;
  priority: VacancyPriority;
  status: VacancyRequestStatus;
  requiredQualifications: string;
  requiredExperience: string;
  skills: string[];
  jobDescription: string;
  salaryRange: string;
  justification: string;
  remarks: string;
  linkedJobPost: boolean;
  rejectReason?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type VacancyRequestSummary = {
  openRequests: number;
  pendingApproval: number;
  approved: number;
  totalPositions: number;
};

export type VacancyRequestFilters = {
  requestId?: string;
  department?: string;
  designation?: string;
  employmentType?: string;
  requestedBy?: string;
  requestDate?: string;
  requiredDate?: string;
  status?: string;
  search?: string;
};

export type VacancyRequestFormValues = {
  department: string;
  designation: string;
  vacancies: string;
  employmentType: string;
  requiredQualifications: string;
  requiredExperience: string;
  skills: string[];
  jobDescription: string;
  salaryRange: string;
  requiredDate: Date | null;
  priority: string;
  justification: string;
  remarks: string;
};

export const EMPTY_VACANCY_REQUEST_FORM: VacancyRequestFormValues = {
  department: '',
  designation: '',
  vacancies: '1',
  employmentType: '',
  requiredQualifications: '',
  requiredExperience: '',
  skills: [],
  jobDescription: '',
  salaryRange: '',
  requiredDate: null,
  priority: '',
  justification: '',
  remarks: ''
};

export const VACANCY_DEPARTMENT_OPTIONS = [
  { id: 'Nursing - Ward 3', name: 'Nursing - Ward 3' },
  { id: 'Emergency', name: 'Emergency' },
  { id: 'Laboratory', name: 'Laboratory' },
  { id: 'Cardiology', name: 'Cardiology' },
  { id: 'Radiology', name: 'Radiology' },
  { id: 'Pharmacy', name: 'Pharmacy' },
  { id: 'ICU', name: 'ICU' }
] as const;

export const VACANCY_DESIGNATION_OPTIONS = [
  { id: 'Nursing Officer', name: 'Nursing Officer' },
  { id: 'Medical Officer', name: 'Medical Officer' },
  { id: 'Lab Technician', name: 'Lab Technician' },
  { id: 'Consultant Cardiologist', name: 'Consultant Cardiologist' },
  { id: 'Radiographer', name: 'Radiographer' },
  { id: 'Pharmacist', name: 'Pharmacist' }
] as const;

export function isVacancyEditable(status: VacancyRequestStatus): boolean {
  return status === 'draft' || status === 'pending_approval';
}

export function isVacancyPendingApproval(status: VacancyRequestStatus): boolean {
  return status === 'pending_approval';
}

export function canLinkVacancyToJobPost(
  status: VacancyRequestStatus
): boolean {
  return status === 'approved';
}

// ─── Job Posts ───────────────────────────────────────────────────────────────

export const JOB_POST_STATUSES = [
  'draft',
  'published',
  'unpublished',
  'closed'
] as const;

export type JobPostStatus = (typeof JOB_POST_STATUSES)[number];

export const JOB_POST_STATUS_LABELS: Record<JobPostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
  closed: 'Closed'
};

export type JobPostRecord = {
  id: string;
  jobPostId: string;
  jobTitle: string;
  department: string;
  designation: string;
  employmentType: VacancyEmploymentType;
  openings: number;
  postedDate: string | null;
  closingDate: string;
  applicationsCount: number;
  status: JobPostStatus;
  linkedVacancyRequestId: string;
  linkedVacancyRequestLabel: string;
  jobDescription: string;
  responsibilities: string;
  qualifications: string;
  experience: string;
  skills: string[];
  salaryInformation: string;
  applicationInstructions: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type JobPostSummary = {
  published: number;
  unpublished: number;
  applications: number;
  closingThisWeek: number;
};

export type JobPostFilters = {
  jobTitle?: string;
  department?: string;
  designation?: string;
  employmentType?: string;
  status?: string;
  postedDate?: string;
  closingDate?: string;
  search?: string;
};

export type JobPostFormValues = {
  linkedVacancyRequestId: string;
  jobTitle: string;
  department: string;
  designation: string;
  jobDescription: string;
  responsibilities: string;
  qualifications: string;
  experience: string;
  skills: string[];
  employmentType: string;
  salaryInformation: string;
  openings: string;
  closingDate: Date | null;
  applicationInstructions: string;
  status: string;
};

export const EMPTY_JOB_POST_FORM: JobPostFormValues = {
  linkedVacancyRequestId: '',
  jobTitle: '',
  department: '',
  designation: '',
  jobDescription: '',
  responsibilities: '',
  qualifications: '',
  experience: '',
  skills: [],
  employmentType: '',
  salaryInformation: '',
  openings: '1',
  closingDate: null,
  applicationInstructions: '',
  status: 'draft'
};

export function isJobPostEditable(status: JobPostStatus): boolean {
  return status === 'draft' || status === 'unpublished' || status === 'published';
}
