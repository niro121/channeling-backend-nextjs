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
  getAllAgenciesExportService
} from '@/services/agency.service';
import {
  GetAgenciesParams,
  GetAgenciesQuery,
  AgencyFormValues,
  UpdateAgencyPayload,
  Agency
} from '@/types/agency';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { saveUser } from '@/services/user.service';
import { sendAgencyWelcomeSmsService } from '@/services/send-agency-welcome-sms.service';
import prisma from '@/lib/prisma';
import { requirePermission } from '@/lib/server-permissions';
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
      type: 'RECEIVABLE',
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
