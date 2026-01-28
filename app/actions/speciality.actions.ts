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

type CreateSpecialityPayload = SpecialityFormValues & {
  createdBy?: string;
  updatedBy?: string;
}

const PREFIX = 'RHC';
const MAX_CODE = Number(process.env.MAX_CODE) || 1000;

// ==== GET ALL SPECIALIIES ==== //
export const getAllSpecialities = async (sort: getSpecialityParams) => {
  // Check view permission
  await requirePermission('specialities', 'view');

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

  return `${PREFIX}${padCode(nextNumber, 4)}`; // == FORMAT: RHC0001 == //
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
    const specialityCode = await getNextSpecialityCode();

    const result = await createSpecialityService(
      {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        code: specialityCode
      },
      user
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Speciality creation failed'
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
