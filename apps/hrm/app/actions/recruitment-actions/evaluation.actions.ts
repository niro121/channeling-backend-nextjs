'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  getEvaluationById,
  getEvaluations,
  getEvaluationsForExport,
  getOrCreateEvaluationForInterview,
  saveEvaluationDraft,
  submitEvaluation
} from '@/services/recruitment-services/evaluation.service';
import type {
  EvaluationPayload,
  GetEvaluationsParams
} from '@/types/recruitment';

const EVALUATION_PATH = '/evaluation';
const INTERVIEW_PATH = '/interview-schedule';
const APPOINTMENT_PATH = '/appointment-letters';
const APPLICATIONS_PATH = '/applications';

export async function getEvaluationsAction(params: GetEvaluationsParams) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getEvaluations({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      status: params.status,
      search: params.search,
      interviewType: params.interviewType,
      decision: params.decision
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
    console.error('getEvaluationsAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getEvaluationsExport(
  params: Omit<GetEvaluationsParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getEvaluationsForExport(params);
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
        message: 'No evaluations found',
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
    console.error('getEvaluationsExport error', error);
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

export async function getEvaluationByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getEvaluationById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Evaluation not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getEvaluationByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch evaluation.' }
    };
  }
}

export async function getOrCreateEvaluationForInterviewAction(
  interviewId: string
) {
  try {
    await requirePermission('recruitment', 'view');
    const auditUser = await getAuditUser();
    const result = await getOrCreateEvaluationForInterview(
      interviewId,
      auditUser
    );
    if (!result.success || !result.data) {
      throw new Error(
        result.error?.message ?? 'Unable to load evaluation for interview'
      );
    }

    if (result.created && auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'recruitment.evaluation.created',
        entityType: 'Evaluation',
        entityId: result.data.id,
        importance: 'medium'
      });
      revalidatePath(EVALUATION_PATH);
    }

    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getOrCreateEvaluationForInterviewAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to load evaluation for interview.'
      }
    };
  }
}

export async function saveEvaluationDraftAction(
  id: string,
  data: EvaluationPayload
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await saveEvaluationDraft(id, data, auditUser);

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
        action: 'recruitment.evaluation.draft_saved',
        entityType: 'Evaluation',
        entityId: result.data?.id,
        importance: 'low'
      });
    }

    revalidatePath(EVALUATION_PATH);
    return {
      isError: false,
      data: { saved: true, record: result.data },
      errors: {}
    };
  } catch (error: any) {
    console.error('saveEvaluationDraftAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function submitEvaluationAction(
  id: string,
  data: EvaluationPayload
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await submitEvaluation(id, data, auditUser);

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
        action: 'recruitment.evaluation.submitted',
        entityType: 'Evaluation',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(EVALUATION_PATH);
    revalidatePath(INTERVIEW_PATH);
    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(APPOINTMENT_PATH);
    return {
      isError: false,
      data: { saved: true, record: result.data },
      errors: {}
    };
  } catch (error: any) {
    console.error('submitEvaluationAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
