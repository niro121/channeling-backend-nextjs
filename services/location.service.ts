'use server';

import prisma from '@/lib/prisma';
import { getLocationQuery, Location } from '@/types/location';
import { Prisma } from '@prisma/client';

// ==== GET ALL LOCATIONS ==== //
export const getAllLocationsService = async ({
  page,
  limit,
  keyword,
  locationId
}: getLocationQuery) => {
  const whereClouse: Prisma.LocationWhereInput | undefined =
    keyword && keyword?.trim() !== ''
      ? {
          OR: [
            {
              name: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              city: {
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
          ],
          ...(locationId ? { locationId } : {})
        }
      : locationId
        ? { branchType: locationId }
        : undefined;

  try {
    const skip = page * limit;

    const records = await prisma.location.findMany({
      skip: skip,
      orderBy: { createdAt: 'desc' },
      where: whereClouse,
      include: {
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.location.count({
      where: whereClouse
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getAllLocationsServiceError error', error);
    throw error;
  }
};

// ==== CREATE A LOCATION ==== //
export const checkLocationCode = async (code: string) => {
  try {
    const isUnique = await prisma.location.findUnique({
      where: { code: code }
    });

    if (!isUnique) {
      return true;
    }

    return false;
  } catch (error: any) {
    console.log('lastLocationCode error', error);
    throw error;
  }
};

export const createLocationService = async (
  payload: Prisma.LocationCreateInput
) => {
  try {
    const result = prisma.location.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('createLocationService error', error);
    throw error;
  }
};

// ==== UPDATE A LOCATION ==== //
export const updateOneLocationService = async (
  id: string,
  payload: Prisma.LocationUpdateInput
): Promise<Location | null> => {
  try {
    const result = await prisma.location.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('updateOneLocationService error', error);
    throw error;
  }
};

// ==== GET ONE LOCATION ==== //
export const getLocationByIdService = async (id: string) => {
  try {
    const result = prisma.location.findUnique({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('getLocationByIdService error', error);
    throw error;
  }
};

// ==== DELETE A LOCATION ==== //
export const deleteLocationByIdService = async (id: string) => {
  try {
    const result = await prisma.location.delete({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('deleteLocationByIdService error', error);
    throw error;
  }
};

// ==== DELETE LOCATIONS ==== //
export const bulkDeleteLocationsByIdsService = async (ids: string[]) => {
  try {
    const result = await prisma.location.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return result;
  } catch (error: any) {
    console.log('bulkDeleteLocationsByIdsService error', error);
    throw error;
  }
};
