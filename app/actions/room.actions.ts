'use server';

import {
  getAllRoomsService,
  getRoomByIdService,
  createRoomService,
  updateOneRoomService,
  deleteRoomByIdService,
  bulkDeleteRoomsByIdsService,
  getAllLocationsService,
  getAllZonesByLocaionIDService
} from '@/services/room.service';
import {
  getRoomParam,
  getRoomQuery,
  Room,
  RoomFormValues,
  UpdateRoomPayload
} from '@/types/room';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type CreateRoomPayload = RoomFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL ROOMS ==== //
export const getAllRooms = async (sort: getRoomParam) => {
  try {
    let newFilter: getRoomQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      locationId: sort.locationId ? sort.locationId : undefined
    };

    const response = await getAllRoomsService(newFilter);

    return {
      success: true,
      data: response.data as Room[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllRoos error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE ROOM ==== //
export const getRoomById = async (id: string) => {
  try {
    const response = await getRoomByIdService(id);

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getRoomById error ==>', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: null
    };
  }
};

// ==== CREATE A LOCATION ==== //
export const createRoom = async (
  payload: CreateRoomPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const roomRelation = user?.id ? { connect: { id: user.id } } : undefined;

    const result = await createRoomService({
      number: payload.number,
      description: payload.description,
      status: payload.status,
      location: {
        connect: { id: payload.locationId }
      },
      zone: {
        connect: { id: payload.zoneId }
      },
      createdUser: roomRelation,
      updatedUser: roomRelation
    });

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createRoom error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create room'
      }
    };
  }
};

// ==== UPDATE A ROOM ==== //
export const updateOneRoom = async (
  id: string,
  payload: UpdateRoomPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const data: Prisma.RoomUpdateInput = {
      updatedAt: new Date(),
      ...(user?.id ? { updatedUser: { connect: { id: user.id } } } : '')
    };

    if (payload.number !== undefined) data.number = payload.number;
    if (payload.description !== undefined)
      data.description = payload.description;
    if (payload.status !== undefined) data.status = payload.status;

    if (payload.locationId !== undefined) {
      data.location = {
        connect: { id: payload.locationId }
      };
    }

    if (payload.zoneId !== undefined) {
      data.zone = {
        connect: { id: payload.zoneId }
      };
    }

    const result = await updateOneRoomService(id, data);

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('updateOneRoom error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update room'
      }
    };
  }
};

// ==== DELETE A ROOM ==== //
export const deleteRoom = async (id: string) => {
  try {
    const result = await deleteRoomByIdService(id);

    revalidatePath('/rooms');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('deleteRoom error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete room'
      }
    };
  }
};

// ==== DELETE BULK ROOMS ==== //
export const bulkDeleteRooms = async (ids: string[]) => {
  try {
    const result = await bulkDeleteRoomsByIdsService(ids);

    revalidatePath('/rooms');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteRooms error', error);
    return false;
  }
};

// ==== GET ALL LOCATIONS ==== //
export const getAllLocations = async () => {
  try {
    const data = await getAllLocationsService();

    return {
      success: true,
      data: data
    }
  } catch (error: any) {
    console.error('getAllLocations error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get locations'
      }
    };
  }
};

// ==== GET ALL ZONES ==== //
export const getAllZonesByLocaionID = async (locationId: string) => {
  try {
    const data = await getAllZonesByLocaionIDService(locationId);

    return {
      success: true,
      data: data
    }
  } catch (error: any) {
    console.error('getAllZonesByLocaionIDs error', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to get zones'
      }
    };
  }
};
