'use server';

import {
  bulkDeleteDoctorsByIdsService,
  createDoctorService,
  deleteDoctorByIdService,
  getAllDoctorsService,
  getDoctorByIdService,
  updateOneDoctorService,
  getAllDoctorsDownloadService,
  getAllSpecialityOptionsService,
  checkDoctorsHaveActiveSessionsOrLeavesService,
  checkDoctorHasActiveSessionsOrLeavesService
} from '@/services/doctor.service';
import {
  getDoctorParams,
  getDoctorQuery,
  ExportDoctorParams,
  ExportDoctorsPdfResponse,
  CreateDoctorPayload,
  UpdateDoctorPayload,
  Doctor
} from '@/types/doctor';
import { revalidatePath } from 'next/cache';
import { Speciality } from '@/types/speciality';
import { requirePermission } from '@/lib/server-permissions';
import { getOrCreateAccount } from '@/services/accounting/account.service';
import prisma from '@/lib/prisma';

// ==== CREATE DOCTOR ==== //
export const createDoctor = async (
  payload: CreateDoctorPayload,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  // Check add permission
  await requirePermission('doctors', 'add');

  try {
    const result = await createDoctorService(payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Doctor creation failed'
        }
      };
    }

    revalidatePath('/doctors');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Doctor created successfully'
    };
  } catch (error: any) {
    console.error('createDoctor action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE DOCTOR ==== //
export const updateOneDoctor = async (
  id: string,
  payload: UpdateDoctorPayload,
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: {
    message?: string;
    issues?: any;
  };
}> => {
  // Check edit permission
  await requirePermission('doctors', 'edit');

  try {
    const result = await updateOneDoctorService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Doctor update failed'
        }
      };
    }

    revalidatePath('/doctors');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Doctor updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneDoctor action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE DOCTOR ==== //
export const deleteDoctor = async (id: string) => {
  // Check delete permission
  await requirePermission('doctors', 'delete');

  try {
    const result = await deleteDoctorByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    revalidatePath('/doctors');

    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    console.error('deleteDoctor action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE BULK DOCTORS ==== //
export const bulkDeleteDoctors = async (ids: string[]) => {
  // Check delete permission
  await requirePermission('doctors', 'delete');

  try {
    const result = await bulkDeleteDoctorsByIdsService(ids);

    if (!result.success) {
      return false;
    }

    revalidatePath('/doctors');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteDoctors action error:', error);

    return false;
  }
};

// ==== GET DOCTORS ==== //
export const getAllDoctors = async (sort: getDoctorParams) => {
  // Check view permission
  await requirePermission('doctors', 'view');

  try {
    const validSpecialityId =
      sort.specialityId && /^[a-fA-F0-9]{24}$/.test(sort.specialityId)
        ? sort.specialityId
        : undefined;

    const newFilter: getDoctorQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      specialityId: validSpecialityId
    };

    const response = await getAllDoctorsService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch doctors',
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
    console.error('getAllDoctors action error:', error);

    return {
      success: false,
      message: error.message || 'Error getting doctors. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE DOCTOR ==== //
export const getDoctorById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getDoctorByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch doctor'
        }
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('getDoctorById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== CREATE GL ACCOUNT FOR DOCTOR (when missing on edit) ==== //
export async function createDoctorAccount(doctorId: string) {
  await requirePermission('accounting', 'edit');
  try {
    const doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { id: true, name: true, code: true },
    });
    if (!doctor) {
      return { success: false, message: 'Doctor not found' };
    }
    const result = await getOrCreateAccount({
      type: 'PAYABLE',
      doctorId: doctor.id,
      name: `Doctor Payable - ${doctor.name}`,
      code: doctor.code ? `DOC-${doctor.code}` : null,
    });
    if (!result.success) {
      return { success: false, message: result.error ?? 'Failed to create GL account' };
    }
    revalidatePath('/doctors');
    revalidatePath(`/doctors/${doctorId}/edit`);
    return { success: true, message: 'GL account created', accountId: result.account.id };
  } catch (e: unknown) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to create GL account',
    };
  }
}

// ==== GET SPECIALITY OPTIONS ==== //
export const getAllSpecialityOptions = async () => {
  try {
    const response = await getAllSpecialityOptionsService();

    return {
      success: true,
      data: response.data as Speciality[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getAllSpecialityOptions error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get specialities'
      }
    };
  }
};

// ==== DOCTOR LIST DOWLOAD ==== //
export const getDoctorsExport = async (
  filters: ExportDoctorParams
): Promise<ExportDoctorsPdfResponse> => {
  try {
    const response = await getAllDoctorsDownloadService({
      keyword: filters.keyword ?? '',
      specialityId: filters.specialityId
    });

    if (!response.doctors?.length) {
      return {
        success: false,
        message: 'No available doctors in the database'
      };
    }

    // Transform doctors to match Doctor type: convert null speciality to undefined
    const transformedDoctors: Doctor[] = response.doctors.map(doctor => ({
      ...doctor,
      speciality: doctor.speciality ?? undefined
    }));

    return {
      success: true,
      data: transformedDoctors,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getDoctorsExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};

// ==== CHECK SINGLE DOCTOR HAS ACTIVE SESSIONS OR APPROVED LEAVES ==== //
export const checkDoctorHasActiveSessionsOrLeaves = async (
  doctorId: string
): Promise<{
  success: boolean;
  data?: {
    hasActiveSessions: boolean;
    hasApprovedLeaves: boolean;
  };
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await checkDoctorHasActiveSessionsOrLeavesService(doctorId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || 'Failed to check doctor sessions and leaves'
      };
    }

    return {
      success: true,
      data: result.data,
      message: 'Check completed successfully'
    };
  } catch (error: any) {
    console.error('checkDoctorHasActiveSessionsOrLeaves action error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Error checking doctor sessions and leaves'
      }
    };
  }
};

// ==== CHECK DOCTORS HAVE ACTIVE SESSIONS OR APPROVED LEAVES ==== //
export const checkDoctorsHaveActiveSessionsOrLeaves = async (
  doctorIds: string[]
): Promise<{
  success: boolean;
  data?: {
    hasActiveSessions: boolean;
    hasApprovedLeaves: boolean;
  };
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await checkDoctorsHaveActiveSessionsOrLeavesService(doctorIds);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || 'Failed to check doctor sessions and leaves'
      };
    }

    return {
      success: true,
      data: result.data,
      message: 'Check completed successfully'
    };
  } catch (error: any) {
    console.error('checkDoctorsHaveActiveSessionsOrLeaves action error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Error checking doctor sessions and leaves'
      }
    };
  }
};
