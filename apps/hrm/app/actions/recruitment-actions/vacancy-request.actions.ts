'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import {
  approveVacancyRequest,
  createVacancyRequest,
  getVacancyRequestById,
  getVacancyRequestSummary,
  getVacancyRequests,
  getVacancyRequestsForExport,
  rejectVacancyRequest,
  updateVacancyRequest
} from '@/services/recruitment-services/vacancy-request.service';
import type {
  GetVacancyRequestsParams,
  VacancyRequestPayload
} from '@/types/recruitment';

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
  delete (payload as any).requestId;
  return payload;
}

export async function getVacancyRequestsAction(params: GetVacancyRequestsParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getVacancyRequests({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      requestId: params.requestId,
      department: params.department,
      designation: params.designation,
      employmentType: params.employmentType,
      requestedBy: params.requestedBy,
      requestDate: params.requestDate,
      requiredDate: params.requiredDate,
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
    console.error('getVacancyRequestsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getVacancyRequestSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getVacancyRequestSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getVacancyRequestSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getVacancyRequestsExport(
  params: Omit<GetVacancyRequestsParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getVacancyRequestsForExport({
      requestId: params.requestId,
      department: params.department,
      designation: params.designation,
      employmentType: params.employmentType,
      requestedBy: params.requestedBy,
      requestDate: params.requestDate,
      requiredDate: params.requiredDate,
      status: params.status,
      search: params.search
    });

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
        message: 'No vacancy requests found',
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
    console.error('getVacancyRequestsExport error', error);
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

export async function getVacancyRequestByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getVacancyRequestById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Vacancy request not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getVacancyRequestByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch vacancy request.' }
    };
  }
}

export async function getVacancyRequestFormOptionsAction() {
  try {
    await requirePermission('recruitment', 'view');
    const [deptRes, desigRes] = await Promise.all([
      getDepartmentOptions(),
      getDesignationOptions()
    ]);

    return {
      isError: false,
      data: {
        departments: deptRes.success ? (deptRes.data ?? []) : [],
        designations: desigRes.success ? (desigRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getVacancyRequestFormOptionsAction error:', error);
    return {
      isError: true,
      data: { departments: [], designations: [] },
      errors: {
        message: error.message ?? 'Unable to load form options.'
      }
    };
  }
}

export async function createVacancyRequestAction(data: VacancyRequestPayload) {
  await requirePermission('recruitment', 'add');
  try {
    const payload = stripAuditFields({ ...data }) as VacancyRequestPayload;
    const auditUser = await getAuditUser();
    const result = await createVacancyRequest(payload, auditUser);

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
        action:
          payload.submitIntent === 'submit'
            ? 'recruitment.vacancyRequest.submitted'
            : 'recruitment.vacancyRequest.created',
        entityType: 'VacancyRequest',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(VACANCY_REQUESTS_PATH);
    return {
      isError: false,
      data: { saved: true, id: result.data?.id as string | undefined },
      errors: {}
    };
  } catch (error: any) {
    console.error('createVacancyRequestAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateVacancyRequestAction(
  id: string,
  data: VacancyRequestPayload
) {
  await requirePermission('recruitment', 'edit');
  try {
    const payload = stripAuditFields({ ...data }) as VacancyRequestPayload;
    const auditUser = await getAuditUser();
    const result = await updateVacancyRequest(id, payload, auditUser);

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
        action:
          payload.submitIntent === 'submit'
            ? 'recruitment.vacancyRequest.submitted'
            : 'recruitment.vacancyRequest.updated',
        entityType: 'VacancyRequest',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(VACANCY_REQUESTS_PATH);
    return {
      isError: false,
      data: { saved: true, id },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateVacancyRequestAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function approveVacancyRequestAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await approveVacancyRequest(id, auditUser);

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
        action: 'recruitment.vacancyRequest.approved',
        entityType: 'VacancyRequest',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(VACANCY_REQUESTS_PATH);
    return { isError: false, data: { saved: true, id }, errors: {} };
  } catch (error: any) {
    console.error('approveVacancyRequestAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function rejectVacancyRequestAction(
  id: string,
  reason?: string
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await rejectVacancyRequest(id, reason, auditUser);

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
        action: 'recruitment.vacancyRequest.rejected',
        entityType: 'VacancyRequest',
        entityId: id,
        importance: 'high'
      });
    }

    revalidatePath(VACANCY_REQUESTS_PATH);
    return { isError: false, data: { saved: true, id }, errors: {} };
  } catch (error: any) {
    console.error('rejectVacancyRequestAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
