/** Max rating on the evaluation scale (shown as "x / 5.0"). */
export const EVALUATION_SCORE_MAX = 5;

export type PerformanceSummary = {
  evaluationsDue: number;
  probationReviews: number;
  promotionsYtd: number;
  warningsIssued: number;
};

export type RecentEvaluation = {
  id: string;
  name: string;
  department: string;
  score: number;
};

export type LetterKind =
  | 'warning'
  | 'appreciation'
  | 'promotion'
  | 'confirmation';

export type LetterSummary = {
  kind: LetterKind;
  label: string;
  issued: number;
};

/* -----------------------------------------------------------------------------
 * Mock data (UI preview only). Replace with action/service calls when the
 * Performance behaviour is implemented.
 * -------------------------------------------------------------------------- */

export const MOCK_PERFORMANCE_SUMMARY: PerformanceSummary = {
  evaluationsDue: 42,
  probationReviews: 18,
  promotionsYtd: 26,
  warningsIssued: 4
};

export const MOCK_RECENT_EVALUATIONS: RecentEvaluation[] = [
  {
    id: 'eval-1',
    name: 'Dr. R. Silva',
    department: 'Cardiology',
    score: 4.7
  },
  {
    id: 'eval-2',
    name: 'N. Fernando',
    department: 'Nursing · Ward 3',
    score: 4.3
  },
  {
    id: 'eval-3',
    name: 'K. Jayasuriya',
    department: 'OPD',
    score: 3.6
  },
  {
    id: 'eval-4',
    name: 'A. Kumara',
    department: 'Nursing · Trainee',
    score: 3.2
  },
  {
    id: 'eval-5',
    name: 'P. Bandara',
    department: 'Housekeeping',
    score: 2.4
  }
];

export const MOCK_LETTER_SUMMARIES: LetterSummary[] = [
  { kind: 'warning', label: 'Warning Letters', issued: 4 },
  { kind: 'appreciation', label: 'Appreciation Letters', issued: 18 },
  { kind: 'promotion', label: 'Promotion Letters', issued: 26 },
  { kind: 'confirmation', label: 'Confirmation Letters', issued: 12 }
];

/* -----------------------------------------------------------------------------
 * Probation Reviews
 * -------------------------------------------------------------------------- */

export const PROBATION_REVIEW_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'completed',
  'pending_approval',
  'overdue'
] as const;

export type ProbationReviewStatus = (typeof PROBATION_REVIEW_STATUSES)[number];

export const PROBATION_REVIEW_STATUS_LABELS: Record<
  ProbationReviewStatus,
  string
> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  completed: 'Completed',
  pending_approval: 'Pending Approval',
  overdue: 'Overdue'
};

export type ProbationReviewRecord = {
  id: string;
  staffCode: string;
  staffName: string;
  institution: string;
  department: string;
  designation: string;
  reportingManager: string;
  /** yyyy-MM-dd */
  joiningDate: string;
  /** yyyy-MM-dd */
  probationStartDate: string;
  /** yyyy-MM-dd */
  probationEndDate: string;
  /** yyyy-MM-dd */
  reviewDueDate: string;
  reviewStatus: ProbationReviewStatus;
};

export type ProbationReviewSummary = {
  totalOnProbation: number;
  reviewsDue: number;
  reviewsOverdue: number;
  reviewsCompleted: number;
};

export type ProbationReviewFilters = {
  staffName?: string;
  staffCode?: string;
  institution?: string;
  department?: string;
  designation?: string;
  reportingManager?: string;
  probationStartDate?: string;
  probationEndDate?: string;
  reviewStatus?: string;
};

export const MOCK_PROBATION_SUMMARY: ProbationReviewSummary = {
  totalOnProbation: 6,
  reviewsDue: 2,
  reviewsOverdue: 1,
  reviewsCompleted: 1
};

export const MOCK_PROBATION_REVIEWS: ProbationReviewRecord[] = [
  {
    id: 'prob-1',
    staffCode: 'RHM-N-201',
    staffName: 'A. Kumara',
    institution: 'Ruhunu Hospital',
    department: 'Nursing · Trainee',
    designation: 'Trainee Nurse',
    reportingManager: 'N. Silva',
    joiningDate: '2024-11-15',
    probationStartDate: '2026-07-01',
    probationEndDate: '2026-10-31',
    reviewDueDate: '2026-10-25',
    reviewStatus: 'draft'
  },
  {
    id: 'prob-2',
    staffCode: 'RHM-L-088',
    staffName: 'I. Rathnayake',
    institution: 'Ruhunu Hospital',
    department: 'Laboratory',
    designation: 'Lab Assistant',
    reportingManager: 'N. Silva',
    joiningDate: '2023-08-08',
    probationStartDate: '2026-07-01',
    probationEndDate: '2026-10-31',
    reviewDueDate: '2026-10-25',
    reviewStatus: 'pending_review'
  },
  {
    id: 'prob-3',
    staffCode: 'RHM-A-034',
    staffName: 'K. Jayasuriya',
    institution: 'Ruhunu Hospital',
    department: 'OPD Reception',
    designation: 'Clerk',
    reportingManager: 'N. Silva',
    joiningDate: '2022-06-22',
    probationStartDate: '2026-07-01',
    probationEndDate: '2026-10-31',
    reviewDueDate: '2026-10-25',
    reviewStatus: 'approved'
  },
  {
    id: 'prob-4',
    staffCode: 'RHM-L-072',
    staffName: 'M. Perera',
    institution: 'Ruhunu Hospital',
    department: 'Laboratory',
    designation: 'Technician',
    reportingManager: 'N. Silva',
    joiningDate: '2016-09-17',
    probationStartDate: '2026-07-01',
    probationEndDate: '2026-10-31',
    reviewDueDate: '2026-10-25',
    reviewStatus: 'completed'
  },
  {
    id: 'prob-5',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    institution: 'Ruhunu Hospital',
    department: 'Nursing · Ward 3',
    designation: 'Nursing Officer',
    reportingManager: 'N. Silva',
    joiningDate: '2019-03-04',
    probationStartDate: '2026-07-01',
    probationEndDate: '2026-10-31',
    reviewDueDate: '2026-10-25',
    reviewStatus: 'pending_approval'
  },
  {
    id: 'prob-6',
    staffCode: 'RHM-E-045',
    staffName: 'S. Wijesinghe',
    institution: 'Ruhunu Hospital',
    department: 'Emergency',
    designation: 'Medical Officer',
    reportingManager: 'N. Silva',
    joiningDate: '2023-02-01',
    probationStartDate: '2026-07-01',
    probationEndDate: '2026-10-31',
    reviewDueDate: '2026-10-01',
    reviewStatus: 'overdue'
  }
];

/* -----------------------------------------------------------------------------
 * Promotions
 * -------------------------------------------------------------------------- */

/** Generic `{ id, name }` option used by Performance filters and forms. */
export type PerformanceSelectOption = { id: string; name: string };

export const PROMOTION_STATUSES = [
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'effective'
] as const;

export type PromotionStatus = (typeof PROMOTION_STATUSES)[number];

export const PROMOTION_STATUS_LABELS: Record<PromotionStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  effective: 'Effective'
};

export const PROMOTION_TYPES = [
  'merit',
  'seniority',
  'acting_upgrade',
  'restructure'
] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  merit: 'Merit',
  seniority: 'Seniority',
  acting_upgrade: 'Acting Upgrade',
  restructure: 'Restructure'
};

export type PromotionRecord = {
  id: string;
  /** e.g. PM-2026-001 */
  requestId: string;
  staffCode: string;
  staffName: string;
  institution: string;
  department: string;
  currentDesignation: string;
  proposedDesignation: string;
  currentGrade: string;
  proposedGrade: string;
  currentReportingManager: string;
  requestedBy: string;
  /** yyyy-MM-dd */
  requestDate: string;
  /** yyyy-MM-dd */
  effectiveDate: string;
  promotionType: PromotionType;
  approvalStatus: PromotionStatus;
};

export type PromotionSummary = {
  totalRequests: number;
  pendingApproval: number;
  approvedPromotions: number;
  effectiveThisMonth: number;
};

export type PromotionFilters = {
  staffName?: string;
  staffCode?: string;
  institution?: string;
  department?: string;
  currentDesignation?: string;
  proposedDesignation?: string;
  promotionType?: string;
  requestDate?: string;
  effectiveDate?: string;
  approvalStatus?: string;
};

export const MOCK_PROMOTION_SUMMARY: PromotionSummary = {
  totalRequests: 6,
  pendingApproval: 1,
  approvedPromotions: 2,
  effectiveThisMonth: 2
};

export const MOCK_PROMOTIONS: PromotionRecord[] = [
  {
    id: 'promo-1',
    requestId: 'PM-2026-001',
    staffCode: 'RHM-N-201',
    staffName: 'A. Kumara',
    institution: 'Ruhunu Hospital',
    department: 'Nursing · Trainee',
    currentDesignation: 'Trainee Nurse',
    proposedDesignation: 'Senior Nursing Officer',
    currentGrade: 'D · Trainee',
    proposedGrade: 'B · Grade I',
    currentReportingManager: 'N. Silva',
    requestedBy: 'N. Silva',
    requestDate: '2026-10-20',
    effectiveDate: '2026-11-01',
    promotionType: 'merit',
    approvalStatus: 'effective'
  },
  {
    id: 'promo-2',
    requestId: 'PM-2026-006',
    staffCode: 'RHM-L-088',
    staffName: 'I. Rathnayake',
    institution: 'Ruhunu Hospital',
    department: 'Laboratory',
    currentDesignation: 'Lab Assistant',
    proposedDesignation: 'Senior Nursing Officer',
    currentGrade: 'C · Grade III',
    proposedGrade: 'B · Grade I',
    currentReportingManager: 'N. Silva',
    requestedBy: 'N. Silva',
    requestDate: '2026-10-20',
    effectiveDate: '2026-12-01',
    promotionType: 'seniority',
    approvalStatus: 'draft'
  },
  {
    id: 'promo-3',
    requestId: 'PM-2026-003',
    staffCode: 'RHM-A-034',
    staffName: 'K. Jayasuriya',
    institution: 'Ruhunu Hospital',
    department: 'OPD Reception',
    currentDesignation: 'Clerk',
    proposedDesignation: 'Senior Nursing Officer',
    currentGrade: 'C · Grade III',
    proposedGrade: 'B · Grade I',
    currentReportingManager: 'N. Silva',
    requestedBy: 'N. Silva',
    requestDate: '2026-10-20',
    effectiveDate: '2026-12-01',
    promotionType: 'merit',
    approvalStatus: 'approved'
  },
  {
    id: 'promo-4',
    requestId: 'PM-2026-004',
    staffCode: 'RHM-L-072',
    staffName: 'M. Perera',
    institution: 'Ruhunu Hospital',
    department: 'Laboratory',
    currentDesignation: 'Technician',
    proposedDesignation: 'Senior Nursing Officer',
    currentGrade: 'B · Grade II',
    proposedGrade: 'B · Grade I',
    currentReportingManager: 'N. Silva',
    requestedBy: 'N. Silva',
    requestDate: '2026-10-20',
    effectiveDate: '2026-12-01',
    promotionType: 'acting_upgrade',
    approvalStatus: 'approved'
  },
  {
    id: 'promo-5',
    requestId: 'PM-2026-002',
    staffCode: 'RHM-N-118',
    staffName: 'N. Fernando',
    institution: 'Ruhunu Hospital',
    department: 'Nursing · Ward 3',
    currentDesignation: 'Nursing Officer',
    proposedDesignation: 'Senior Nursing Officer',
    currentGrade: 'B · Grade II',
    proposedGrade: 'B · Grade I',
    currentReportingManager: 'N. Silva',
    requestedBy: 'N. Silva',
    requestDate: '2026-10-20',
    effectiveDate: '2026-12-01',
    promotionType: 'merit',
    approvalStatus: 'pending_approval'
  },
  {
    id: 'promo-6',
    requestId: 'PM-2026-005',
    staffCode: 'RHM-E-045',
    staffName: 'S. Wijesinghe',
    institution: 'Ruhunu Hospital',
    department: 'Emergency',
    currentDesignation: 'Medical Officer',
    proposedDesignation: 'Senior Nursing Officer',
    currentGrade: 'A · Grade II',
    proposedGrade: 'B · Grade I',
    currentReportingManager: 'N. Silva',
    requestedBy: 'N. Silva',
    requestDate: '2026-10-20',
    effectiveDate: '2026-11-01',
    promotionType: 'restructure',
    approvalStatus: 'effective'
  }
];
