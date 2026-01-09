'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { Room, getRoomQuery } from '@/types/room';

// ==== GET ALL ROOMS ==== //
export const getAllRoomsService = async ({
  page,
  limit,
  keyword,
  locationId
}: getRoomQuery) => {
  const whereClause: Prisma.RoomWhereInput | undefined =
    keyword && keyword.trim() !== ''
      ? {
          OR: [
            {
              number: {
                contains: keyword,
                mode: Prisma.QueryMode.insensitive
              }
            },
            {
              location: {

              }
            }
          ],
          ...(locationId ? { locationId } : {})
        }
      : locationId
        ? { locationId: locationId }
        : undefined;

  try {
    const skip = page * limit;

    const records = await prisma.room.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: whereClause,
      include: {
        location: true,
        createdUser: true,
        updatedUser: true
      }
    });

    const totalRecords = await prisma.room.count({
      where: whereClause
    });

    return {
      data: records,
      totalRecords
    };
  } catch (error: any) {
    console.log('getAllRoomsService error', error);
    throw error;
  }
};

/* =========================
   CHECK ROOM NUMBER (OPTIONAL)
========================= */

export const checkRoomNumber = async (
  number: string,
  locationId: string
) => {
  try {
    const existing = await prisma.room.findFirst({
      where: {
        number,
        locationId
      }
    });

    return !existing;
  } catch (error: any) {
    console.log('checkRoomNumber error', error);
    throw error;
  }
};

/* =========================
   CREATE ROOM
========================= */

export const createRoomService = async (
  payload: Prisma.RoomCreateInput
) => {
  try {
    const result = await prisma.room.create({
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('createRoomService error', error);
    throw error;
  }
};

/* =========================
   UPDATE ROOM
========================= */

export const updateOneRoomService = async (
  id: string,
  payload: Prisma.RoomUpdateInput
): Promise<Room | null> => {
  try {
    const result = await prisma.room.update({
      where: { id },
      data: payload
    });

    return result;
  } catch (error: any) {
    console.log('updateOneRoomService error', error);
    throw error;
  }
};

/* =========================
   GET ONE ROOM
========================= */

export const getRoomByIdService = async (id: string) => {
  try {
    const result = await prisma.room.findUnique({
      where: { id },
      include: {
        location: true,
        createdUser: true,
        updatedUser: true
      }
    });

    return result;
  } catch (error: any) {
    console.log('getRoomByIdService error', error);
    throw error;
  }
};

/* =========================
   DELETE ROOM
========================= */

export const deleteRoomByIdService = async (id: string) => {
  try {
    const result = await prisma.room.delete({
      where: { id }
    });

    return result;
  } catch (error: any) {
    console.log('deleteRoomByIdService error', error);
    throw error;
  }
};

/* =========================
   BULK DELETE ROOMS
========================= */

export const bulkDeleteRoomsByIdsService = async (ids: string[]) => {
  try {
    const result = await prisma.room.deleteMany({
      where: {
        id: {
          in: ids
        }
      }
    });

    return result;
  } catch (error: any) {
    console.log('bulkDeleteRoomsByIdsService error', error);
    throw error;
  }
};
