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

// ─── Applications ────────────────────────────────────────────────────────────

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
  jobPostId: string;
  jobTitle: string;
  department: string;
  appliedDate: string;
  experienceYears: number;
  source: ApplicationSource;
  currentStage: ApplicationStage;
  status: ApplicationStatus;
  resumeFileName: string;
  notes: string;
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
  candidateName: string;
  resumeFileName: string;
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

export type AddToJobApplicationFormValues = {
  candidateName: string;
  jobPostId: string;
};

export const EMPTY_ADD_TO_JOB_FORM: AddToJobApplicationFormValues = {
  candidateName: '',
  jobPostId: ''
};

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
