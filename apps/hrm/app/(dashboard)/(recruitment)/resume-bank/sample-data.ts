import type {
  ResumeBankRecord,
  ResumeBankSummary
} from '@/types/recruitment';

/** Phase 0 mock totals — match Resume Bank summary cards. */
export const SAMPLE_RESUME_BANK_SUMMARY: ResumeBankSummary = {
  profilesInBank: 1284,
  addedThisMonth: 62,
  linkedToApplications: 214,
  clinicalProfilesPercent: 68
};

export const SAMPLE_RESUME_JOB_POST_OPTIONS = [
  { id: 'JP-2026-018', name: 'JP-2026-018 — Nursing Officer – Ward 3' },
  { id: 'JP-2026-019', name: 'JP-2026-019 — Medical Officer – Emergency' },
  { id: 'JP-2026-020', name: 'JP-2026-020 — Lab Technician' },
  { id: 'JP-2026-021', name: 'JP-2026-021 — Radiographer' },
  { id: 'JP-2026-022', name: 'JP-2026-022 — Pharmacist' }
] as const;

export const SAMPLE_EXPERIENCE_OPTIONS = [
  { id: '0-1', name: '0–1 years' },
  { id: '1-3', name: '1–3 years' },
  { id: '3-5', name: '3–5 years' },
  { id: '5+', name: '5+ years' }
] as const;

/** Phase 0 mock rows — match Candidate Profiles register. */
export const SAMPLE_RESUME_BANK: ResumeBankRecord[] = [
  {
    id: 'rb-1',
    candidateName: 'A. Perera',
    resumeFileName: 'A_Perera_CV.pdf',
    email: 'a.perera@email.com',
    phone: '+94 77 123 4567',
    qualifications: 'BSc Nursing',
    experienceYears: 4,
    skills: ['ICU care', 'IV therapy'],
    preferredPosition: 'Nursing Officer',
    preferredDepartment: 'Nursing - Ward 3',
    location: 'Matara',
    source: 'hospital_website',
    dateAdded: '2026-09-10',
    status: 'in_bank',
    notes: 'Strong ICU background.',
    createdAt: '2026-09-10T09:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-18T11:00:00',
    updatedBy: 'N. Silva'
  },
  {
    id: 'rb-2',
    candidateName: 'M. Karunaratne',
    resumeFileName: 'M_Karunaratne_CV.pdf',
    email: 'm.karunaratne@email.com',
    phone: '+94 71 222 8899',
    qualifications: 'MBBS',
    experienceYears: 8,
    skills: ['Triage', 'ACLS', 'Trauma'],
    preferredPosition: 'Medical Officer',
    preferredDepartment: 'Emergency',
    location: 'Galle',
    source: 'newspaper',
    dateAdded: '2026-09-12',
    status: 'linked',
    notes: '',
    createdAt: '2026-09-12T10:30:00',
    createdBy: 'System',
    updatedAt: '2026-09-20T14:00:00',
    updatedBy: 'K. Fernando'
  },
  {
    id: 'rb-3',
    candidateName: 'S. Cooray',
    resumeFileName: 'S_Cooray_Resume.pdf',
    email: 's.cooray@email.com',
    phone: '+94 76 555 1122',
    qualifications: 'Diploma MLT',
    experienceYears: 2,
    skills: ['Phlebotomy', 'Sample processing'],
    preferredPosition: 'Lab Technician',
    preferredDepartment: 'Laboratory',
    location: 'Matara',
    source: 'resume_bank',
    dateAdded: '2026-09-14',
    status: 'in_bank',
    notes: '',
    createdAt: '2026-09-14T08:15:00',
    createdBy: 'System',
    updatedAt: '2026-09-14T08:15:00',
    updatedBy: 'System'
  },
  {
    id: 'rb-4',
    candidateName: 'R. Fernando',
    resumeFileName: 'R_Fernando_CV.pdf',
    email: 'r.fernando@email.com',
    phone: '+94 75 333 7788',
    qualifications: 'MD Cardiology',
    experienceYears: 12,
    skills: ['Echo', 'Cath lab'],
    preferredPosition: 'Consultant Cardiologist',
    preferredDepartment: 'Cardiology',
    location: 'Colombo',
    source: 'referral',
    dateAdded: '2026-09-08',
    status: 'shortlisted',
    notes: 'Internal referral.',
    createdAt: '2026-09-08T12:00:00',
    createdBy: 'System',
    updatedAt: '2026-09-22T16:30:00',
    updatedBy: 'Dr. S. Wickrama'
  },
  {
    id: 'rb-5',
    candidateName: 'N. Perera',
    resumeFileName: 'N_Perera_CV.pdf',
    email: 'n.perera@email.com',
    phone: '+94 77 444 9900',
    qualifications: 'Diploma Radiography',
    experienceYears: 5,
    skills: ['X-Ray', 'CT'],
    preferredPosition: 'Radiographer',
    preferredDepartment: 'Radiology',
    location: 'Matara',
    source: 'job_portal',
    dateAdded: '2026-09-16',
    status: 'in_bank',
    notes: '',
    createdAt: '2026-09-16T11:20:00',
    createdBy: 'System',
    updatedAt: '2026-09-16T11:20:00',
    updatedBy: 'System'
  },
  {
    id: 'rb-6',
    candidateName: 'A. Fernando',
    resumeFileName: 'A_Fernando_CV.pdf',
    email: 'a.fernando@email.com',
    phone: '+94 70 111 2233',
    qualifications: 'BPharm',
    experienceYears: 3,
    skills: ['Dispensing', 'Inventory'],
    preferredPosition: 'Pharmacist',
    preferredDepartment: 'Pharmacy',
    location: 'Hambantota',
    source: 'hospital_website',
    dateAdded: '2026-09-18',
    status: 'linked',
    notes: '',
    createdAt: '2026-09-18T09:45:00',
    createdBy: 'System',
    updatedAt: '2026-09-25T10:00:00',
    updatedBy: 'N. Silva'
  }
];
