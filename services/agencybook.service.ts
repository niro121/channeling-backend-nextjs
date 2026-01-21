'use server';

import prisma from '@/lib/prisma';
import {
  GetAgencyBooksQuery,
  GetAgencyBooksReturn,
  AgencyBook
} from '@/types/agencybook';
import { Prisma } from '@prisma/client';

// ==== GET ALL AGENCY BOOKS ==== //
export const getAllAgencyBooksService = async ({
  page,
  limit,
  keyword,
  agencyId
}: GetAgencyBooksQuery): Promise<GetAgencyBooksReturn> => {
  const validLimit = limit > 0 ? limit : 10;
  const skip = page * validLimit;

  try {
    const whereClause: Prisma.AgencyBookWhereInput = {};

    // Add keyword search
    if (keyword && keyword.trim() !== '') {
      whereClause.OR = [
        {
          bookNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          startNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        },
        {
          endNumber: {
            contains: keyword,
            mode: Prisma.QueryMode.insensitive
          }
        }
      ];
    }

    // Add agency filter
    if (agencyId && agencyId !== '__all__') {
      whereClause.agencyId = agencyId;
    }

    const records = await prisma.agencyBook.findMany({
      skip: skip,
      take: validLimit,
      where: whereClause,
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const totalRecords = await prisma.agencyBook.count({
      where: whereClause
    });

    return {
      data: records,
      totalRecords: totalRecords
    };
  } catch (error: any) {
    console.log('getAllAgencyBooksService error', error);
    throw new Error(error.message ?? 'Error getting agency books');
  }
};

// ==== GET ONE AGENCY BOOK ==== //
export const getAgencyBookByIdService = async (
  id: string
): Promise<AgencyBook | null> => {
  try {
    const result = await prisma.agencyBook.findUnique({
      where: { id: id },
      include: {
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return result;
  } catch (error: any) {
    console.log('getAgencyBookByIdService error', error);
    throw new Error(error.message ?? 'Error getting agency book');
  }
};

// ==== CREATE AGENCY BOOK ==== //
export const createAgencyBookService = async (
  payload: Prisma.AgencyBookCreateInput
): Promise<AgencyBook> => {
  try {
    const result = await prisma.agencyBook.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('createAgencyBookService error', error);
    throw new Error(error.message ?? 'Error creating agency book');
  }
};

// ==== UPDATE AGENCY BOOK ==== //
export const updateAgencyBookService = async (
  id: string,
  payload: Prisma.AgencyBookUpdateInput
): Promise<AgencyBook> => {
  try {
    const result = await prisma.agencyBook.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('updateAgencyBookService error', error);
    throw new Error(error.message ?? 'Error updating agency book');
  }
};

// ==== DELETE ONE AGENCY BOOK ==== //
export const deleteAgencyBookByIdService = async (
  id: string
): Promise<boolean> => {
  try {
    await prisma.agencyBook.delete({
      where: {
        id: id
      }
    });

    return true;
  } catch (error: any) {
    console.log('deleteAgencyBookByIdService error', error);
    throw new Error(error.message ?? 'Error deleting agency book');
  }
};

// ==== DELETE BULK AGENCY BOOKS ==== //
export const bulkDeleteAgencyBooksService = async (
  ids: string[]
): Promise<boolean> => {
  try {
    await prisma.agencyBook.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return true;
  } catch (error: any) {
    console.log('bulkDeleteAgencyBooksService error', error);
    throw new Error(error.message ?? 'Error deleting agency books');
  }
};

