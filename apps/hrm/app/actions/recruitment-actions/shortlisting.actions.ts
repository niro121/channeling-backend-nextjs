'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getJobPostSelectOptions } from '@/services/recruitment-services/application.service';
import {
  getShortlisting,
  getShortlistingForExport,
  getShortlistingSummary,
  holdApplication,
  updateScreeningScore
} from '@/services/recruitment-services/shortlisting.service';
import type { GetShortlistingParams } from '@/types/recruitment';

const APPLICATIONS_PATH = '/applications';
const SHORTLISTING_PATH = '/shortlisting';
const RESUME_BANK_PATH = '/resume-bank';

export async function getShortlistingAction(params: GetShortlistingParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getShortlisting({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      jobPostId: params.jobPostId,
      department: params.department,
      designation: params.designation,
      candidateName: params.candidateName,
      applicationDate: params.applicationDate,
      experience: params.experience,
      status: params.status,
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
    console.error('getShortlistingAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getShortlistingSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getShortlistingSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getShortlistingSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getShortlistingExport(
  params: Omit<GetShortlistingParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getShortlistingForExport(params);
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
        message: 'No candidates found',
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
    console.error('getShortlistingExport error', error);
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

export async function getShortlistingFormOptionsAction() {
  try {
    await requirePermission('recruitment', 'view');
    const [deptRes, desigRes, jobPostsRes] = await Promise.all([
      getDepartmentOptions(),
      getDesignationOptions(),
      getJobPostSelectOptions()
    ]);

    const departments = deptRes.success ? (deptRes.data ?? []) : [];
    const designations = desigRes.success ? (desigRes.data ?? []) : [];

    return {
      isError: false,
      data: {
        departments: departments.map((d) => ({ id: d.name, name: d.name })),
        designations: designations.map((d) => ({
          id: d.name,
          name: d.name
        })),
        jobPosts: jobPostsRes.success ? (jobPostsRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getShortlistingFormOptionsAction error:', error);
    return {
      isError: true,
      data: {
        departments: [],
        designations: [],
        jobPosts: []
      },
      errors: {
        message: error.message ?? 'Unable to load form options.'
      }
    };
  }
}

export async function holdApplicationAction(id: string, reason?: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await holdApplication(id, reason, auditUser);

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
        action: 'recruitment.application.held',
        entityType: 'Application',
        entityId: id,
        importance: 'medium'
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
    console.error('holdApplicationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateScreeningScoreAction(
  id: string,
  screeningScore: number
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateScreeningScore(id, screeningScore, auditUser);

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
        action: 'recruitment.application.screening_score_updated',
        entityType: 'Application',
        entityId: id,
        importance: 'medium'
      });
    }

    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(SHORTLISTING_PATH);
    revalidatePath(RESUME_BANK_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateScreeningScoreAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
