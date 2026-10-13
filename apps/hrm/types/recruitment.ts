/** Sequence / record-code prefix → codes like VR-1 (see generateRecordCode). */
export const VACANCY_REQUEST_CODE_PREFIX = 'VR';

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
  departmentId: string;
  designationId: string;
  /** Denormalized display name */
  department: string;
  /** Denormalized display name */
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
  linkedJobPostId?: string;
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
  /** Department ObjectId */
  department?: string;
  /** Designation ObjectId */
  designation?: string;
  employmentType?: string;
  requestedBy?: string;
  requestDate?: string;
  requiredDate?: string;
  status?: string;
  search?: string;
};

export type GetVacancyRequestsParams = VacancyRequestFilters & {
  page?: string;
  limit?: string;
};

export type VacancyRequestPayload = {
  departmentId: string;
  designationId: string;
  vacancies: number | string;
  employmentType: VacancyEmploymentType | string;
  requiredQualifications?: string;
  requiredExperience?: string;
  skills?: string[];
  jobDescription?: string;
  salaryRange?: string;
  requiredDate: Date | string | null;
  priority: VacancyPriority | string;
  justification: string;
  remarks?: string;
  /** draft = save as draft; submit = pending_approval */
  submitIntent?: 'draft' | 'submit';
};

export type VacancyRequestFormValues = {
  departmentId: string;
  designationId: string;
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
  departmentId: '',
  designationId: '',
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

export type VacancySelectOption = { id: string; name: string };

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

/** Sequence / record-code prefix → codes like JP-1 (see generateRecordCode). */
export const JOB_POST_CODE_PREFIX = 'JP';

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

/** Snapshot of a vacancy attached to a job post (combine across departments). */
export type JobPostVacancyLink = {
  vacancyRequestId: string;
  requestId: string;
  departmentId: string;
  departmentName: string;
  openings: number;
};

export type JobPostRecord = {
  id: string;
  jobPostId: string;
  slug: string;
  jobTitle: string;
  shortDescription: string;
  /** Display label — single dept or combined e.g. "ICU, Ward 3". */
  department: string;
  departmentId?: string;
  designation: string;
  designationId: string;
  employmentType: VacancyEmploymentType;
  openings: number;
  postedDate: string | null;
  closingDate: string;
  applicationsCount: number;
  status: JobPostStatus;
  /** Linked VacancyRequest ids (same designation; may span departments). */
  linkedVacancyRequestIds: string[];
  linkedVacancies: JobPostVacancyLink[];
  /** Join of linked vacancy labels for list/view. */
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
  /** Department ObjectId or name contains (filters departmentName) */
  department?: string;
  /** Designation ObjectId */
  designation?: string;
  employmentType?: string;
  status?: string;
  postedDate?: string;
  closingDate?: string;
  search?: string;
};

export type GetJobPostsParams = JobPostFilters & {
  page?: string;
  limit?: string;
};

export type JobPostPayload = {
  linkedVacancyRequestIds?: string[];
  jobTitle: string;
  slug?: string;
  shortDescription?: string;
  departmentId?: string;
  designationId: string;
  jobDescription?: string;
  responsibilities?: string;
  qualifications?: string;
  experience?: string;
  skills?: string[];
  employmentType: VacancyEmploymentType | string;
  salaryInformation?: string;
  openings: number | string;
  closingDate: Date | string | null;
  applicationInstructions?: string;
  status: JobPostStatus | string;
};

/** Option row for linking approved vacancies into a job post. */
export type ApprovedVacancyOption = {
  id: string;
  name: string;
  requestId: string;
  designationId: string;
  designationName: string;
  departmentId: string;
  departmentName: string;
  employmentType: VacancyEmploymentType;
  openings: number;
  skills: string[];
};

export type JobPostFormValues = {
  /** One or more approved vacancy request ids to combine into this post. */
  linkedVacancyRequestIds: string[];
  jobTitle: string;
  slug: string;
  shortDescription: string;
  departmentId: string;
  designationId: string;
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
  linkedVacancyRequestIds: [],
  jobTitle: '',
  slug: '',
  shortDescription: '',
  departmentId: '',
  designationId: '',
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

// ─── Applications ────────────────────────────────────────────────────────────

/** Sequence / record-code prefix → codes like APP-1 (see generateRecordCode). */
export const APPLICATION_CODE_PREFIX = 'APP';

/** Pipeline position in recruitment. */
export const APPLICATION_STAGES = [
  'applied',
  'screening',
  'shortlisted',
  'interview',
  'selected',
  'offer',
  'hired',
  'rejected'
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: 'Applied',
  screening: 'Screening',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  selected: 'Selected',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected'
};

/**
 * Application outcome / lifecycle status (distinct from pipeline stage).
 * In-progress applications stay `active`.
 */
export const APPLICATION_STATUSES = [
  'active',
  'rejected',
  'withdrawn',
  'hired'
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  active: 'Active',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  hired: 'Hired'
};

export const APPLICATION_SOURCES = [
  'hospital_website',
  'newspaper',
  'resume_bank',
  'referral',
  'job_portal'
] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

export const APPLICATION_SOURCE_LABELS: Record<ApplicationSource, string> = {
  hospital_website: 'Hospital Website',
  newspaper: 'Newspaper',
  resume_bank: 'Resume Bank',
  referral: 'Referral',
  job_portal: 'Job Portal'
};

export const INTERVIEW_TYPES = [
  'phone',
  'video',
  'in_person',
  'panel'
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone: 'Phone',
  video: 'Video',
  in_person: 'In Person',
  panel: 'Panel'
};

export type ApplicationHistoryEntry = {
  id: string;
  title: string;
  detail: string;
  userLabel: string;
  at: string;
};

export type ApplicationRecord = {
  id: string;
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  /** JobPost Mongo ObjectId */
  jobPostId: string;
  /** Denormalized JobPost.jobPostId, e.g. JP-1 */
  jobPostCode: string;
  jobTitle: string;
  department: string;
  appliedDate: string;
  experienceYears: number;
  source: ApplicationSource;
  currentStage: ApplicationStage;
  status: ApplicationStatus;
  resumeFileName: string;
  resumeFileKey?: string | null;
  resumeBankProfileId?: string | null;
  notes: string;
  rejectReason?: string;
  history: ApplicationHistoryEntry[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type ApplicationSummary = {
  applied: number;
  screening: number;
  shortlisted: number;
  interview: number;
  selected: number;
  offer: number;
  hired: number;
  rejected: number;
};

export type ApplicationFilters = {
  jobPostId?: string;
  jobTitle?: string;
  candidateName?: string;
  applicationId?: string;
  applicationDate?: string;
  department?: string;
  status?: string;
  source?: string;
  search?: string;
};

export type GetApplicationsParams = ApplicationFilters & {
  page?: string;
  limit?: string;
};

export type ApplicationPayload = {
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  experienceYears?: number | string;
  jobPostId: string;
  source: ApplicationSource | string;
  notes?: string;
  resumeFileName?: string;
  resumeFileKey?: string | null;
  resumeBankProfileId?: string | null;
};

export type ApplicationFormValues = {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  experienceYears: string;
  jobPostId: string;
  source: ApplicationSource | '';
  notes: string;
  resumeFileName: string;
  resumeFileKey: string | null;
};

export const EMPTY_APPLICATION_FORM: ApplicationFormValues = {
  candidateName: '',
  candidateEmail: '',
  candidatePhone: '',
  experienceYears: '0',
  jobPostId: '',
  source: 'referral',
  notes: '',
  resumeFileName: '',
  resumeFileKey: null
};

export type ScheduleInterviewFormValues = {
  candidateName: string;
  jobPostId: string;
  interviewType: string;
  interviewDate: Date | null;
  startTime: string;
  endTime: string;
  interviewerPanel: string;
  location: string;
  notesToCandidate: string;
};

export const EMPTY_SCHEDULE_INTERVIEW_FORM: ScheduleInterviewFormValues = {
  candidateName: '',
  jobPostId: '',
  interviewType: '',
  interviewDate: null,
  startTime: '',
  endTime: '',
  interviewerPanel: '',
  location: '',
  notesToCandidate: ''
};

export function canShortlistApplication(record: ApplicationRecord): boolean {
  return (
    record.status === 'active' &&
    (record.currentStage === 'applied' ||
      record.currentStage === 'screening')
  );
}

export function canRejectApplication(record: ApplicationRecord): boolean {
  return (
    record.status === 'active' &&
    record.currentStage !== 'hired' &&
    record.currentStage !== 'rejected'
  );
}

export function canScheduleInterview(record: ApplicationRecord): boolean {
  return (
    record.status === 'active' &&
    (record.currentStage === 'shortlisted' ||
      record.currentStage === 'interview' ||
      record.currentStage === 'screening')
  );
}

// ─── Resume Bank ─────────────────────────────────────────────────────────────

/** Sequence / record-code prefix → codes like RB-1 (see generateRecordCode). */
export const RESUME_BANK_CODE_PREFIX = 'RB';

export const RESUME_BANK_STATUSES = [
  'in_bank',
  'linked',
  'shortlisted'
] as const;

export type ResumeBankStatus = (typeof RESUME_BANK_STATUSES)[number];

export const RESUME_BANK_STATUS_LABELS: Record<ResumeBankStatus, string> = {
  in_bank: 'In Bank',
  linked: 'Linked',
  shortlisted: 'Shortlisted'
};

export type ResumeBankRecord = {
  id: string;
  /** Human-readable code, e.g. RB-1 */
  profileId: string;
  candidateName: string;
  resumeFileName: string;
  /** Present when a CV file key is stored (Wave 10). */
  resumeFileKey?: string | null;
  email: string;
  phone: string;
  qualifications: string;
  experienceYears: number;
  skills: string[];
  preferredPosition: string;
  preferredDepartment: string;
  location: string;
  source: ApplicationSource;
  dateAdded: string;
  status: ResumeBankStatus;
  notes: string;
  linkedApplicationIds: string[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type ResumeBankSummary = {
  profilesInBank: number;
  addedThisMonth: number;
  linkedToApplications: number;
  clinicalProfilesPercent: number;
};

export type ResumeBankFilters = {
  skills?: string;
  qualification?: string;
  location?: string;
  candidateName?: string;
  experience?: string;
  designation?: string;
  department?: string;
  source?: string;
  search?: string;
};

export type GetResumeBankParams = ResumeBankFilters & {
  page?: string;
  limit?: string;
};

export const RESUME_BANK_EXPERIENCE_OPTIONS = [
  { id: '0-1', name: '0–1 years' },
  { id: '1-3', name: '1–3 years' },
  { id: '3-5', name: '3–5 years' },
  { id: '5+', name: '5+ years' }
] as const;

export type ResumeBankPayload = {
  candidateName: string;
  email: string;
  phone?: string;
  qualifications?: string;
  experienceYears: number | string;
  skills?: string[];
  preferredPosition?: string;
  preferredDepartment?: string;
  location?: string;
  source: ApplicationSource | string;
  status?: ResumeBankStatus | string;
  notes?: string;
  resumeFileName?: string;
  /** S3 object key after upload (Wave 10 document storage). */
  resumeFileKey?: string | null;
};

export type ResumeBankFormValues = {
  candidateName: string;
  email: string;
  phone: string;
  qualifications: string;
  experienceYears: string;
  skills: string[];
  preferredPosition: string;
  preferredDepartment: string;
  location: string;
  source: ApplicationSource | '';
  status: ResumeBankStatus | '';
  notes: string;
  resumeFileName: string;
  resumeFileKey: string | null;
};

export const EMPTY_RESUME_BANK_FORM: ResumeBankFormValues = {
  candidateName: '',
  email: '',
  phone: '',
  qualifications: '',
  experienceYears: '0',
  skills: [],
  preferredPosition: '',
  preferredDepartment: '',
  location: '',
  source: 'resume_bank',
  status: 'in_bank',
  notes: '',
  resumeFileName: '',
  resumeFileKey: null
};

export type AddToJobApplicationFormValues = {
  candidateName: string;
  jobPostId: string;
};

export const EMPTY_ADD_TO_JOB_FORM: AddToJobApplicationFormValues = {
  candidateName: '',
  jobPostId: ''
};

export function canMoveResumeToShortlisting(
  status: ResumeBankStatus
): boolean {
  return status === 'in_bank' || status === 'linked';
}

// ─── Shortlisting ────────────────────────────────────────────────────────────

export const SHORTLISTING_STATUSES = [
  'to_review',
  'shortlisted',
  'on_hold',
  'rejected'
] as const;

export type ShortlistingStatus = (typeof SHORTLISTING_STATUSES)[number];

export const SHORTLISTING_STATUS_LABELS: Record<ShortlistingStatus, string> = {
  to_review: 'To Review',
  shortlisted: 'Shortlisted',
  on_hold: 'On Hold',
  rejected: 'Rejected'
};

/** Application mid-pipeline row enriched for the Shortlisting register. */
export type ShortlistingRecord = ApplicationRecord & {
  qualifications: string;
  skills: string[];
  screeningScore: number;
  shortlistStatus: ShortlistingStatus;
  designation: string;
};

export type ShortlistingSummary = {
  toReview: number;
  shortlisted: number;
  onHold: number;
  avgScreeningScore: number;
};

export type ShortlistingFilters = {
  jobPostId?: string;
  department?: string;
  designation?: string;
  candidateName?: string;
  applicationDate?: string;
  experience?: string;
  status?: string;
  search?: string;
};

export function canShortlistFromRegister(record: ShortlistingRecord): boolean {
  return (
    record.status === 'active' && record.shortlistStatus === 'to_review'
  );
}

export function canHoldFromRegister(record: ShortlistingRecord): boolean {
  return (
    record.status === 'active' &&
    (record.shortlistStatus === 'to_review' ||
      record.shortlistStatus === 'shortlisted')
  );
}

export function screeningScoreBarClass(score: number): string {
  if (score >= 80) return 'bg-emerald-600';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function screeningScoreTextClass(score: number): string {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-600';
}

// ─── Interview Schedule ──────────────────────────────────────────────────────

export const INTERVIEW_STATUSES = [
  'scheduled',
  'confirmed',
  'rescheduled',
  'completed',
  'no_show',
  'cancelled'
] as const;

export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: 'Scheduled',
  confirmed: 'Confirmed',
  rescheduled: 'Rescheduled',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled'
};

export type InterviewRecord = {
  id: string;
  interviewCode: string;
  candidateName: string;
  applicationId: string;
  jobPostId: string;
  jobTitle: string;
  department: string;
  interviewDate: string;
  startTime: string;
  endTime: string;
  interviewerPanel: string;
  interviewType: InterviewType;
  location: string;
  notesToCandidate: string;
  status: InterviewStatus;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type InterviewSummary = {
  thisWeek: number;
  confirmed: number;
  rescheduled: number;
  noShow: number;
};

export type InterviewFilters = {
  interviewDate?: string;
  interviewer?: string;
  department?: string;
  jobPostId?: string;
  interviewType?: string;
  status?: string;
  search?: string;
};

export function canRescheduleInterview(record: InterviewRecord): boolean {
  return (
    record.status === 'scheduled' ||
    record.status === 'confirmed' ||
    record.status === 'rescheduled'
  );
}

export function canCancelInterview(record: InterviewRecord): boolean {
  return (
    record.status === 'scheduled' ||
    record.status === 'confirmed' ||
    record.status === 'rescheduled'
  );
}

export function canEvaluateInterview(record: InterviewRecord): boolean {
  return (
    record.status === 'completed' ||
    record.status === 'confirmed' ||
    record.status === 'rescheduled' ||
    record.status === 'scheduled'
  );
}

// ─── Evaluation ──────────────────────────────────────────────────────────────

/** Phase 0 static criteria — store as JSON / master later. */
export const EVALUATION_CRITERIA = [
  'technical_knowledge',
  'communication',
  'experience',
  'problem_solving',
  'leadership',
  'teamwork',
  'job_knowledge',
  'overall_performance'
] as const;

export type EvaluationCriterionId = (typeof EVALUATION_CRITERIA)[number];

export const EVALUATION_CRITERION_LABELS: Record<
  EvaluationCriterionId,
  string
> = {
  technical_knowledge: 'Technical Knowledge',
  communication: 'Communication',
  experience: 'Experience',
  problem_solving: 'Problem Solving',
  leadership: 'Leadership',
  teamwork: 'Teamwork',
  job_knowledge: 'Job Knowledge',
  overall_performance: 'Overall Performance'
};

export const EVALUATION_RATINGS = [
  'excellent',
  'good',
  'average',
  'poor'
] as const;

export type EvaluationRating = (typeof EVALUATION_RATINGS)[number];

export const EVALUATION_RATING_LABELS: Record<EvaluationRating, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  poor: 'Poor'
};

/** Score contribution toward /100 (equal-weight average of rated criteria). */
export const EVALUATION_RATING_SCORES: Record<EvaluationRating, number> = {
  excellent: 100,
  good: 75,
  average: 50,
  poor: 25
};

export const EVALUATION_DECISIONS = [
  'recommended',
  'recommended_with_conditions',
  'hold',
  'not_recommended'
] as const;

export type EvaluationDecision = (typeof EVALUATION_DECISIONS)[number];

export const EVALUATION_DECISION_LABELS: Record<EvaluationDecision, string> = {
  recommended: 'Recommended',
  recommended_with_conditions: 'Recommended with Conditions',
  hold: 'Hold',
  not_recommended: 'Not Recommended'
};

export const EVALUATION_STATUSES = ['draft', 'submitted'] as const;

export type EvaluationStatus = (typeof EVALUATION_STATUSES)[number];

export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted'
};

export type EvaluationRatingsMap = Partial<
  Record<EvaluationCriterionId, EvaluationRating>
>;

export type EvaluationPreviousEntry = {
  id: string;
  title: string;
  score: number;
  by: string;
  at: string;
};

export type EvaluationRecord = {
  id: string;
  interviewId: string;
  interviewCode: string;
  candidateName: string;
  jobTitle: string;
  interviewDate: string;
  interviewer: string;
  interviewType: InterviewType;
  interviewStage: string;
  ratings: EvaluationRatingsMap;
  strengths: string;
  weaknesses: string;
  interviewComments: string;
  recommendation: EvaluationDecision | '';
  finalDecision: EvaluationDecision | '';
  overallScore: number;
  status: EvaluationStatus;
  previousEvaluations: EvaluationPreviousEntry[];
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type EvaluationFormValues = {
  ratings: EvaluationRatingsMap;
  strengths: string;
  weaknesses: string;
  interviewComments: string;
  recommendation: string;
  finalDecision: string;
};

export const EMPTY_EVALUATION_FORM: EvaluationFormValues = {
  ratings: {},
  strengths: '',
  weaknesses: '',
  interviewComments: '',
  recommendation: '',
  finalDecision: ''
};

export function computeEvaluationScore(
  ratings: EvaluationRatingsMap
): { score: number; ratedCount: number; totalCriteria: number } {
  const totalCriteria = EVALUATION_CRITERIA.length;
  let sum = 0;
  let ratedCount = 0;
  for (const id of EVALUATION_CRITERIA) {
    const rating = ratings[id];
    if (rating) {
      sum += EVALUATION_RATING_SCORES[rating];
      ratedCount += 1;
    }
  }
  const score =
    ratedCount === 0 ? 0 : Math.round(sum / ratedCount);
  return { score, ratedCount, totalCriteria };
}

// ─── Appointment Letters ─────────────────────────────────────────────────────

export const APPOINTMENT_LETTER_STATUSES = [
  'draft',
  'pending_approval',
  'issued',
  'accepted',
  'declined'
] as const;

export type AppointmentLetterStatus =
  (typeof APPOINTMENT_LETTER_STATUSES)[number];

export const APPOINTMENT_LETTER_STATUS_LABELS: Record<
  AppointmentLetterStatus,
  string
> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  issued: 'Issued',
  accepted: 'Accepted',
  declined: 'Declined'
};

export const PROBATION_PERIOD_OPTIONS = [
  { id: '3_months', name: '3 months' },
  { id: '6_months', name: '6 months' },
  { id: '12_months', name: '12 months' },
  { id: 'none', name: 'None' }
] as const;

export type AppointmentLetterRecord = {
  id: string;
  letterNumber: string;
  evaluationId: string;
  candidateName: string;
  position: string;
  department: string;
  employmentType: VacancyEmploymentType;
  appointmentDate: string;
  salary: string;
  letterDate: string;
  reportingLocation: string;
  reportingManager: string;
  probationPeriod: string;
  benefits: string;
  termsAndConditions: string;
  status: AppointmentLetterStatus;
  letterGenerated: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
};

export type AppointmentLetterSummary = {
  offersExtended: number;
  pendingApproval: number;
  accepted: number;
  declined: number;
};

export type AppointmentLetterFilters = {
  letterNumber?: string;
  candidateName?: string;
  position?: string;
  department?: string;
  letterDate?: string;
  status?: string;
  search?: string;
};

export type AppointmentLetterFormValues = {
  candidateName: string;
  position: string;
  department: string;
  employmentType: string;
  salary: string;
  reportingDate: Date | null;
  reportingLocation: string;
  reportingManager: string;
  probationPeriod: string;
  letterDate: Date | null;
  benefits: string;
  termsAndConditions: string;
};

export const EMPTY_APPOINTMENT_LETTER_FORM: AppointmentLetterFormValues = {
  candidateName: '',
  position: '',
  department: '',
  employmentType: '',
  salary: '',
  reportingDate: null,
  reportingLocation: '',
  reportingManager: '',
  probationPeriod: '',
  letterDate: null,
  benefits: '',
  termsAndConditions: ''
};

export function canEditAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return (
    record.status === 'draft' ||
    record.status === 'pending_approval' ||
    record.status === 'issued' ||
    record.status === 'accepted'
  );
}

export function canGenerateAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return record.status !== 'declined';
}

export function canDownloadAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return record.letterGenerated;
}

export function canSendAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return (
    record.letterGenerated &&
    (record.status === 'pending_approval' || record.status === 'issued')
  );
}

export function canAcceptAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return record.status === 'issued' || record.status === 'pending_approval';
}

export function canDeclineAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return record.status === 'issued' || record.status === 'pending_approval';
}

export function canOnboardFromAppointmentLetter(
  record: AppointmentLetterRecord
): boolean {
  return record.status === 'accepted';
}
