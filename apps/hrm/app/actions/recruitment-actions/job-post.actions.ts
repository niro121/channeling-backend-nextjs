'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import {
  createJobPost,
  getApprovedVacancyOptions,
  getJobPostById,
  getJobPostSummary,
  getJobPosts,
  getJobPostsForExport,
  updateJobPost
} from '@/services/recruitment-services/job-post.service';
import type { GetJobPostsParams, JobPostPayload } from '@/types/recruitment';

const JOB_POSTS_PATH = '/job-posts';
const VACANCY_REQUESTS_PATH = '/vacancy-requests';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).jobPostId;
  return payload;
}

export async function getJobPostsAction(params: GetJobPostsParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getJobPosts({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      jobTitle: params.jobTitle,
      department: params.department,
      designation: params.designation,
      employmentType: params.employmentType,
      status: params.status,
      postedDate: params.postedDate,
      closingDate: params.closingDate,
      search: params.search
    });

    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Error getting data. Please try again later'
      );
    }

    return {
      isError: false,
      data: {
        data: result.data?.records ?? [],
        totalRecords: result.data?.totalRecords ?? 0
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getJobPostsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getJobPostSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getJobPostSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getJobPostSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getJobPostsExport(
  params: Omit<GetJobPostsParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getJobPostsForExport(params);
    if (!response.success) {
      return {
        success: false,
        message:
          response.error?.message ??
          'Error getting data. Please try again later',
        data: [],
        totalRecords: 0
      };
    }
    if (!response.data?.length) {
      return {
        success: false,
        message: 'No job posts found',
        data: [],
        totalRecords: 0
      };
    }
    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords ?? response.data.length
    };
  } catch (error: unknown) {
    console.error('getJobPostsExport error', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Error getting data. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
}

export async function getJobPostByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getJobPostById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Job post not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getJobPostByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch job post.' }
    };
  }
}

export async function getJobPostFormOptionsAction(params?: {
  includeLinkedToJobPostId?: string;
}) {
  try {
    await requirePermission('recruitment', 'view');
    const [deptRes, desigRes, vacancyRes] = await Promise.all([
      getDepartmentOptions(),
      getDesignationOptions(),
      getApprovedVacancyOptions({
        includeLinkedToJobPostId: params?.includeLinkedToJobPostId
      })
    ]);

    return {
      isError: false,
      data: {
        departments: deptRes.success ? (deptRes.data ?? []) : [],
        designations: desigRes.success ? (desigRes.data ?? []) : [],
        approvedVacancies: vacancyRes.success ? (vacancyRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getJobPostFormOptionsAction error:', error);
    return {
      isError: true,
      data: {
        departments: [],
        designations: [],
        approvedVacancies: []
      },
      errors: {
        message: error.message ?? 'Unable to load form options.'
      }
    };
  }
}

export async function createJobPostAction(data: JobPostPayload) {
  await requirePermission('recruitment', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as JobPostPayload;
    const auditUser = await getAuditUser();
    const result = await createJobPost(payload, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'recruitment.jobPost.created',
        entityType: 'JobPost',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(JOB_POSTS_PATH);
    revalidatePath(VACANCY_REQUESTS_PATH);
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createJobPostAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateJobPostAction(id: string, data: JobPostPayload) {
  await requirePermission('recruitment', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as JobPostPayload;
    const auditUser = await getAuditUser();
    const result = await updateJobPost(id, payload, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors:
          result.error?.issues ?? {
            message:
              result.error?.message ??
              'Something went wrong. Please try again later'
          },
        data: {}
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'recruitment.jobPost.updated',
        entityType: 'JobPost',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(JOB_POSTS_PATH);
    revalidatePath(VACANCY_REQUESTS_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateJobPostAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
