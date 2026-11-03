'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getJobPostSelectOptions } from '@/services/recruitment-services/application.service';
import {
  cancelInterview,
  confirmInterview,
  createInterview,
  getInterviewById,
  getInterviewableApplicationOptions,
  getInterviewSummary,
  getInterviews,
  getInterviewsForExport,
  rescheduleInterview
} from '@/services/recruitment-services/interview.service';
import type {
  GetInterviewsParams,
  InterviewPayload,
  RescheduleInterviewPayload
} from '@/types/recruitment';

const INTERVIEW_PATH = '/interview-schedule';
const APPLICATIONS_PATH = '/applications';
const SHORTLISTING_PATH = '/shortlisting';
const EVALUATION_PATH = '/evaluation';

export async function getInterviewsAction(params: GetInterviewsParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getInterviews({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      interviewDate: params.interviewDate,
      interviewer: params.interviewer,
      department: params.department,
      jobPostId: params.jobPostId,
      interviewType: params.interviewType,
      status: params.status,
      search: params.search,
      weekStart: params.weekStart
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
    console.error('getInterviewsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getInterviewSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getInterviewSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getInterviewSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getInterviewsExport(
  params: Omit<GetInterviewsParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getInterviewsForExport(params);
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
        message: 'No interviews found',
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
    console.error('getInterviewsExport error', error);
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

export async function getInterviewByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getInterviewById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Interview not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getInterviewByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch interview.' }
    };
  }
}

export async function getInterviewFormOptionsAction() {
  try {
    await requirePermission('recruitment', 'view');
    const [deptRes, jobPostsRes, applicationsRes] = await Promise.all([
      getDepartmentOptions(),
      getJobPostSelectOptions(),
      getInterviewableApplicationOptions()
    ]);

    const departments = deptRes.success ? (deptRes.data ?? []) : [];

    return {
      isError: false,
      data: {
        departments: departments.map((d) => ({ id: d.name, name: d.name })),
        jobPosts: jobPostsRes.success ? (jobPostsRes.data ?? []) : [],
        applications: applicationsRes.success
          ? (applicationsRes.data ?? [])
          : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getInterviewFormOptionsAction error:', error);
    return {
      isError: true,
      data: {
        departments: [],
        jobPosts: [],
        applications: []
      },
      errors: {
        message: error.message ?? 'Unable to load form options.'
      }
    };
  }
}

export async function createInterviewAction(data: InterviewPayload) {
  await requirePermission('recruitment', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createInterview(data, auditUser);

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
        action: 'recruitment.interview.created',
        entityType: 'Interview',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(INTERVIEW_PATH);
    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(SHORTLISTING_PATH);
    revalidatePath(EVALUATION_PATH);
    return {
      isError: false,
      data: {
        saved: true,
        id: result.data?.id as string | undefined,
        interviewCode: result.data?.interviewCode
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('createInterviewAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function rescheduleInterviewAction(
  id: string,
  data: RescheduleInterviewPayload
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await rescheduleInterview(id, data, auditUser);

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
        action: 'recruitment.interview.rescheduled',
        entityType: 'Interview',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(INTERVIEW_PATH);
    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(SHORTLISTING_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('rescheduleInterviewAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function cancelInterviewAction(id: string, reason?: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await cancelInterview(id, reason, auditUser);

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
        action: 'recruitment.interview.cancelled',
        entityType: 'Interview',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(INTERVIEW_PATH);
    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(SHORTLISTING_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('cancelInterviewAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function confirmInterviewAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await confirmInterview(id, auditUser);

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
        action: 'recruitment.interview.confirmed',
        entityType: 'Interview',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath(INTERVIEW_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('confirmInterviewAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
