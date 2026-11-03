import { z } from 'zod';
import prisma, { Prisma } from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import {
  deleteResumeQuietly,
  putResumeBytes
} from '@/lib/helpers/s3/put-resume-bytes';
import { MOBILE_NUMBER_REGEX } from '@/lib/validations/phone-mobile';
import type {
  ListPublicJobsParams,
  PublicApplyPayload,
  PublicApplyResult,
  PublicApplyResumeFile,
  PublicJobDetail,
  PublicJobListItem
} from '@/types/public-careers';
import { createApplication } from '@/services/recruitment-services/application.service';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/** Published and still open (closingDate not in the past). */
function publicJobWhere(
  keyword?: string
): Prisma.JobPostWhereInput {
  const now = new Date();
  const base: Prisma.JobPostWhereInput = {
    status: 'published',
    closingDate: { gte: now }
  };
  const search = keyword?.trim();
  if (!search) return base;

  return {
    AND: [
      base,
      {
        OR: [
          { jobTitle: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } },
          { departmentName: { contains: search, mode: 'insensitive' } },
          { designationName: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } }
        ]
      }
    ]
  };
}

function toIso(date?: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

function isAcceptingApplications(
  status: string,
  closingDate: Date
): boolean {
  return status === 'published' && closingDate.getTime() >= Date.now();
}

function toListItem(row: {
  slug: string;
  jobTitle: string;
  shortDescription: string;
  departmentName: string;
  designationName: string;
  employmentType: string;
  openings: number;
  postedDate: Date | null;
  closingDate: Date;
  status: string;
}): PublicJobListItem {
  return {
    slug: row.slug,
    jobTitle: row.jobTitle,
    shortDescription: row.shortDescription ?? '',
    departmentName: row.departmentName ?? '',
    designationName: row.designationName ?? '',
    employmentType: row.employmentType,
    openings: row.openings,
    postedDate: toIso(row.postedDate),
    closingDate: row.closingDate.toISOString(),
    acceptingApplications: isAcceptingApplications(row.status, row.closingDate)
  };
}

const listSelect = {
  slug: true,
  jobTitle: true,
  shortDescription: true,
  departmentName: true,
  designationName: true,
  employmentType: true,
  openings: true,
  postedDate: true,
  closingDate: true,
  status: true
} satisfies Prisma.JobPostSelect;

const detailSelect = {
  ...listSelect,
  jobDescription: true,
  responsibilities: true,
  qualifications: true,
  experience: true,
  skills: true,
  salaryInformation: true,
  applicationInstructions: true
} satisfies Prisma.JobPostSelect;

export async function listPublicJobs(params: ListPublicJobsParams = {}): Promise<{
  success: boolean;
  data?: { jobs: PublicJobListItem[]; total: number; page: number; limit: number };
  error?: { message?: string };
}> {
  try {
    const page = Math.max(0, params.page ?? 0);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, params.limit ?? DEFAULT_LIMIT)
    );
    const where = publicJobWhere(params.keyword);

    const [rows, total] = await Promise.all([
      prisma.jobPost.findMany({
        where,
        select: listSelect,
        orderBy: [{ postedDate: 'desc' }, { createdAt: 'desc' }],
        skip: page * limit,
        take: limit
      }),
      prisma.jobPost.count({ where })
    ]);

    return {
      success: true,
      data: {
        jobs: rows.map(toListItem),
        total,
        page,
        limit
      }
    };
  } catch (error: unknown) {
    console.error('listPublicJobs error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to list public jobs'
      }
    };
  }
}

export async function getPublicJobBySlug(slug: string): Promise<{
  success: boolean;
  data?: PublicJobDetail;
  notFound?: boolean;
  error?: { message?: string };
}> {
  try {
    const slugTrimmed = slug?.trim();
    if (!slugTrimmed) {
      return { success: false, notFound: true };
    }

    const row = await prisma.jobPost.findUnique({
      where: { slug: slugTrimmed },
      select: detailSelect
    });

    if (!row || row.status !== 'published') {
      return { success: false, notFound: true };
    }

    // Expired published posts: treat as not found for the public site
    if (row.closingDate.getTime() < Date.now()) {
      return { success: false, notFound: true };
    }

    const list = toListItem(row);
    return {
      success: true,
      data: {
        ...list,
        jobDescription: row.jobDescription ?? '',
        responsibilities: row.responsibilities ?? '',
        qualifications: row.qualifications ?? '',
        experience: row.experience ?? '',
        skills: row.skills ?? [],
        salaryInformation: row.salaryInformation ?? '',
        applicationInstructions: row.applicationInstructions ?? ''
      }
    };
  } catch (error: unknown) {
    console.error('getPublicJobBySlug error:', error);
    return {
      success: false,
      error: {
        message:
          error instanceof Error ? error.message : 'Failed to load public job'
      }
    };
  }
}

export function isCareersPublicApplyEnabled(): boolean {
  return /^(1|true|yes)$/i.test(
    process.env.CAREERS_PUBLIC_APPLY_ENABLED ?? ''
  );
}

const publicApplySchema = z.object({
  jobSlug: z.string().trim().min(1, 'Job slug is required').max(200),
  candidateName: z
    .string()
    .trim()
    .min(1, 'Candidate name is required')
    .max(200),
  candidateEmail: z
    .string()
    .trim()
    .email('Enter a valid email')
    .max(200),
  candidatePhone: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine(
      (v) => v === '' || MOBILE_NUMBER_REGEX.test(v),
      'Mobile Number Ex: 07x xxxxxxx'
    ),
  experienceYears: z.coerce
    .number()
    .int('Enter a whole number of years')
    .min(0, 'Experience cannot be negative')
    .max(60, 'Experience looks too high')
    .optional()
    .default(0),
  qualifications: z.string().trim().optional().default(''),
  skills: z.array(z.string().trim()).optional().default([])
});

export type ApplyPublicJobResult =
  | { success: true; data: PublicApplyResult }
  | {
      success: false;
      code:
        | 'apply_disabled'
        | 'not_found'
        | 'not_accepting'
        | 'validation_failed'
        | 'invalid_resume'
        | 'duplicate'
        | 'server_error';
      message: string;
      issues?: Record<string, string[]>;
    };

/**
 * Public careers apply. Optional CV uploaded server-side to S3 (resumes/).
 * Resolves job by slug, enforces published + open, then reuses createApplication.
 */
export async function applyPublicJob(
  payload: PublicApplyPayload,
  actingUser: AuditUser,
  resume?: PublicApplyResumeFile | null
): Promise<ApplyPublicJobResult> {
  let uploadedKey: string | null = null;

  try {
    if (!isCareersPublicApplyEnabled()) {
      return {
        success: false,
        code: 'apply_disabled',
        message: 'Public applications are temporarily disabled'
      };
    }

    const parsed = publicApplySchema.safeParse(payload);
    if (!parsed.success) {
      return {
        success: false,
        code: 'validation_failed',
        message: 'Validation failed',
        issues: parsed.error.flatten().fieldErrors as Record<string, string[]>
      };
    }

    const data = parsed.data;
    const job = await prisma.jobPost.findUnique({
      where: { slug: data.jobSlug },
      select: {
        id: true,
        slug: true,
        jobTitle: true,
        status: true,
        closingDate: true
      }
    });

    if (!job || job.status !== 'published') {
      return {
        success: false,
        code: 'not_found',
        message: 'Job not found or not available'
      };
    }

    if (!isAcceptingApplications(job.status, job.closingDate)) {
      return {
        success: false,
        code: 'not_accepting',
        message: 'This job is no longer accepting applications'
      };
    }

    let resumeFileName = '';
    let resumeFileKey: string | null = null;

    if (resume) {
      const uploaded = await putResumeBytes({
        bytes: resume.bytes,
        fileName: resume.fileName,
        contentType: resume.contentType,
        sizeBytes: resume.sizeBytes,
        keySegments: ['application', 'public', job.slug]
      });
      if (!uploaded.success) {
        return {
          success: false,
          code: 'invalid_resume',
          message: uploaded.error,
          issues: { resume: [uploaded.error] }
        };
      }
      resumeFileName = uploaded.fileName;
      resumeFileKey = uploaded.fileKey;
      uploadedKey = uploaded.fileKey;
    }

    const created = await createApplication(
      {
        candidateName: data.candidateName,
        candidateEmail: data.candidateEmail,
        candidatePhone: data.candidatePhone,
        experienceYears: data.experienceYears,
        qualifications: data.qualifications,
        skills: data.skills,
        jobPostId: job.id,
        source: 'hospital_website',
        resumeFileName,
        resumeFileKey
      },
      {
        id: actingUser.id,
        name: actingUser.name?.trim() || 'Hospital Website'
      }
    );

    if (!created.success || !created.data) {
      if (uploadedKey) await deleteResumeQuietly(uploadedKey);

      const emailIssues = created.error?.issues?.candidateEmail;
      const isDuplicate =
        created.error?.message === 'Duplicate application' ||
        (emailIssues ?? []).some((m) =>
          m.toLowerCase().includes('already exists')
        );
      if (isDuplicate) {
        return {
          success: false,
          code: 'duplicate',
          message: 'An application already exists for this email on this job',
          issues: created.error?.issues
        };
      }
      return {
        success: false,
        code: 'validation_failed',
        message: created.error?.message ?? 'Could not submit application',
        issues: created.error?.issues
      };
    }

    return {
      success: true,
      data: {
        applicationId: created.data.applicationId,
        jobSlug: job.slug,
        jobTitle: job.jobTitle,
        appliedDate: created.data.appliedDate,
        acceptingApplications: true,
        hasResume: Boolean(resumeFileKey)
      }
    };
  } catch (error: unknown) {
    if (uploadedKey) await deleteResumeQuietly(uploadedKey);
    console.error('applyPublicJob error:', error);
    return {
      success: false,
      code: 'server_error',
      message:
        error instanceof Error ? error.message : 'Failed to submit application'
    };
  }
}
