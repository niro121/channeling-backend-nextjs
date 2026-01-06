'use server';

import { authOptions } from '@/lib/auth';
import { generateCode } from '@/lib/utils';
import {
  checkUniqueSpecialityCode,
  createSpecialityService,
  getAllSpecialitiesService,
  updateOneSpecialityService,
  getSpecialityByIdService,
  deleteSpecialityByIdService,
  bulkDeleteSpecialitiesByIdsService
} from '@/services/speciality.service';
import {
  getSpecialityParams,
  getSpecialityQuery,
  Speciality
} from '@/types/speciality';
import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

type CreateSpecialityPayload = Pick<
  Speciality,
  'id' | 'name' | 'description' | 'status'
>;

// ==== GET ALL SPECIALIIES ==== //
export const getAllSpecialities = async (sort: getSpecialityParams) => {
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

    return {
      success: true,
      data: response.data as Speciality[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllSpecialities error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE SPECIALITY ==== //
export const getSpecialityById = async (id: string) => {
  try {
    const response = await getSpecialityByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getSpecialityById error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: null
    };
  }
};

// ==== CREATE A SPECIALITY ==== //
export const createSpeciality = async (payload: CreateSpecialityPayload) => {
  // console.log('createSpeciality payload', payload);
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    const getUniqueSpecialityCode = async (): Promise<string> => {
      while (true) {
        const genCode = generateCode();
        const isUnique = await checkUniqueSpecialityCode(genCode);

        if (isUnique) return genCode;
      }
    };

    delete payload.id;
    const specialityCode = await getUniqueSpecialityCode();

    const result = await createSpecialityService({
      ...payload,
      code: specialityCode,
      createdBy: userId,
      updatedBy: userId
    });

    revalidatePath('/specialities');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createSpeciality error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create speciality'
      }
    };
  }
};

// ==== UPDATE A SPECIALITY ==== //
export const updateOneSpeciality = async (
  id: string,
  payload: Partial<CreateSpecialityPayload>
) => {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    delete payload.id;

    const result = await updateOneSpecialityService(id, {
      ...payload,
      updatedBy: userId,
      updatedAt: new Date()
    });

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('updateSpeciality error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update speciality'
      }
    };
  }
};

// ==== DELETE A SPECIALITY ==== //
export const deleteSpeciality = async (id: string) => {
  try {
    const result = await deleteSpecialityByIdService(id);

    revalidatePath('/specialities');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('deleteSpeciality error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete speciality'
      }
    };
  }
};

// ==== DELETE BULK SPECIALITIES ==== //
export const bulkDeleteSpecialities = async (ids: string[]) => {
  try {
    const result = await bulkDeleteSpecialitiesByIdsService(ids);

    revalidatePath('/specialities');
    return true
  } catch (error: any) {
    console.error('bulkDeleteSpecialities error', error);
    return false;
  }
};
