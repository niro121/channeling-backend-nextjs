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

type CreateSpecialityPayload = SpecialityFormValues & {
  createdBy?: string;
  updatedBy?: string;
}

const PREFIX = 'RHC';
const MAX_CODE = Number(process.env.MAX_CODE) || 1000;

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
) => {
  try {
    const specialityCode = await getNextSpecialityCode();

    const userRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const result = await createSpecialityService({
      name: payload.name,
      description: payload.description,
      status: payload.status,
      code: specialityCode,
      createdUser: userRelation,
      updatedUser: userRelation
    });

    revalidatePath('/specialities');
    revalidatePath('/doctors');

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
  payload: UpdateSpecialityPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const data: Prisma.SpecialityUpdateInput = {
      updatedAt: new Date(),
      ...(user?.id ? { updatedUser: { connect: { id: user.id } } } : {})
    };

    if (payload.name !== undefined) data.name = payload.name;
    if (payload.name !== undefined) data.description = payload.description;
    if (payload.name !== undefined) data.status = payload.status;

    const result = await updateOneSpecialityService(id, data);

    revalidatePath('/specialities');
    revalidatePath('/doctors');

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
    revalidatePath('/doctors');

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
    revalidatePath('/doctors');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteSpecialities error', error);
    return false;
  }
};
