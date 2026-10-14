'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  acceptAppointmentLetter,
  createAppointmentLetter,
  declineAppointmentLetter,
  generateAppointmentLetter,
  getAppointmentLetterById,
  getAppointmentLetterSummary,
  getAppointmentLetters,
  getAppointmentLettersForExport,
  getEligibleEvaluationOptions,
  sendAppointmentLetter,
  updateAppointmentLetter
} from '@/services/recruitment-services/appointment-letter.service';
import type {
  AppointmentLetterPayload,
  AppointmentLetterUpdatePayload,
  GetAppointmentLettersParams
} from '@/types/recruitment';

const LETTERS_PATH = '/appointment-letters';
const EVALUATION_PATH = '/evaluation';
const APPLICATIONS_PATH = '/applications';
const STAFF_PATH = '/staff';

export async function getAppointmentLettersAction(
  params: GetAppointmentLettersParams
) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getAppointmentLetters({
      page: params.page ?? process.env.DEFAULT_PAGE ?? '0',
      limit: params.limit ?? process.env.DEFAULT_PER_PAGE ?? '10',
      letterNumber: params.letterNumber,
      candidateName: params.candidateName,
      position: params.position,
      department: params.department,
      letterDate: params.letterDate,
      status: params.status,
      search: params.search,
      evaluationId: params.evaluationId
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
    console.error('getAppointmentLettersAction error', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Error getting data. Please try again later'
      }
    };
  }
}

export async function getAppointmentLetterSummaryAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getAppointmentLetterSummary();
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Unable to fetch summary');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAppointmentLetterSummaryAction error', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch summary' }
    };
  }
}

export async function getAppointmentLettersExport(
  params: Omit<GetAppointmentLettersParams, 'page' | 'limit'>
) {
  await requirePermission('recruitment', 'view');

  try {
    const response = await getAppointmentLettersForExport(params);
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
        message: 'No appointment letters found',
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
    console.error('getAppointmentLettersExport error', error);
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

export async function getAppointmentLetterByIdAction(id: string) {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getAppointmentLetterById(id);
    if (!result.success || !result.data) {
      throw new Error(result.error?.message ?? 'Appointment letter not found');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getAppointmentLetterByIdAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to fetch appointment letter.' }
    };
  }
}

export async function getAppointmentLetterFormOptionsAction() {
  try {
    await requirePermission('recruitment', 'view');
    const result = await getEligibleEvaluationOptions();
    return {
      isError: false,
      data: {
        evaluations: result.success ? (result.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getAppointmentLetterFormOptionsAction error:', error);
    return {
      isError: true,
      data: { evaluations: [] },
      errors: { message: error.message ?? 'Unable to load form options.' }
    };
  }
}

export async function createAppointmentLetterAction(
  data: AppointmentLetterPayload
) {
  await requirePermission('recruitment', 'add');
  try {
    const auditUser = await getAuditUser();
    const result = await createAppointmentLetter(data, auditUser);

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
        action: 'recruitment.appointment_letter.created',
        entityType: 'AppointmentLetter',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(LETTERS_PATH);
    revalidatePath(EVALUATION_PATH);
    return {
      isError: false,
      data: {
        saved: true,
        id: result.data?.id,
        letterNumber: result.data?.letterNumber,
        record: result.data
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('createAppointmentLetterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function updateAppointmentLetterAction(
  id: string,
  data: AppointmentLetterUpdatePayload
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await updateAppointmentLetter(id, data, auditUser);

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
        action: 'recruitment.appointment_letter.updated',
        entityType: 'AppointmentLetter',
        entityId: result.data?.id,
        importance: 'medium'
      });
    }

    revalidatePath(LETTERS_PATH);
    return {
      isError: false,
      data: {
        saved: true,
        letterNumber: result.data?.letterNumber,
        record: result.data
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('updateAppointmentLetterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function generateAppointmentLetterAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await generateAppointmentLetter(id, auditUser);

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
        action: 'recruitment.appointment_letter.generated',
        entityType: 'AppointmentLetter',
        entityId: result.data?.id,
        importance: 'medium'
      });
    }

    revalidatePath(LETTERS_PATH);
    return {
      isError: false,
      data: { saved: true, record: result.data },
      errors: {}
    };
  } catch (error: any) {
    console.error('generateAppointmentLetterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function sendAppointmentLetterAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await sendAppointmentLetter(id, auditUser);

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
        action: 'recruitment.appointment_letter.sent',
        entityType: 'AppointmentLetter',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(LETTERS_PATH);
    revalidatePath(APPLICATIONS_PATH);
    return {
      isError: false,
      data: {
        saved: true,
        record: result.data,
        emailed: result.emailed,
        smsSent: result.smsSent,
        message: result.message
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('sendAppointmentLetterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function acceptAppointmentLetterAction(id: string) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await acceptAppointmentLetter(id, auditUser);

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
        action: 'recruitment.appointment_letter.accepted',
        entityType: 'AppointmentLetter',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(LETTERS_PATH);
    revalidatePath(APPLICATIONS_PATH);
    revalidatePath(STAFF_PATH);
    return {
      isError: false,
      data: { saved: true, record: result.data },
      errors: {}
    };
  } catch (error: any) {
    console.error('acceptAppointmentLetterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}

export async function declineAppointmentLetterAction(
  id: string,
  reason?: string
) {
  await requirePermission('recruitment', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await declineAppointmentLetter(id, reason, auditUser);

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
        action: 'recruitment.appointment_letter.declined',
        entityType: 'AppointmentLetter',
        entityId: result.data?.id,
        importance: 'high'
      });
    }

    revalidatePath(LETTERS_PATH);
    revalidatePath(APPLICATIONS_PATH);
    return {
      isError: false,
      data: { saved: true, record: result.data },
      errors: {}
    };
  } catch (error: any) {
    console.error('declineAppointmentLetterAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
