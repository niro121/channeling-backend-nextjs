import type {
  ApplicationRecord,
  ApplicationSummary
} from '@/types/recruitment';

/** Phase 0 mock totals — match stage overview cards. */
export const SAMPLE_APPLICATION_SUMMARY: ApplicationSummary = {
  applied: 148,
  screening: 92,
  shortlisted: 34,
  interview: 18,
  selected: 8,
  offer: 6,
  hired: 4,
  rejected: 40
};

export const SAMPLE_JOB_POST_OPTIONS = [
  { id: 'JP-2026-018', name: 'JP-2026-018 — Nursing Officer – Ward 3' },
  { id: 'JP-2026-019', name: 'JP-2026-019 — Medical Officer – Emergency' },
  { id: 'JP-2026-020', name: 'JP-2026-020 — Lab Technician' },
  { id: 'JP-2026-021', name: 'JP-2026-021 — Radiographer' },
  { id: 'JP-2026-022', name: 'JP-2026-022 — Pharmacist' }
] as const;

/** Phase 0 mock rows — match Application Register design. */
export const SAMPLE_APPLICATIONS: ApplicationRecord[] = [
  {
    id: 'app-1',
    applicationId: 'APP-10231',
    candidateName: 'A. Perera',
    candidateEmail: 'a.perera@email.com',
    candidatePhone: '+94 77 123 4567',
    jobPostId: 'JP-2026-018',
    jobTitle: 'Nursing Officer – Ward 3',
    department: 'Nursing - Ward 3',
    appliedDate: '2026-09-18',
    experienceYears: 4,
    source: 'hospital_website',
    currentStage: 'interview',
    status: 'active',
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
        title: 'Screening',
        detail: 'Moved to screening',
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
    id: 'app-2',
    applicationId: 'APP-10232',
    candidateName: 'D. Rajapakse',
    candidateEmail: 'd.rajapakse@email.com',
    candidatePhone: '+94 71 222 3344',
    jobPostId: 'JP-2026-019',
    jobTitle: 'Medical Officer – Emergency',
    department: 'Emergency',
    appliedDate: '2026-09-19',
    experienceYears: 11,
    source: 'newspaper',
    currentStage: 'shortlisted',
    status: 'active',
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
    id: 'app-3',
    applicationId: 'APP-10233',
    candidateName: 'S. Cooray',
    candidateEmail: 's.cooray@email.com',
    candidatePhone: '+94 76 555 8899',
    jobPostId: 'JP-2026-020',
    jobTitle: 'Lab Technician',
    department: 'Laboratory',
    appliedDate: '2026-09-20',
    experienceYears: 2,
    source: 'resume_bank',
    currentStage: 'shortlisted',
    status: 'active',
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
    id: 'app-4',
    applicationId: 'APP-10234',
    candidateName: 'R. Fernando',
    candidateEmail: 'r.fernando@email.com',
    candidatePhone: '+94 75 111 2233',
    jobPostId: 'JP-2026-019',
    jobTitle: 'Medical Officer – Emergency',
    department: 'Emergency',
    appliedDate: '2026-09-21',
    experienceYears: 3,
    source: 'referral',
    currentStage: 'offer',
    status: 'active',
    resumeFileName: 'R_Fernando_CV.pdf',
    notes: 'Internal referral.',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Referral',
        userLabel: 'System',
        at: '2026-09-21T12:00:00'
      },
      {
        id: 'h2',
        title: 'Stage: Offer',
        detail: 'Offer prepared',
        userLabel: 'Dr. S. Wickrama',
        at: '2026-09-30T16:00:00'
      }
    ],
    createdAt: '2026-09-21T12:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-30T16:00:00',
    updatedBy: 'Dr. S. Wickrama'
  },
  {
    id: 'app-5',
    applicationId: 'APP-10235',
    candidateName: 'T. Dissanayake',
    candidateEmail: 't.dissanayake@email.com',
    candidatePhone: '+94 77 444 5566',
    jobPostId: 'JP-2026-018',
    jobTitle: 'Nursing Officer – Ward 3',
    department: 'Nursing - Ward 3',
    appliedDate: '2026-09-22',
    experienceYears: 1,
    source: 'hospital_website',
    currentStage: 'screening',
    status: 'active',
    resumeFileName: 'T_Dissanayake_CV.pdf',
    notes: '',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Hospital Website',
        userLabel: 'System',
        at: '2026-09-22T07:45:00'
      },
      {
        id: 'h2',
        title: 'Screening',
        detail: 'Moved to screening',
        userLabel: 'N. Silva (HR Officer)',
        at: '2026-09-24T10:00:00'
      }
    ],
    createdAt: '2026-09-22T07:45:00',
    createdBy: 'System',
    updatedAt: '2026-09-24T10:00:00',
    updatedBy: 'N. Silva'
  },
  {
    id: 'app-6',
    applicationId: 'APP-10236',
    candidateName: 'M. Silva',
    candidateEmail: 'm.silva@email.com',
    candidatePhone: '+94 70 998 7766',
    jobPostId: 'JP-2026-021',
    jobTitle: 'Radiographer',
    department: 'Radiology',
    appliedDate: '2026-09-22',
    experienceYears: 5,
    source: 'job_portal',
    currentStage: 'applied',
    status: 'active',
    resumeFileName: 'M_Silva_CV.pdf',
    notes: '',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Job Portal',
        userLabel: 'System',
        at: '2026-09-22T15:20:00'
      }
    ],
    createdAt: '2026-09-22T15:20:00',
    createdBy: 'System',
    updatedAt: '2026-09-22T15:20:00',
    updatedBy: 'System'
  },
  {
    id: 'app-7',
    applicationId: 'APP-10237',
    candidateName: 'N. Herath',
    candidateEmail: 'n.herath@email.com',
    candidatePhone: '+94 77 333 2211',
    jobPostId: 'JP-2026-020',
    jobTitle: 'Lab Technician',
    department: 'Laboratory',
    appliedDate: '2026-09-23',
    experienceYears: 0,
    source: 'hospital_website',
    currentStage: 'rejected',
    status: 'rejected',
    resumeFileName: 'N_Herath_CV.pdf',
    notes: 'Insufficient experience.',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Hospital Website',
        userLabel: 'System',
        at: '2026-09-23T09:00:00'
      },
      {
        id: 'h2',
        title: 'Rejected',
        detail: 'Insufficient experience',
        userLabel: 'K. Fernando (HR)',
        at: '2026-09-25T13:30:00'
      }
    ],
    createdAt: '2026-09-23T09:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-25T13:30:00',
    updatedBy: 'K. Fernando'
  },
  {
    id: 'app-8',
    applicationId: 'APP-10238',
    candidateName: 'K. Jayawardena',
    candidateEmail: 'k.jayawardena@email.com',
    candidatePhone: '+94 71 666 7788',
    jobPostId: 'JP-2026-018',
    jobTitle: 'Nursing Officer – Ward 3',
    department: 'Nursing - Ward 3',
    appliedDate: '2026-09-24',
    experienceYears: 6,
    source: 'referral',
    currentStage: 'hired',
    status: 'hired',
    resumeFileName: 'K_Jayawardena_CV.pdf',
    notes: 'Offer accepted.',
    history: [
      {
        id: 'h1',
        title: 'Application received',
        detail: 'Submitted via Referral',
        userLabel: 'System',
        at: '2026-09-24T11:40:00'
      },
      {
        id: 'h2',
        title: 'Stage: Hired',
        detail: 'Offer accepted',
        userLabel: 'Matron P. Jayasinghe',
        at: '2026-10-02T10:00:00'
      }
    ],
    createdAt: '2026-09-24T11:40:00',
    createdBy: 'System',
    updatedAt: '2026-10-02T10:00:00',
    updatedBy: 'Matron P. Jayasinghe'
  }
];
