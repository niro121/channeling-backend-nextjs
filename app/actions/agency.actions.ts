'use server';

import {
  getAllAgenciesService,
  getAgencyByIdService,
  createAgencyService,
  updateAgencyService,
  deleteAgencyByIdService,
  bulkDeleteAgenciesService,
  getAllAgenciesOptionsService,
  getAllAgenciesExportService,
  getNextAgencyCode
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

// ==== GET ALL AGENCIES ==== //
export const getAllAgencies = async (params: GetAgenciesParams) => {
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

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllAgencies error', error);
    return {
      success: false,
      message: error.message || 'Error getting agencies',
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
export const getAgencyById = async (id: string) => {
  try {
    const response = await getAgencyByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getAgencyById error', error);
    return {
      success: false,
      message: error.message || 'Error getting agency',
      data: null
    };
  }
};

// ==== CREATE AGENCY ==== //
export const createAgency = async (
  payload: AgencyFormValues,
  user?: { id?: string; name?: string }
) => {
  try {
    // Get next agency code
    const nextCode = await getNextAgencyCode();
    const agencyCode = String(nextCode);

    const data: Prisma.AgencyCreateInput = {
      name: payload.name,
      code: agencyCode,
      chequePrintingName: payload.chequePrintingName,
      creditLimit: payload.creditLimit || 0,
      allowedCreditLimit: payload.allowedCreditLimit || 0,
      maxCreditLimit: payload.maxCreditLimit || 0,
      phone: payload.phone || null,
      mobile: payload.mobile || null,
      fax: payload.fax || null,
      email: payload.email || null,
      website: payload.website || null,
      memo: payload.memo || null,
      addressLine1: payload.addressLine1 || null,
      addressLine2: payload.addressLine2 || null,
      city: payload.city || null,
      contactPersonName: payload.contactPersonName,
      contactPersonPhone: payload.contactPersonPhone || null,
      contactPersonMobile: payload.contactPersonMobile || null,
      contactPersonEmail: payload.contactPersonEmail || null,
      sendSms: payload.sendSms ?? 0,
      status: payload.status ?? 1,
      ...(payload.parentAgencyId
        ? { parentAgency: { connect: { id: payload.parentAgencyId } } }
        : {}),
      ...(payload.locationId
        ? { location: { connect: { id: payload.locationId } } }
        : {})
    };

    const result = await createAgencyService(data);

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
        await updateAgencyService(result.id!, {
          user: {
            connect: {
              email: payload.loginEmail
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

    revalidatePath('/agencies');

    return {
      success: true,
      data: result,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('createAgency error', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Failed to create agency'
      }
    };
  }
};

// ==== UPDATE AGENCY ==== //
export const updateAgency = async (
  id: string,
  payload: UpdateAgencyPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const data: Prisma.AgencyUpdateInput = {
      updatedAt: new Date()
    };

    if (payload.name !== undefined) data.name = payload.name;
    if (payload.chequePrintingName !== undefined)
      data.chequePrintingName = payload.chequePrintingName;
    if (payload.creditLimit !== undefined) data.creditLimit = payload.creditLimit;
    if (payload.allowedCreditLimit !== undefined)
      data.allowedCreditLimit = payload.allowedCreditLimit;
    if (payload.maxCreditLimit !== undefined)
      data.maxCreditLimit = payload.maxCreditLimit;
    if (payload.phone !== undefined) data.phone = payload.phone || null;
    if (payload.mobile !== undefined) data.mobile = payload.mobile || null;
    if (payload.fax !== undefined) data.fax = payload.fax || null;
    if (payload.email !== undefined) data.email = payload.email || null;
    if (payload.website !== undefined) data.website = payload.website || null;
    if (payload.memo !== undefined) data.memo = payload.memo || null;
    if (payload.addressLine1 !== undefined)
      data.addressLine1 = payload.addressLine1 || null;
    if (payload.addressLine2 !== undefined)
      data.addressLine2 = payload.addressLine2 || null;
    if (payload.city !== undefined) data.city = payload.city || null;
    if (payload.contactPersonName !== undefined)
      data.contactPersonName = payload.contactPersonName;
    if (payload.contactPersonPhone !== undefined)
      data.contactPersonPhone = payload.contactPersonPhone || null;
    if (payload.contactPersonMobile !== undefined)
      data.contactPersonMobile = payload.contactPersonMobile || null;
    if (payload.contactPersonEmail !== undefined)
      data.contactPersonEmail = payload.contactPersonEmail || null;
    if (payload.sendSms !== undefined) data.sendSms = payload.sendSms;
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.parentAgencyId !== undefined) {
      if (payload.parentAgencyId) {
        data.parentAgency = { connect: { id: payload.parentAgencyId } };
      } else {
        data.parentAgency = { disconnect: true };
      }
    }
    if (payload.locationId !== undefined) {
      if (payload.locationId) {
        data.location = { connect: { id: payload.locationId } };
      } else {
        data.location = { disconnect: true };
      }
    }

    const result = await updateAgencyService(id, data);

    revalidatePath('/agencies');

    return {
      success: true,
      data: result,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('updateAgency error', error);

    return {
      success: false,
      isError: true,
      data: null,
      errors: {
        message: error.message || 'Failed to update agency'
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

      await updateAgencyService(agencyId, updateData);
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
  try {
    await deleteAgencyByIdService(id);

    revalidatePath('/agencies');

    return {
      success: true,
      isError: false,
      errors: {}
    };
  } catch (error: any) {
    console.error('deleteAgency error', error);
    return {
      success: false,
      isError: true,
      errors: {
        message: error.message || 'Failed to delete agency'
      }
    };
  }
};

// ==== BULK DELETE AGENCIES ==== //
export const bulkDeleteAgencies = async (ids: string[]) => {
  try {
    await bulkDeleteAgenciesService(ids);

    revalidatePath('/agencies');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteAgencies error', error);
    return false;
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
