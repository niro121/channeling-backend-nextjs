'use server';

import {
  createLocationService,
  getAllLocationsService,
  getLocationByIdService,
  updateOneLocationService,
  deleteLocationByIdService,
  bulkDeleteLocationsByIdsService
} from '@/services/location.service';
import {
  getLocationParam,
  getLocationQuery,
  LocationFormValues,
  Location,
  UpdateLocationPayload
} from '@/types/location';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/server-permissions';

type CreateLocationPayload = LocationFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL LOCATIONS ==== //
export const getAllLocations = async (sort: getLocationParam) => {
  // Check view permission
  await requirePermission('locations', 'view');

  try {
    let newFilter: getLocationQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      locationId: sort.locationId ? parseInt(sort.locationId) : undefined
    };

    const response = await getAllLocationsService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch locations',
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
    console.error('getAllLocations error:', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE LOCATION ==== //
export const getLocationById = async (id: string) => {
  try {
    const response = await getLocationByIdService(id);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch location',
        data: null
      };
    }

    return {
      success: true,
      data: response.data ?? null
    };
  } catch (error: any) {
    console.error('getLocationById error:', error);
    return {
      success: false,
      message: error.message || 'Error getting data. please try again later',
      data: null
    };
  }
};

// ==== CREATE A LOCATION ==== //
export const createLocation = async (
  payload: CreateLocationPayload,
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
  await requirePermission('locations', 'add');

  try {
    const result = await createLocationService(payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Location creation failed'
        }
      };
    }

    revalidatePath('/locations');
    revalidatePath('/zones');
    revalidatePath('/rooms');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Location created successfully'
    };
  } catch (error: any) {
    console.error('createLocation action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE A LOCATION ==== //
export const updateOneLocation = async (
  id: string,
  payload: UpdateLocationPayload,
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
  await requirePermission('locations', 'edit');

  try {
    const result = await updateOneLocationService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Location update failed'
        }
      };
    }

    revalidatePath('/locations');
    revalidatePath('/zones');
    revalidatePath('/rooms');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Location updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneLocation action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE A LOCATION ==== //
export const deleteLocation = async (id: string) => {
  // Check delete permission
  await requirePermission('locations', 'delete');

  try {
    const result = await deleteLocationByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Location deletion failed'
        }
      };
    }

    revalidatePath('/locations');
    revalidatePath('/zones');
    revalidatePath('/rooms');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Location deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteLocation error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to delete Location'
      }
    };
  }
};

// ==== DELETE BULK LOCATIONS ==== //
export const bulkDeleteLocations = async (ids: string[]) => {
  // Check delete permission
  await requirePermission('locations', 'delete');

  try {
    const result = await bulkDeleteLocationsByIdsService(ids);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to delete locations');
    }

    revalidatePath('/locations');
    revalidatePath('/zones');
    revalidatePath('/rooms');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteLocations error:', error);
    throw error;
  }
};
