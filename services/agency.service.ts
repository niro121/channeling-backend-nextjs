'use server';

import prisma from '@/lib/prisma';
import {
  GetAgenciesQuery,
  GetAgenciesReturn,
  Agency
} from '@/types/agency';
import { Prisma } from '@prisma/client';

// ==== GET ALL AGENCIES ==== //
export const getAllAgenciesService = async ({
  page,
  limit,
  keyword,
  parentAgencyId
}: GetAgenciesQuery): Promise<GetAgenciesReturn> => {
  const validLimit = limit > 0 ? limit : 10;
  const skip = page * validLimit;

  try {
    const whereClause: Prisma.AgencyWhereInput = {};

    // Add keyword search
    if (keyword && keyword.trim() !== '') {
      whereClause.OR = [
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
          email: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          phone: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ];
    }

    // Add parent agency filter
    if (parentAgencyId && parentAgencyId !== '__all__') {
      whereClause.parentAgencyId = parentAgencyId;
    }

    const records = await prisma.agency.findMany({
      skip: skip,
      take: validLimit,
      where: whereClause,
      include: {
        parentAgency: true,
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.agency.count({
      where: whereClause
    });

    return {
      data: records,
      totalRecords: totalRecords
    };
  } catch (error: any) {
    console.log('getAllAgenciesService error', error);
    throw new Error(error.message ?? 'Error getting agencies');
  }
};

// ==== GET ALL AGENCIES FOR EXPORT ==== //
export const getAllAgenciesExportService = async ({
  keyword,
  parentAgencyId
}: {
  keyword?: string;
  parentAgencyId?: string;
}): Promise<GetAgenciesReturn> => {
  try {
    const whereClause: Prisma.AgencyWhereInput = {};

    if (keyword && keyword.trim() !== '') {
      whereClause.OR = [
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
        }
      ];
    }

    if (parentAgencyId && parentAgencyId !== '__all__') {
      whereClause.parentAgencyId = parentAgencyId;
    }

    const records = await prisma.agency.findMany({
      where: whereClause,
      include: {
        parentAgency: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return {
      data: records,
      totalRecords: records.length
    };
  } catch (error: any) {
    console.log('getAllAgenciesExportService error', error);
    throw new Error(error.message ?? 'Error getting agencies for export');
  }
};

// ==== GET ONE AGENCY ==== //
export const getAgencyByIdService = async (
  id: string
): Promise<Agency | null> => {
  try {
    const result = await prisma.agency.findUnique({
      where: { id: id },
      include: {
        parentAgency: true,
        user: true
      }
    });

    return result;
  } catch (error: any) {
    console.log('getAgencyByIdService error', error);
    throw new Error(error.message ?? 'Error getting agency');
  }
};

// ==== GET ALL AGENCIES FOR DROPDOWN ==== //
export const getAllAgenciesOptionsService = async () => {
  try {
    const records = await prisma.agency.findMany({
      where: {
        status: 1 // Only published agencies
      },
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return {
      data: records,
      totalRecords: records.length
    };
  } catch (error: any) {
    console.log('getAllAgenciesOptionsService error', error);
    throw new Error(error.message ?? 'Error getting agency options');
  }
};

// ==== CREATE AGENCY ==== //
export const createAgencyService = async (
  payload: Prisma.AgencyCreateInput
): Promise<Agency> => {
  try {
    const result = await prisma.agency.create({
      data: payload,
      include: {
        parentAgency: true,
        user: true
      }
    });

    return result;
  } catch (error: any) {
    console.log('createAgencyService error', error);
    throw new Error(error.message ?? 'Error creating agency');
  }
};

// ==== UPDATE AGENCY ==== //
export const updateAgencyService = async (
  id: string,
  payload: Prisma.AgencyUpdateInput
): Promise<Agency> => {
  try {
    const result = await prisma.agency.update({
      where: { id },
      data: payload,
      include: {
        parentAgency: true,
        user: true
      }
    });

    return result;
  } catch (error: any) {
    console.log('updateAgencyService error', error);
    throw new Error(error.message ?? 'Error updating agency');
  }
};

// ==== DELETE ONE AGENCY ==== //
export const deleteAgencyByIdService = async (
  id: string
): Promise<boolean> => {
  try {
    await prisma.agency.delete({
      where: {
        id: id
      }
    });

    return true;
  } catch (error: any) {
    console.log('deleteAgencyByIdService error', error);
    throw new Error(error.message ?? 'Error deleting agency');
  }
};

// ==== DELETE BULK AGENCIES ==== //
export const bulkDeleteAgenciesService = async (
  ids: string[]
): Promise<boolean> => {
  try {
    await prisma.agency.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return true;
  } catch (error: any) {
    console.log('bulkDeleteAgenciesService error', error);
    throw new Error(error.message ?? 'Error deleting agencies');
  }
};

// ==== GET NEXT AGENCY CODE ==== //
export const getNextAgencyCode = async (): Promise<number> => {
  try {
    const lastAgency = await prisma.agency.findFirst({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        code: true
      }
    });

    if (!lastAgency?.code) {
      return 1;
    }

    const lastCode = parseInt(lastAgency.code) || 0;
    return lastCode + 1;
  } catch (error: any) {
    console.log('getNextAgencyCode error', error);
    return 1;
  }
};
