'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getAllAgenciesService,
  getAgencyByIdService,
  createAgencyService,
  updateAgencyService,
  deleteAgencyByIdService,
  bulkDeleteAgenciesService,
  getAllAgenciesOptionsService,
  getAllAgenciesExportService,
  tryClearAgencyCreditViolationIfEligibleService
} from '@/services/agency.service';
import {
  GetAgenciesParams,
  GetAgenciesQuery,
  AgencyFormValues,
  UpdateAgencyPayload,
  Agency,
  AgencyAllowedCreditLimitHistoryEntry
} from '@/types/agency';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { saveUser } from '@/services/user.service';
import { sendAgencyWelcomeSmsService } from '@/services/send-agency-welcome-sms.service';
import prisma from '@/lib/prisma';
import { checkPermission, requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getOrCreateAccount } from '@/services/accounting/account.service';

// ==== GET ALL AGENCIES ==== //
export const getAllAgencies = async (params: GetAgenciesParams) => {
  // Check view permission
  await requirePermission('agencies', 'view');

  try {
    const query: GetAgenciesQuery = {
      page: params.page ? parseInt(params.page) : 0,
      limit: params.limit
        ? parseInt(params.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: params.keyword ?? '',
      parentAgencyId: params.parentAgencyId
    };

    const response = await getAllAgenciesService(query);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch agencies',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data?.records ?? [],
      totalRecords: response.data?.totalRecords ?? 0,
      message: response.message
    };
  } catch (error: any) {
    console.error('getAllAgencies action error:', error);
    return {
      success: false,
      message: error.message || 'Error getting agencies. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ALL AGENCIES FOR OPTIONS ==== //
export const getAllAgenciesOptions = async () => {
  try {
    const response = await getAllAgenciesOptionsService();

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.log('getAllAgenciesOptions error', error);
    return {
      success: false,
      message: error.message || 'Error getting agency options',
      data: []
    };
  }
};

// ==== GET ONE AGENCY ==== //
export const getAgencyById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  await requirePermission('agencies', 'view');
  try {
    const result = await getAgencyByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch agency'
        }
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('getAgencyById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== CREATE GL ACCOUNT FOR AGENCY (when missing on edit) ==== //
export async function createAgencyAccount(agencyId: string) {
  await requirePermission('accounting', 'edit');
  try {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, name: true },
    });
    if (!agency) {
      return { success: false, message: 'Agency not found' };
    }
    const result = await getOrCreateAccount({
      type: 'PAYABLE',
      agencyId: agency.id,
      name: `Agency - ${agency.name}`,
    });
    if (!result.success) {
      return { success: false, message: result.error ?? 'Failed to create GL account' };
    }
    revalidatePath('/agencies');
    revalidatePath(`/agencies/${agencyId}/edit`);
    return { success: true, message: 'GL account created', accountId: result.account.id };
  } catch (e: unknown) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to create GL account',
    };
  }
}

// ==== CREATE AGENCY ==== //
export const createAgency = async (
  payload: AgencyFormValues,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  isError?: boolean;
  errors?: {
    message?: string;
    issues?: any;
  };
}> => {
  // Check add permission
  await requirePermission('agencies', 'add');

  try {
    const canEditCreditLimit = await checkPermission('agencies', 'edit-credit-limit');
    if (!canEditCreditLimit && Number(payload.creditLimit ?? 0) !== 0) {
      return {
        success: false,
        isError: true,
        errors: {
          message: "Access denied: You don't have permission to edit agency credit limit."
        }
      };
    }

    const result = await createAgencyService(payload, user);

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error || {
          message: result.message || 'Agency creation failed'
        }
      };
    }

    // Handle User creation/linking if login fields are present
    if (payload.loginEmail) {
      try {
        // Try to create the user if full details are provided
        if (payload.fullName && payload.password) {
          const hashedPassword = await argon2.hash(payload.password);
          try {
            await saveUser({
              name: payload.fullName,
              email: payload.loginEmail,
              password: hashedPassword,
              userType: 3, // Agency user type
              status: 1
            });
          } catch (e: any) {
            // If user already exists, we just ignore the creation error and proceed to link
            console.log("User already exists, proceeding to link only.");
          }
        }

        // Always attempt to link the agency to the user by email
        // Use Prisma directly for user linking since it's a separate operation
        await prisma.agency.update({
          where: { id: result.data?.id! },
          data: {
            user: {
              connect: {
                email: payload.loginEmail
              }
            }
          }
        });
      } catch (userError: any) {
        console.error('Error associating user with agency:', userError);
      }
    }

    // ==== SEND SMS IF ENABLED ==== //
    if (payload.sendSms === 1) {
      try {
        await sendAgencyWelcomeSmsService({
          agencyName: payload.name,
          mobile: payload.mobile || '',
          contactPersonMobile: payload.contactPersonMobile || '',
          loginEmail: payload.loginEmail
        });
      } catch (smsError) {
        // We do not fail the agency creation if SMS fails, just log it
        console.error('Failed to send Agency Welcome SMS:', smsError);
      }
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.agency.created',
        entityType: 'Agency',
        entityId: result.data?.id ?? undefined,
        importance: 'high',
        metadata: result.data ? { name: result.data.name, code: result.data.code } : undefined,
      });

      const newAgencyId = result.data?.id;
      const newAllowed = Number(result.data?.allowedCreditLimit ?? 0);
      if (newAgencyId && newAllowed !== 0) {
        logActivityNonBlocking({
          userId: session.user.id,
          action: 'agencies.limit.soft_changed',
          entityType: 'Agency',
          entityId: newAgencyId,
          importance: 'high',
          metadata: {
            agencyName: result.data?.name,
            agencyCode: result.data?.code,
            field: 'allowedCreditLimit',
            oldValue: 0,
            newValue: newAllowed,
            delta: newAllowed,
            source: 'agency_created'
          }
        });
      }
    }
    revalidatePath('/agencies');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Agency created successfully',
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('createAgency action error:', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE AGENCY ==== //
export const updateAgency = async (
  id: string,
  payload: UpdateAgencyPayload,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  isError?: boolean;
  errors?: {
    message?: string;
    issues?: any;
  };
}> => {
  // Check edit permission
  await requirePermission('agencies', 'edit');

  try {
    const canEditCreditLimit = await checkPermission('agencies', 'edit-credit-limit');
    if (
      !canEditCreditLimit &&
      'creditLimit' in payload &&
      payload.creditLimit !== undefined
    ) {
      return {
        success: false,
        isError: true,
        errors: {
          message: "Access denied: You don't have permission to edit agency credit limit."
        }
      };
    }

    const shouldTrackSoftLimitChange =
      'allowedCreditLimit' in payload && payload.allowedCreditLimit !== undefined;
    const beforeSoftLimit = shouldTrackSoftLimitChange
      ? await prisma.agency.findUnique({
          where: { id },
          select: { id: true, name: true, code: true, allowedCreditLimit: true },
        })
      : null;

    const result = await updateAgencyService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error || {
          message: result.message || 'Agency update failed'
        }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.agency.updated',
        entityType: 'Agency',
        entityId: id,
        importance: 'high',
        metadata: result.data ? { name: result.data.name, code: result.data.code } : undefined,
      });

      if (shouldTrackSoftLimitChange && beforeSoftLimit) {
        const oldValue = Number(beforeSoftLimit.allowedCreditLimit ?? 0);
        const newValue = Number(result.data?.allowedCreditLimit ?? oldValue);
        if (Number.isFinite(oldValue) && Number.isFinite(newValue) && oldValue !== newValue) {
          logActivityNonBlocking({
            userId: session.user.id,
            action: 'agencies.limit.soft_changed',
            entityType: 'Agency',
            entityId: id,
            importance: 'high',
            metadata: {
              agencyName: beforeSoftLimit.name,
              agencyCode: beforeSoftLimit.code,
              field: 'allowedCreditLimit',
              oldValue,
              newValue,
              delta: newValue - oldValue,
              source: 'agency_edit'
            },
          });
        }
      }
    }
    revalidatePath('/agencies');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Agency updated successfully',
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('updateAgency action error:', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== CLEAR CREDIT VIOLATION (list / edit; when balance allows) ==== //
export const clearAgencyCreditViolationIfEligible = async (agencyId: string) => {
  await requirePermission('agencies', 'edit');

  try {
    const result = await tryClearAgencyCreditViolationIfEligibleService(agencyId);
    if (!result.success) {
      return {
        success: false,
        isError: true,
        cleared: false as const,
        errors: { message: result.error?.message ?? 'Failed to clear violation' }
      };
    }
    if (!result.cleared) {
      return {
        success: true,
        isError: false,
        cleared: false as const,
        message: result.message
      };
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.credit_violation_cleared_manually',
        entityType: 'Agency',
        entityId: agencyId,
        importance: 'high'
      });

      if (result.softLimitChange) {
        const { oldValue, newValue, agencyName, agencyCode } = result.softLimitChange;
        if (Number.isFinite(oldValue) && Number.isFinite(newValue) && oldValue !== newValue) {
          logActivityNonBlocking({
            userId: session.user.id,
            action: 'agencies.limit.soft_changed',
            entityType: 'Agency',
            entityId: agencyId,
            importance: 'high',
            metadata: {
              agencyName,
              agencyCode,
              field: 'allowedCreditLimit',
              oldValue,
              newValue,
              delta: newValue - oldValue,
              source: 'violation_cleared_manually'
            }
          });
        }
      }
    }

    revalidatePath('/agencies');
    revalidatePath(`/agencies/${agencyId}/edit`);
    revalidatePath('/agencies/allowed-credit-limits');

    return {
      success: true,
      isError: false,
      cleared: true as const,
      message: result.message
    };
  } catch (error: any) {
    console.error('clearAgencyCreditViolationIfEligible error:', error);
    return {
      success: false,
      isError: true,
      cleared: false as const,
      errors: { message: error.message || 'Unexpected error occurred' }
    };
  }
};

// ==== CREATE AGENCY LOGIN ==== //
export const createAgencyLogin = async (
  agencyId: string | null | undefined,
  payload: {
    fullName: string;
    loginEmail: string;
    password?: string;
    locationId?: string;
  }
) => {
  try {
    if (!payload.password) {
      throw new Error('Password is required');
    }

    const hashedPassword = await argon2.hash(payload.password);
    
    // 1. Create User
    await saveUser({
      name: payload.fullName,
      email: payload.loginEmail,
      password: hashedPassword,
      userType: 3, // Agency user type
      status: 1
    });

    // 2. Link Agency to User if agencyId is provided
    if (agencyId) {
      // Use Prisma directly for user/location linking since it's a separate operation
      const updateData: Prisma.AgencyUpdateInput = {
        user: {
          connect: {
            email: payload.loginEmail
          }
        }
      };

      if (payload.locationId) {
        updateData.location = { connect: { id: payload.locationId } };
      }

      await prisma.agency.update({
        where: { id: agencyId },
        data: updateData
      });
    }

    revalidatePath('/agencies');
    revalidatePath(`/agencies/${agencyId}/edit`);

    return {
      success: true,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('createAgencyLogin error', error);
    return {
      success: false,
      isError: true,
      errors: {
        message: error.message || 'Failed to create agency login'
      }
    };
  }
};

// ==== DELETE AGENCY ==== //
export const deleteAgency = async (id: string) => {
  // Check delete permission
  await requirePermission('agencies', 'delete');

  try {
    const result = await deleteAgencyByIdService(id);

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error || {
          message: result.message || 'Failed to delete agency'
        }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.agency.deleted',
        entityType: 'Agency',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/agencies');

    return {
      success: true,
      message: result.message,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteAgency action error:', error);

    return {
      success: false,
      isError: true,
      errors: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== BULK DELETE AGENCIES ==== //
export const bulkDeleteAgencies = async (ids: string[]) => {
  // Check delete permission
  await requirePermission('agencies', 'delete');

  try {
    const result = await bulkDeleteAgenciesService(ids);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete agencies');
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.agencies.bulkDeleted',
        entityType: 'Agency',
        importance: 'high',
        metadata: { count: ids.length },
      });
    }
    revalidatePath('/agencies');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteAgencies action error:', error);
    throw error;
  }
};

// ==== AGENCY ALLOWED CREDIT LIMIT (dedicated page) ==== //

const ALLOWED_CREDIT_HISTORY_TAKE = 100;

const HISTORY_METADATA_CORE_KEYS = new Set([
  'source',
  'oldValue',
  'newValue',
  'delta',
  'field',
  'agencyName',
  'agencyCode',
  'formalAcknowledgementAgencyRequestDepositBelowCreditLimitResponsibility'
]);

function metaNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function resolveAllowedLimitHistorySource(md: Record<string, unknown> | null): string | null {
  if (!md) return null;
  const raw = md.source;
  if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  if (md.formalAcknowledgementAgencyRequestDepositBelowCreditLimitResponsibility === true) {
    return 'agency_allowed_credit_limits_page';
  }
  return null;
}

function buildOtherMetadataJson(md: Record<string, unknown>): string | null {
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(md)) {
    if (!HISTORY_METADATA_CORE_KEYS.has(k)) rest[k] = v;
  }
  if (Object.keys(rest).length === 0) return null;
  try {
    return JSON.stringify(rest);
  } catch {
    return null;
  }
}

export const getAgencyAllowedCreditLimitHistory = async (
  agencyId: string
): Promise<{
  success: boolean;
  data: AgencyAllowedCreditLimitHistoryEntry[];
  message?: string;
}> => {
  await requirePermission('agencies', 'edit-allowed-credit-limit');

  try {
    if (!agencyId?.trim()) {
      return { success: false, data: [], message: 'Agency id is required' };
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        action: 'agencies.limit.soft_changed',
        entityType: 'Agency',
        entityId: agencyId
      },
      orderBy: { createdAt: 'desc' },
      take: ALLOWED_CREDIT_HISTORY_TAKE,
      include: {
        user: { select: { name: true, staff: { select: { code: true } } } }
      }
    });

    const data: AgencyAllowedCreditLimitHistoryEntry[] = logs.map((log) => {
      const md =
        log.metadata != null && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
          ? (log.metadata as Record<string, unknown>)
          : null;
      const oldValue = metaNumber(md?.oldValue);
      const newValue = metaNumber(md?.newValue);
      let delta = metaNumber(md?.delta);
      if (delta == null && oldValue != null && newValue != null) {
        delta = newValue - oldValue;
      }
      const source = typeof md?.source === 'string' && md.source.trim() !== '' ? md.source.trim() : null;
      const sourceResolved = resolveAllowedLimitHistorySource(md);
      const field = typeof md?.field === 'string' ? md.field : null;
      const agencyNameFromMetadata = typeof md?.agencyName === 'string' ? md.agencyName : null;
      const agencyCodeFromMetadata =
        md?.agencyCode === null || md?.agencyCode === undefined
          ? null
          : String(md.agencyCode);
      const formalDeclarationAcknowledged =
        md?.formalAcknowledgementAgencyRequestDepositBelowCreditLimitResponsibility === true;
      const otherMetadataJson = md ? buildOtherMetadataJson(md) : null;
      return {
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        changedByUserId: log.userId,
        changedByUserName: formatUserDisplayName(
          log.user?.name,
          log.userId,
          log.user?.staff?.code
        ),
        oldValue,
        newValue,
        delta,
        source,
        sourceResolved,
        field,
        agencyNameFromMetadata,
        agencyCodeFromMetadata,
        ipAddress: log.ipAddress ?? null,
        formalDeclarationAcknowledged,
        otherMetadataJson
      };
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('getAgencyAllowedCreditLimitHistory error:', error);
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to load history'
    };
  }
};

export const getAgenciesForAllowedCreditLimitControl = async (params: GetAgenciesParams) => {
  await requirePermission('agencies', 'edit-allowed-credit-limit');

  try {
    const query: GetAgenciesQuery = {
      page: params.page ? parseInt(params.page) : 0,
      limit: params.limit
        ? parseInt(params.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: params.keyword ?? '',
      parentAgencyId: params.parentAgencyId
    };

    const response = await getAllAgenciesService(query);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch agencies',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data?.records ?? [],
      totalRecords: response.data?.totalRecords ?? 0,
      message: response.message
    };
  } catch (error: any) {
    console.error('getAgenciesForAllowedCreditLimitControl action error:', error);
    return {
      success: false,
      message: error.message || 'Error getting agencies. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

export const updateAgencyAllowedCreditLimit = async (
  agencyId: string,
  allowedCreditLimit: number,
  acknowledgedRequestAndAgencyNotice: boolean
): Promise<{
  success: boolean;
  message?: string;
  isError?: boolean;
  errors?: { message?: string; issues?: any };
}> => {
  await requirePermission('agencies', 'edit-allowed-credit-limit');

  try {
    if (acknowledgedRequestAndAgencyNotice !== true) {
      return {
        success: false,
        isError: true,
        errors: {
          message:
            'You must confirm the formal declaration: agency request, agency undertaking on deposits below the credit limit, and your acceptance of responsibility.'
        }
      };
    }

    const safe = Number(allowedCreditLimit);
    if (!Number.isFinite(safe) || safe < 0) {
      return {
        success: false,
        isError: true,
        errors: { message: 'Allowed credit limit must be 0 or greater.' }
      };
    }

    const beforeSoftLimit = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { id: true, name: true, code: true, allowedCreditLimit: true }
    });
    if (!beforeSoftLimit) {
      return {
        success: false,
        isError: true,
        errors: { message: 'Agency not found' }
      };
    }

    const linkedPayable = await prisma.account.findFirst({
      where: { agencyId, type: 'PAYABLE', isActive: true },
      select: { minBalanceAllowed: true, maxBalanceAllowed: true }
    });
    const hasHardLimit = linkedPayable?.minBalanceAllowed != null || linkedPayable?.maxBalanceAllowed != null;
    if (!hasHardLimit) {
      return {
        success: false,
        isError: true,
        errors: {
          message:
            'Hard credit limit is not configured for this agency (linked payable account min/max balance). Ask an administrator to configure it before changing the allowed credit limit.'
        }
      };
    }

    const session = await getServerSession(authOptions);
    const result = await updateAgencyService(
      agencyId,
      { allowedCreditLimit: safe },
      session?.user?.id ? { id: session.user.id } : undefined
    );

    if (!result.success) {
      return {
        success: false,
        isError: true,
        errors: result.error || { message: result.message || 'Update failed' }
      };
    }

    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.agency.updated',
        entityType: 'Agency',
        entityId: agencyId,
        importance: 'high',
        metadata: result.data ? { name: result.data.name, code: result.data.code } : undefined
      });

      const oldValue = Number(beforeSoftLimit.allowedCreditLimit ?? 0);
      const newValue = Number(result.data?.allowedCreditLimit ?? oldValue);
      if (Number.isFinite(oldValue) && Number.isFinite(newValue) && oldValue !== newValue) {
        logActivityNonBlocking({
          userId: session.user.id,
          action: 'agencies.limit.soft_changed',
          entityType: 'Agency',
          entityId: agencyId,
          importance: 'high',
          metadata: {
            agencyName: beforeSoftLimit.name,
            agencyCode: beforeSoftLimit.code,
            field: 'allowedCreditLimit',
            oldValue,
            newValue,
            delta: newValue - oldValue,
            source: 'agency_allowed_credit_limits_page',
            formalAcknowledgementAgencyRequestDepositBelowCreditLimitResponsibility: true
          }
        });
      }
    }

    revalidatePath('/agencies');
    revalidatePath('/agencies/allowed-credit-limits');
    revalidatePath(`/agencies/${agencyId}/edit`);

    return {
      success: true,
      message: result.message || 'Allowed credit limit updated',
      isError: false
    };
  } catch (error: any) {
    console.error('updateAgencyAllowedCreditLimit error:', error);
    return {
      success: false,
      isError: true,
      errors: { message: error.message || 'Unexpected error occurred' }
    };
  }
};

// ==== AGENCY LIST EXPORT ==== //
export const getAgenciesExport = async (filters: {
  keyword?: string;
  parentAgencyId?: string;
}) => {
  try {
    const response = await getAllAgenciesExportService({
      keyword: filters.keyword ?? '',
      parentAgencyId: filters.parentAgencyId
    });

    if (!response.data?.length) {
      return {
        success: false,
        message: 'No available agencies in the database'
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'agencies.exported',
        entityType: 'Agency',
        importance: 'medium',
        metadata: { count: response.data?.length ?? 0 },
      });
    }
    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAgenciesExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};
