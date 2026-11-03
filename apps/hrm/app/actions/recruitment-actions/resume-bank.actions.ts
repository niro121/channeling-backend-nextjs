'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import {
  createResumeBankProfile,
  getPublishedJobPostOptions,
  getResumeBankProfileById,
  getResumeBankProfiles,
  getResumeBankProfilesForExport,
  getResumeBankSummary,
  markResumeBankShortlisted,
  updateResumeBankProfile
} from '@/services/recruitment-services/resume-bank.service';
import type {
  GetResumeBankParams,
  ResumeBankPayload
} from '@/types/recruitment';

const RESUME_BANK_PATH = '/resume-bank';

function stripAuditFields<T extends Record<string, unknown>>(data: T): T {
  const payload = { ...data };
  delete (payload as any).id;
  delete (payload as any).createdAt;
  delete (payload as any).updatedAt;
  delete (payload as any).createdBy;
  delete (payload as any).updatedBy;
  delete (payload as any).createdUser;
  delete (payload as any).updatedUser;
  delete (payload as any).profileId;
  delete (payload as any).linkedApplicationIds;
  delete (payload as any).dateAdded;
  return payload;
}

export async function getResumeBankProfilesAction(params: GetResumeBankParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getResumeBankProfiles({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      skills: params.skills,
      qualification: params.qualification,
      location: params.location,
      candidateName: params.candidateName,
      experience: params.experience,
      designation: params.designation,
      department: params.department,
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
    console.error('getResumeBankProfilesAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getResumeBankSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getResumeBankSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getResumeBankSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getResumeBankExport(
  params: Omit<GetResumeBankParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getResumeBankProfilesForExport(params);
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
    console.error('getResumeBankExport error', error);
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

export async function getResumeBankProfileByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getResumeBankProfileById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Profile not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getResumeBankProfileByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch profile.' }
    };
  }
}

export async function getResumeBankFormOptionsAction() {
  try {
    await requirePermission('recruitment', 'view');
    const [deptRes, desigRes, jobPostsRes] = await Promise.all([
      getDepartmentOptions(),
      getDesignationOptions(),
      getPublishedJobPostOptions()
    ]);

    const departments = deptRes.success ? (deptRes.data ?? []) : [];
    const designations = desigRes.success ? (desigRes.data ?? []) : [];

    return {
      isError: false,
      data: {
        departments: departments.map((d) => ({ id: d.name, name: d.name })),
        designations: designations.map((d) => ({ id: d.name, name: d.name })),
        publishedJobPosts: jobPostsRes.success ? (jobPostsRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getResumeBankFormOptionsAction error:', error);
    return {
      isError: true,
      data: {
        departments: [],
        designations: [],
        publishedJobPosts: []
      },
      errors: {
        message: error.message ?? 'Unable to load form options.'
      }
    };
  }
}

export async function createResumeBankProfileAction(data: ResumeBankPayload) {
  await requirePermission('recruitment', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as ResumeBankPayload;
    const auditUser = await getAuditUser();
    const result = await createResumeBankProfile(payload, auditUser);

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
        action: 'recruitment.resumeBank.created',
        entityType: 'ResumeBankProfile',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(RESUME_BANK_PATH);
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createResumeBankProfileAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateResumeBankProfileAction(
  id: string,
  data: ResumeBankPayload
) {
  await requirePermission('recruitment', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as ResumeBankPayload;
    const auditUser = await getAuditUser();
    const result = await updateResumeBankProfile(id, payload, auditUser);

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
        action: 'recruitment.resumeBank.updated',
        entityType: 'ResumeBankProfile',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(RESUME_BANK_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateResumeBankProfileAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function markResumeBankShortlistedAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await markResumeBankShortlisted(id, auditUser);

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
        action: 'recruitment.resumeBank.shortlisted',
        entityType: 'ResumeBankProfile',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(RESUME_BANK_PATH);
    revalidatePath('/shortlisting');
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('markResumeBankShortlistedAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
