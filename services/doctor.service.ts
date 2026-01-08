'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  Doctor,
  ExportDoctorQuery,
  getDoctorQuery,
  GetDoctorResponse
} from '@/types/doctor';

// ==== GET ALL DOCTORS ==== //
export const getAllDoctorsService = async ({
  page,
  limit,
  keyword,
  specialityId
}: getDoctorQuery) => {
  const skip = page * limit;
  const whereClause: Prisma.DoctorWhereInput | undefined =
    keyword && keyword.trim() !== ''
      ? {
          OR: [
            {
              name: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              code: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              registrationNumber: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            }
          ],
          ...(specialityId ? { specialityId } : {})
        }
      : specialityId
        ? { specialityId }
        : undefined;

  try {
    const records = await prisma.doctor.findMany({
      skip,
      take: limit,
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.doctor.count({
      where: whereClause
    });

    const response: GetDoctorResponse = {
      data: records,
      totalRecords
    };

    return response;
  } catch (error: any) {
    console.error('getAllDoctorsService error', error);
    throw new Error(error.message ?? 'Error getting doctors');
  }
};

// ==== CREATE A DOCTOR ==== //
export const lastDoctorCode = async () => {
  try {
    const lastDoctor = await prisma.doctor.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { code: true }
    });

    return lastDoctor;
  } catch (error: any) {
    throw new Error(error.message ?? 'lastDoctorCode Error');
  }
};

export const createDoctorService = async (payload: Prisma.DoctorCreateInput) => {
  try {
    const result = await prisma.doctor.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.error('createDoctorService error', error);
    throw new Error(error.message ?? 'Create doctor error');
  }
};

// ==== UPDATE A DOCTOR ==== //
export const updateOneDoctorService = async (
  id: string,
  payload: Prisma.DoctorUpdateInput
): Promise<Doctor | null> => {
  try {
    const result = await prisma.doctor.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.error('updateOneDoctorService error', error);
    throw new Error(error.message ?? 'Update doctor error');
  }
};

// ==== GET ONE DOCTOR ==== //
export const getDoctorByIdService = async (id: string) => {
  try {
    const result = await prisma.doctor.findUnique({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.error('getDoctorByIdService error', error);
    throw new Error(error.message ?? 'Get doctor error');
  }
};

// ==== DELETE A DOCTOR ==== //
export const deleteDoctorByIdService = async (id: string) => {
  try {
    const result = await prisma.doctor.delete({
      where: { id }
    });
    return result;
  } catch (error: any) {
    console.error('deleteDoctorByIdService error', error);
    throw new Error(error.message ?? 'Delete doctor error');
  }
};

// ==== DELETE BULK DOCTORS ==== //
export const bulkDeleteDoctorsByIdsService = async (ids: string[]) => {
  try {
    const result = await prisma.doctor.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return result;
  } catch (error: any) {
    console.error('bulkDeleteDoctorsByIdsService error', error);
    throw new Error(error.message ?? 'Bulk delete doctors error');
  }
};

// ==== DOCTOR LIST DOWLOAD ==== //
export const getAllDoctorsDownloadService = async ({
  keyword,
  specialityId
}: ExportDoctorQuery) => {
  try {
    const whereClause = {
      OR: [
        {
          name: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          code: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          registrationNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ],
      ...(specialityId ? { specialityId } : {})
    };

    const [doctors, totalRecords] = await Promise.all([
      prisma.doctor.findMany({
        where: whereClause,
        include: {
          speciality: true
        }
      }),
      prisma.doctor.count({
        where: whereClause
      })
    ]);

    return {
      doctors,
      totalRecords
    };
  } catch (error: any) {
    console.error('getAllDoctorsDownloadService error', error);
    throw new Error(error.message ?? 'Error getting doctors');
  }
};
