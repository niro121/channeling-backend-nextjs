'use server';

import prisma from '@/lib/prisma';
import {
  getSpecialityQuery,
  GetSpecialityResponse,
  Speciality
} from '@/types/speciality';

export type CreateSpecialityPayload = Pick<
  Speciality,
  'name' | 'description' | 'status' | 'code'
>;

// ==== GET ALL SPECIALIIES ==== //
export const getAllSpecialitiesService = async ({
  page,
  limit,
  keyword
}: getSpecialityQuery) => {
  const skip = page * limit;
  try {
    const records = await prisma.speciality.findMany({
      skip: skip,
      take: limit,
      where: {
        OR: [
          {
            name: {
              contains: keyword,
              mode: 'insensitive'
            }
          },
          {
            code: {
              contains: keyword,
              mode: 'insensitive'
            }
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.speciality.count({
      where: {
        OR: [
          {
            name: {
              contains: keyword
            }
          },
          {
            code: {
              contains: keyword
            }
          }
        ]
      }
    });

    let response: GetSpecialityResponse = {
      data: records,
      totalRecords: totalRecords
    };

    return response;
  } catch (error: any) {
    console.log('getAllSpecialitiesService error', error);
    throw error;
  }
};

export const checkUniqueSpecialityCode = async (code: string) => {
  try {
    const isUnique = await prisma.speciality.findUnique({
      where: {
        code: code
      }
    });

    if (!isUnique) {
      return true;
    }

    return false;
  } catch (error: any) {
    throw new Error(error.message ?? 'checkUniqueSpecialityCode Error');
  }
};

// ==== CREATE A SPECIALITY ==== //
export const createSpecialityService = async (payload: Speciality) => {
  try {
    const result = prisma.speciality.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.error('createSpecialityService error', error);
    throw error;
  }
};

// ==== UPDATE A SPECIALITY ==== //
export const updateOneSpecialityService = async (
  id: string,
  payload: Partial<Speciality>
): Promise<Speciality | null> => {
  try {
    const result = await prisma.speciality.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.error('updateOneSpecialityService error', error);
    throw error;
  }
};

// ==== GET ONE SPECIALITY ==== //
export const getSpecialityByIdService = async (id: string) => {
  try {
    const result = await prisma.speciality.findUnique({
      where: { id: id }
    });

    return result;
  } catch (error: any) {
    console.error('getSpecialityByIdService error', error);
    throw error;
  }
};

// ==== DELETE A SPECIALITY ==== //
export const deleteSpecialityByIdService = async (id: string) => {
  try {
    const result = await prisma.speciality.delete({
      where: {
        id: id
      }
    });
    return result;
  } catch (error: any) {
    console.error('deleteOneSpecialityService error', error);
    throw error;
  }
};

// ==== DELETE BULK SPECIALITIES ==== //
export const bulkDeleteSpecialitiesByIdsService = async (ids: string[]) => {
  try {
    const result = await prisma.speciality.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return result;
  } catch (error: any) {
    console.error('bulkDeleteSpecialitiesByIdsService error', error);
    throw error;
  }
};
