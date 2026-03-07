'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createLocationService,
  getAllLocationsService,
  getLocationByIdService,
  updateOneLocationService,
  deleteLocationByIdService,
  bulkDeleteLocationsByIdsService,
  checkLocationHasLinkedRecordsService,
  checkLocationsHaveLinkedRecordsService
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
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getOrCreateAccount } from '@/services/accounting/account.service';
import prisma from '@/lib/prisma';

type CreateLocationPayload = LocationFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL LOCATIONS ==== //
export const getAllLocations = async (sort: getLocationParam) => {
  // View permission already checked by checkRouteAccess('/locations') on the page; skip duplicate session fetch

  try {
    let newFilter: getLocationQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? '',
      locationId: sort.locationId ? parseInt(sort.locationId) : undefined,
      publishedOnly: sort.publishedOnly,
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

// ==== CREATE GL ACCOUNT FOR LOCATION (when missing on edit) ==== //
export async function createLocationAccount(locationId: string) {
  await requirePermission('accounting', 'edit');
  try {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true, name: true, code: true },
    });
    if (!location) {
      return { success: false, message: 'Location not found' };
    }
    const result = await getOrCreateAccount({
      type: 'CASH',
      locationId: location.id,
      name: `Cash Book - ${location.name}`,
      code: location.code ? `CB-${location.code}` : null,
    });
    if (!result.success) {
      return { success: false, message: result.error ?? 'Failed to create GL account' };
    }
    revalidatePath('/locations');
    revalidatePath(`/locations/${locationId}/edit`);
    return { success: true, message: 'GL account created', accountId: result.account.id };
  } catch (e: unknown) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Failed to create GL account',
    };
  }
}

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
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'locations.location.created',
        entityType: 'Location',
        entityId: result.data?.id ?? undefined,
        importance: 'high',
        metadata: result.data ? { code: result.data.code, name: result.data.name } : undefined,
      });
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
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'locations.location.updated',
        entityType: 'Location',
        entityId: id,
        importance: 'high',
        metadata: result.data ? { code: result.data.code, name: result.data.name } : undefined,
      });
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
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'locations.location.deleted',
        entityType: 'Location',
        entityId: id,
        importance: 'high',
      });
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
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'locations.locations.bulkDeleted',
        entityType: 'Location',
        importance: 'high',
        metadata: { count: ids.length },
      });
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

// ==== LOCATIONS EXPORT ==== //
export const getLocationsExport = async (params: { keyword?: string; locationId?: string }) => {
  try {
    const response = await getAllLocations({
      page: "0",
      limit: "10000", // Get all records
      keyword: params.keyword ?? "",
      locationId: params.locationId
    });

    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.success ? 'No locations found' : response.message || 'Error getting data'
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'locations.exported',
        entityType: 'Location',
        importance: 'medium',
        metadata: { count: response.data?.length ?? 0 },
      });
    }
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.log('getLocationsExport error', error);
    return {
      success: false,
      message: 'Error getting data'
    };
  }
};

// ==== CHECK SINGLE LOCATION HAS LINKED RECORDS ==== //
export const checkLocationHasLinkedRecords = async (
  locationId: string
): Promise<{
  success: boolean
  data?: {
    hasLinkedRecords: boolean
  }
  message?: string
  error?: { message?: string }
}> => {
  try {
    const result = await checkLocationHasLinkedRecordsService(locationId)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || "Failed to check location linked records"
      }
    }

    return {
      success: true,
      data: result.data,
      message: "Check completed successfully"
    }
  } catch (error: any) {
    console.error("checkLocationHasLinkedRecords action error:", error)
    return {
      success: false,
      error: {
        message: error.message || "Error checking location linked records"
      }
    }
  }
}

// ==== CHECK LOCATIONS HAVE LINKED RECORDS ==== //
export const checkLocationsHaveLinkedRecords = async (
  locationIds: string[]
): Promise<{
  success: boolean
  data?: {
    hasLinkedRecords: boolean
  }
  message?: string
  error?: { message?: string }
}> => {
  try {
    const result = await checkLocationsHaveLinkedRecordsService(locationIds)

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || "Failed to check locations linked records"
      }
    }

    return {
      success: true,
      data: result.data,
      message: "Check completed successfully"
    }
  } catch (error: any) {
    console.error("checkLocationsHaveLinkedRecords action error:", error)
    return {
      success: false,
      error: {
        message: error.message || "Error checking locations linked records"
      }
    }
  }
}