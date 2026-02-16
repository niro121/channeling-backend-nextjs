'use server';

import {
  createSpecialityService,
  getAllSpecialitiesService,
  updateOneSpecialityService,
  getSpecialityByIdService,
  deleteSpecialityByIdService,
  bulkDeleteSpecialitiesByIdsService,
  lastSpecialityCode
} from '@/services/speciality.service';
import {
  getSpecialityParams,
  getSpecialityQuery,
  Speciality,
  SpecialityFormValues,
  UpdateSpecialityPayload
} from '@/types/speciality';
import { revalidatePath } from 'next/cache';
import { padCode } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { requirePermission } from '@/lib/server-permissions';
import prisma from '@/lib/prisma';

type CreateSpecialityPayload = SpecialityFormValues & {
  createdBy?: string;
  updatedBy?: string;
}

const PREFIX = 'RHC';
const MAX_CODE = Number(process.env.MAX_CODE) || 1000;

// ==== GET ALL SPECIALIIES ==== //
export const getAllSpecialities = async (sort: getSpecialityParams) => {
  // View permission already checked by checkRouteAccess('/specialities') on the page; skip duplicate session fetch

  try {
    let newFilter: getSpecialityQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? ''
    };

    const response = await getAllSpecialitiesService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch specialities',
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
    console.error('getAllSpecialities action error:', error);

    return {
      success: false,
      message: error.message || 'Error getting specialities. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE SPECIALITY ==== //
export const getSpecialityById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getSpecialityByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch speciality'
        }
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('getSpecialityById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== CREATE A SPECIALITY ==== //
export const getNextSpecialityCode = async (): Promise<string> => {
  const lastSpeciality = await lastSpecialityCode();

  let nextNumber = 1;

  if (lastSpeciality?.code) {
    const match = lastSpeciality.code.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0]) + 1;
    }
  }

  if (nextNumber > MAX_CODE) {
    throw new Error('Maximum speciality code limit reached');
  }

  let candidateCode = `${PREFIX}${padCode(nextNumber, 4)}`; // == FORMAT: RHC0001 == //
  
  // Check if code already exists and find next available
  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop
  
  while (attempts < maxAttempts) {
    const existing = await prisma.speciality.findUnique({
      where: { code: candidateCode },
      select: { code: true }
    });
    
    if (!existing) {
      return candidateCode; // Code is available
    }
    
    // Code exists, try next number
    nextNumber++;
    if (nextNumber > MAX_CODE) {
      throw new Error('Maximum speciality code limit reached');
    }
    candidateCode = `${PREFIX}${padCode(nextNumber, 4)}`;
    attempts++;
  }
  
  throw new Error('Unable to generate unique speciality code after multiple attempts');
};

export const createSpeciality = async (
  payload: CreateSpecialityPayload,
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
  await requirePermission('specialities', 'add');

  try {
    let specialityCode = await getNextSpecialityCode();
    let result: {
      success: boolean;
      data?: any;
      message?: string;
      error?: {
        message?: string;
        issues?: any;
      };
    } | undefined;
    let retries = 0;
    const maxRetries = 3;

    // Retry logic in case of race condition
    while (retries < maxRetries) {
      result = await createSpecialityService(
        {
          name: payload.name,
          description: payload.description,
          status: payload.status,
          code: specialityCode
        },
        user
      );

      // If successful, break
      if (result.success) {
        break;
      }

      // If duplicate code error, generate a new code and retry
      const isDuplicateCodeError = 
        result.error?.message?.includes('code') && 
        result.error?.message?.includes('already exists');
      
      if (isDuplicateCodeError && retries < maxRetries - 1) {
        retries++;
        specialityCode = await getNextSpecialityCode();
      } else {
        // Not a duplicate code error or max retries reached, break
        break;
      }
    }

    if (!result || !result.success) {
      return {
        success: false,
        error: result?.error || {
          message: result?.message || 'Speciality creation failed'
        }
      };
    }

    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Speciality created successfully'
    };
  } catch (error: any) {
    console.error('createSpeciality action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE A SPECIALITY ==== //
export const updateOneSpeciality = async (
  id: string,
  payload: UpdateSpecialityPayload,
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
  await requirePermission('specialities', 'edit');

  try {
    const result = await updateOneSpecialityService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Speciality update failed'
        }
      };
    }

    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Speciality updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneSpeciality action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE A SPECIALITY ==== //
export const deleteSpeciality = async (id: string) => {
  // Check delete permission
  await requirePermission('specialities', 'delete');

  try {
    const result = await deleteSpecialityByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }

    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    console.error('deleteSpeciality action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE BULK SPECIALITIES ==== //
export const bulkDeleteSpecialities = async (ids: string[]) => {
  // Check delete permission
  await requirePermission('specialities', 'delete');

  try {
    const result = await bulkDeleteSpecialitiesByIdsService(ids);

    if (!result.success) {
      return false;
    }

    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteSpecialities action error:', error);

    return false;
  }
};
