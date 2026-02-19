'use server';

import {
  getAllRoomsService,
  getRoomByIdService,
  createRoomService,
  updateOneRoomService,
  deleteRoomByIdService,
  bulkDeleteRoomsByIdsService,
  getAllLocationsService,
  getAllZonesByLocaionIDService,
  checkRoomHasLinkedRecordsService,
  checkRoomsHaveLinkedRecordsService
} from '@/services/room.service';
import {
  getRoomParam,
  getRoomQuery,
  Room,
  RoomFormValues,
  UpdateRoomPayload
} from '@/types/room';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';

type CreateRoomPayload = RoomFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL ROOMS ==== //
export const getAllRooms = async (sort: getRoomParam) => {
  // Check view permission
  await requirePermission('rooms', 'view');

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

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch rooms',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data ?? [],
      totalRecords: response.totalRecords ?? 0
    };
  } catch (error: any) {
    console.error('getAllRooms error:', error);
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

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch room',
        data: null
      };
    }

    return {
      success: true,
      data: response.data ?? null
    };
  } catch (error: any) {
    console.error('getRoomById error:', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: null
    };
  }
};

// ==== CREATE A ROOM ==== //
export const createRoom = async (
  payload: CreateRoomPayload,
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
  await requirePermission('rooms', 'add');

  try {
    const result = await createRoomService(payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Room creation failed'
        }
      };
    }

    revalidatePath('/rooms');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Room created successfully'
    };
  } catch (error: any) {
    console.error('createRoom action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE A ROOM ==== //
export const updateOneRoom = async (
  id: string,
  payload: UpdateRoomPayload,
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
  await requirePermission('rooms', 'edit');

  try {
    const result = await updateOneRoomService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Room update failed'
        }
      };
    }

    revalidatePath('/rooms');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Room updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneRoom action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE A ROOM ==== //
export const deleteRoom = async (id: string) => {
  // Check delete permission
  await requirePermission('rooms', 'delete');

  try {
    const result = await deleteRoomByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Room deletion failed'
        }
      };
    }

    revalidatePath('/rooms');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Room deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteRoom error:', error);
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
  // Check delete permission
  await requirePermission('rooms', 'delete');

  try {
    const result = await bulkDeleteRoomsByIdsService(ids);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete rooms');
    }

    revalidatePath('/rooms');
    return true;
  } catch (error: any) {
    console.error('bulkDeleteRooms error:', error);
    throw error;
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

// ==== ROOMS EXPORT ==== //
export const getRoomsExport = async (params: { keyword?: string; locationId?: string }) => {
  try {
    const response = await getAllRooms({
      page: "0",
      limit: "10000", // Get all records
      keyword: params.keyword ?? "",
      locationId: params.locationId
    });

    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.success ? 'No rooms found' : response.message || 'Error getting data'
      };
    }

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.log('getRoomsExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};

// ==== CHECK SINGLE ROOM HAS LINKED RECORDS ==== //
export const checkRoomHasLinkedRecords = async (
  roomId: string
): Promise<{
  success: boolean
  data?: {
    hasLinkedRecords: boolean
  }
  message?: string
  error?: { message?: string }
}> => {
  try {
    const result = await checkRoomHasLinkedRecordsService(roomId)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || "Failed to check room linked records"
      }
    }

    return {
      success: true,
      data: result.data,
      message: "Check completed successfully"
    }
  } catch (error: any) {
    console.error("checkRoomHasLinkedRecords action error:", error)
    return {
      success: false,
      error: {
        message: error.message || "Error checking room linked records"
      }
    }
  }
}

// ==== CHECK ROOMS HAVE LINKED RECORDS ==== //
export const checkRoomsHaveLinkedRecords = async (
  roomIds: string[]
): Promise<{
  success: boolean
  data?: {
    hasLinkedRecords: boolean
  }
  message?: string
  error?: { message?: string }
}> => {
  try {
    const result = await checkRoomsHaveLinkedRecordsService(roomIds)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || "Failed to check rooms linked records"
      }
    }

    return {
      success: true,
      data: result.data,
      message: "Check completed successfully"
    }
  } catch (error: any) {
    console.error("checkRoomsHaveLinkedRecords action error:", error)
    return {
      success: false,
      error: {
        message: error.message || "Error checking rooms linked records"
      }
    }
  }
}