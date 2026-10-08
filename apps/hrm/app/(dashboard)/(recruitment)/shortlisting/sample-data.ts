import type {
  ShortlistingRecord,
  ShortlistingSummary
} from '@/types/recruitment';

/** Phase 0 mock totals — match Shortlisting summary cards. */
export const SAMPLE_SHORTLISTING_SUMMARY: ShortlistingSummary = {
  toReview: 58,
  shortlisted: 34,
  onHold: 9,
  avgScreeningScore: 76
};

export const SAMPLE_SHORTLISTING_JOB_POST_OPTIONS = [
  { id: 'JP-2026-018', name: 'JP-2026-018 — Nursing Officer – Ward 3' },
  { id: 'JP-2026-019', name: 'JP-2026-019 — Medical Officer – Emergency' },
  { id: 'JP-2026-020', name: 'JP-2026-020 — Lab Technician' },
  { id: 'JP-2026-021', name: 'JP-2026-021 — Radiographer' },
  { id: 'JP-2026-022', name: 'JP-2026-022 — Pharmacist' }
] as const;

export const SAMPLE_SHORTLISTING_EXPERIENCE_OPTIONS = [
  { id: '0-1', name: '0–1 years' },
  { id: '1-3', name: '1–3 years' },
  { id: '3-5', name: '3–5 years' },
  { id: '5+', name: '5+ years' }
] as const;

/** Phase 0 mock rows — match Shortlisting Register design. */
export const SAMPLE_SHORTLISTING: ShortlistingRecord[] = [
  {
    id: 'sl-1',
    applicationId: 'APP-10231',
    candidateName: 'A. Perera',
    candidateEmail: 'a.perera@email.com',
    candidatePhone: '+94 77 123 4567',
    jobPostId: 'JP-2026-018',
    jobTitle: 'Nursing Officer – Ward 3',
    designation: 'Nursing Officer',
    department: 'Nursing - Ward 3',
    appliedDate: '2026-09-18',
    experienceYears: 4,
    qualifications: 'BSc Nursing',
    skills: ['ICU care', 'IV therapy'],
    screeningScore: 86,
    source: 'hospital_website',
    currentStage: 'interview',
    status: 'active',
    shortlistStatus: 'shortlisted',
    resumeFileName: 'A_Perera_CV.pdf',
    notes: 'Strong ward experience.',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Hospital Website',
        userLabel: 'System',
        at: '2026-09-18T09:10:00'
      },
      {
        id: 'h2',
        title: 'Stage: Shortlisted',
        detail: 'Added to shortlist',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-25T10:00:00'
      },
      {
        id: 'h3',
        title: 'Stage: Interview',
        detail: 'Interview stage opened',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-28T11:00:00'
      }
    ],
    createdAt: '2026-09-18T09:10:00',
    createdBy: 'System',
    updatedAt: '2026-09-28T11:00:00',
    updatedBy: 'N. Silva'
  },
  {
    id: 'sl-2',
    applicationId: 'APP-10232',
    candidateName: 'D. Rajapakse',
    candidateEmail: 'd.rajapakse@email.com',
    candidatePhone: '+94 71 222 3344',
    jobPostId: 'JP-2026-019',
    jobTitle: 'Medical Officer – Emergency',
    designation: 'Medical Officer',
    department: 'Emergency',
    appliedDate: '2026-09-19',
    experienceYears: 11,
    qualifications: 'MBBS',
    skills: ['Trauma', 'ACLS'],
    screeningScore: 91,
    source: 'newspaper',
    currentStage: 'shortlisted',
    status: 'active',
    shortlistStatus: 'shortlisted',
    resumeFileName: 'D_Rajapakse_CV.pdf',
    notes: '',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Newspaper',
        userLabel: 'System',
        at: '2026-09-19T10:00:00'
      },
      {
        id: 'h2',
        title: 'Stage: Shortlisted',
        detail: 'Added to shortlist',
        userLabel: 'K. Fernando (HR)',
        at: '2026-09-26T14:20:00'
      }
    ],
    createdAt: '2026-09-19T10:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-26T14:20:00',
    updatedBy: 'K. Fernando'
  },
  {
    id: 'sl-3',
    applicationId: 'APP-10233',
    candidateName: 'S. Cooray',
    candidateEmail: 's.cooray@email.com',
    candidatePhone: '+94 76 555 8899',
    jobPostId: 'JP-2026-020',
    jobTitle: 'Lab Technician',
    designation: 'Lab Technician',
    department: 'Laboratory',
    appliedDate: '2026-09-20',
    experienceYears: 2,
    qualifications: 'BSc MLT',
    skills: ['Haematology', 'QC'],
    screeningScore: 78,
    source: 'resume_bank',
    currentStage: 'shortlisted',
    status: 'active',
    shortlistStatus: 'shortlisted',
    resumeFileName: 'S_Cooray_Resume.pdf',
    notes: '',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Resume Bank',
        userLabel: 'System',
        at: '2026-09-20T08:30:00'
      },
      {
        id: 'h2',
        title: 'Stage: Shortlisted',
        detail: 'Added to shortlist',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-27T09:15:00'
      }
    ],
    createdAt: '2026-09-20T08:30:00',
    createdBy: 'System',
    updatedAt: '2026-09-27T09:15:00',
    updatedBy: 'N. Silva'
  },
  {
    id: 'sl-4',
    applicationId: 'APP-10234',
    candidateName: 'R. Fernando',
    candidateEmail: 'r.fernando@email.com',
    candidatePhone: '+94 75 333 7788',
    jobPostId: 'JP-2026-018',
    jobTitle: 'Nursing Officer – Ward 3',
    designation: 'Nursing Officer',
    department: 'Nursing - Ward 3',
    appliedDate: '2026-09-22',
    experienceYears: 1,
    qualifications: 'Diploma Nursing',
    skills: ['Ward care'],
    screeningScore: 64,
    source: 'job_portal',
    currentStage: 'screening',
    status: 'active',
    shortlistStatus: 'to_review',
    resumeFileName: 'R_Fernando_CV.pdf',
    notes: '',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Job Portal',
        userLabel: 'System',
        at: '2026-09-22T11:00:00'
      },
      {
        id: 'h2',
        title: 'Screening',
        detail: 'Moved to screening',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-24T09:00:00'
      }
    ],
    createdAt: '2026-09-22T11:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-24T09:00:00',
    updatedBy: 'N. Silva'
  },
  {
    id: 'sl-5',
    applicationId: 'APP-10235',
    candidateName: 'M. Karunaratne',
    candidateEmail: 'm.karunaratne@email.com',
    candidatePhone: '+94 70 111 2233',
    jobPostId: 'JP-2026-019',
    jobTitle: 'Medical Officer – Emergency',
    designation: 'Medical Officer',
    department: 'Emergency',
    appliedDate: '2026-09-21',
    experienceYears: 8,
    qualifications: 'MBBS',
    skills: ['Triage', 'ACLS'],
    screeningScore: 94,
    source: 'referral',
    currentStage: 'screening',
    status: 'active',
    shortlistStatus: 'to_review',
    resumeFileName: 'M_Karunaratne_CV.pdf',
    notes: '',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Referral',
        userLabel: 'System',
        at: '2026-09-21T14:00:00'
      }
    ],
    createdAt: '2026-09-21T14:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-21T14:00:00',
    updatedBy: 'System'
  },
  {
    id: 'sl-6',
    applicationId: 'APP-10236',
    candidateName: 'N. Perera',
    candidateEmail: 'n.perera@email.com',
    candidatePhone: '+94 77 444 9900',
    jobPostId: 'JP-2026-021',
    jobTitle: 'Radiographer',
    designation: 'Radiographer',
    department: 'Radiology',
    appliedDate: '2026-09-16',
    experienceYears: 5,
    qualifications: 'Diploma Radiography',
    skills: ['X-Ray', 'CT'],
    screeningScore: 72,
    source: 'hospital_website',
    currentStage: 'shortlisted',
    status: 'active',
    shortlistStatus: 'on_hold',
    resumeFileName: 'N_Perera_CV.pdf',
    notes: 'Awaiting reference check.',
    history: [
      {
        id: 'h1',
        title: 'Stage: Shortlisted',
        detail: 'Added to shortlist',
        userLabel: 'K. Fernando (HR)',
        at: '2026-09-20T10:00:00'
      },
      {
        id: 'h2',
        title: 'On Hold',
        detail: 'Placed on hold pending references',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-26T15:00:00'
      }
    ],
    createdAt: '2026-09-16T11:20:00',
    createdBy: 'System',
    updatedAt: '2026-09-26T15:00:00',
    updatedBy: 'N. Silva'
  },
  {
    id: 'sl-7',
    applicationId: 'APP-10237',
    candidateName: 'A. Fernando',
    candidateEmail: 'a.fernando@email.com',
    candidatePhone: '+94 75 888 1122',
    jobPostId: 'JP-2026-022',
    jobTitle: 'Pharmacist',
    designation: 'Pharmacist',
    department: 'Pharmacy',
    appliedDate: '2026-09-15',
    experienceYears: 0,
    qualifications: 'BPharm',
    skills: ['Dispensing'],
    screeningScore: 48,
    source: 'job_portal',
    currentStage: 'rejected',
    status: 'rejected',
    shortlistStatus: 'rejected',
    resumeFileName: 'A_Fernando_CV.pdf',
    notes: 'Insufficient experience.',
    history: [
      {
        id: 'h1',
        title: 'Screening',
        detail: 'Moved to screening',
        userLabel: 'System',
        at: '2026-09-16T09:00:00'
      },
      {
        id: 'h2',
        title: 'Rejected',
        detail: 'Insufficient experience for role',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-23T11:30:00'
      }
    ],
    createdAt: '2026-09-15T09:45:00',
    createdBy: 'System',
    updatedAt: '2026-09-23T11:30:00',
    updatedBy: 'N. Silva'
  }
];
