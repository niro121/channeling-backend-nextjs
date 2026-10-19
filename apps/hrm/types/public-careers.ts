/** Thin public Careers API DTOs — never include internal HR fields. */

export type PublicJobListItem = {
  slug: string;
  jobTitle: string;
  shortDescription: string;
  departmentName: string;
  designationName: string;
  employmentType: string;
  openings: number;
  postedDate: string | null;
  closingDate: string;
  acceptingApplications: boolean;
};

export type PublicJobDetail = PublicJobListItem & {
  jobDescription: string;
  responsibilities: string;
  qualifications: string;
  experience: string;
  skills: string[];
  salaryInformation: string;
  applicationInstructions: string;
};

export type ListPublicJobsParams = {
  keyword?: string;
  page?: number;
  limit?: number;
};

/** Public apply body — identify job by careers slug (not internal ObjectId). */
export type PublicApplyPayload = {
  jobSlug: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  experienceYears?: number;
  qualifications?: string;
  skills?: string[];
};

export type PublicApplyResult = {
  applicationId: string;
  jobSlug: string;
  jobTitle: string;
  appliedDate: string;
  acceptingApplications: true;
};
