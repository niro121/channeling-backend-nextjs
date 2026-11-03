'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import {
  createApplication,
  getApplicationById,
  getApplicationSummary,
  getApplications,
  getApplicationsForExport,
  getJobPostSelectOptions,
  rejectApplication,
  shortlistApplication
} from '@/services/recruitment-services/application.service';
import type {
  ApplicationPayload,
  GetApplicationsParams
} from '@/types/recruitment';

const APPLICATIONS_PATH = '/applications';
const JOB_POSTS_PATH = '/job-posts';
const RESUME_BANK_PATH = '/resume-bank';
const SHORTLISTING_PATH = '/shortlisting';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).applicationId;
  delete (payload as any).jobPostCode;
  delete (payload as any).jobTitle;
  delete (payload as any).department;
  delete (payload as any).history;
  delete (payload as any).appliedDate;
  delete (payload as any).currentStage;
  delete (payload as any).status;
  delete (payload as any).rejectReason;
  return payload;
}

export async function getApplicationsAction(params: GetApplicationsParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getApplications({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      jobPostId: params.jobPostId,
      jobTitle: params.jobTitle,
      candidateName: params.candidateName,
      applicationId: params.applicationId,
      applicationDate: params.applicationDate,
      department: params.department,
      status: params.status,
      source: params.source,
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
    console.error('getApplicationsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getApplicationSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getApplicationSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getApplicationSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getApplicationsExport(
  params: Omit<GetApplicationsParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getApplicationsForExport(params);
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
        message: 'No applications found',
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
    console.error('getApplicationsExport error', error);
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

export async function getApplicationByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getApplicationById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Application not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getApplicationByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch application.' }
    };
  }
}

export async function getApplicationFormOptionsAction() {
  try {
    await requirePermission('recruitment', 'view');
    const [deptRes, jobPostsRes, publishedRes] = await Promise.all([
      getDepartmentOptions(),
      getJobPostSelectOptions(),
      getJobPostSelectOptions({ publishedOnly: true })
    ]);

    const departments = deptRes.success ? (deptRes.data ?? []) : [];

    return {
      isError: false,
      data: {
        departments: departments.map((d) => ({ id: d.name, name: d.name })),
        jobPosts: jobPostsRes.success ? (jobPostsRes.data ?? []) : [],
        publishedJobPosts: publishedRes.success
          ? (publishedRes.data ?? [])
          : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getApplicationFormOptionsAction error:', error);
    return {
      isError: true,
      data: {
        departments: [],
        jobPosts: [],
        publishedJobPosts: []
      },
      errors: {
        message: error.message ?? 'Unable to load form options.'
      }
    };
  }
}

export async function createApplicationAction(data: ApplicationPayload) {
  await requirePermission('recruitment', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as ApplicationPayload;
    const auditUser = await getAuditUser();
    const result = await createApplication(payload, auditUser);

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
        action: 'recruitment.application.created',
        entityType: 'Application',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(JOB_POSTS_PATH);
    revalidatePath(RESUME_BANK_PATH);
    revalidatePath(SHORTLISTING_PATH);
    return {
      isError: false,
      data: {
        saved: true,
        id: result.data?.id as string | undefined,
        applicationId: result.data?.applicationId
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('createApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function shortlistApplicationAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await shortlistApplication(id, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors: {
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
        action: 'recruitment.application.shortlisted',
        entityType: 'Application',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(RESUME_BANK_PATH);
    revalidatePath(SHORTLISTING_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('shortlistApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function rejectApplicationAction(id: string, reason?: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await rejectApplication(id, reason, auditUser);

    if (!result.success) {
      return {
        isError: true,
        errors: {
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
        action: 'recruitment.application.rejected',
        entityType: 'Application',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(SHORTLISTING_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('rejectApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
