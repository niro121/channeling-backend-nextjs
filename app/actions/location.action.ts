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
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

type CreateLocationPayload = LocationFormValues & {
  createdBy?: string;
  updatedBy?: string;
};

// ==== GET ALL LOCATIONS ==== //
export const getAllLocations = async (sort: getLocationParam) => {
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

    return {
      success: true,
      data: response.data as Location[],
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.log('getAllLocations error ==>', error);
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

    return {
      success: true,
      data: response
    };
  } catch (error: any) {
    console.log('getLocationById error ==>', error);
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
) => {
  try {
    const locationRelation = user?.id
      ? { connect: { id: user.id } }
      : undefined;

    const result = await createLocationService({
      name: payload.name,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      city: payload.city,
      branchType: Number(payload.branchType),
      status: payload.status,
      code: payload.code,
      createdUser: locationRelation,
      updatedUser: locationRelation
    });

    revalidatePath('/locations');
    revalidatePath('/rooms');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('createLocation error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to create location'
      }
    };
  }
};

// ==== UPDATE A LOCATION ==== //
export const updateOneLocation = async (
  id: string,
  payload: UpdateLocationPayload,
  user?: { id?: string; name?: string }
) => {
  try {
    const data: Prisma.LocationUpdateInput = {
      updatedAt: new Date(),
      ...user?.id ? {updatedUser: {connect: {id: user.id}}} : ''
    }

    if(payload.name !== undefined) data.name = payload.name
    if(payload.addressLine1 !== undefined) data.addressLine1 = payload.addressLine1
    if(payload.addressLine2 !== undefined) data.addressLine2 = payload.addressLine2
    if(payload.city !== undefined) data.city = payload.city
    if(payload.branchType !== undefined) data.branchType = Number(payload.branchType)
    if(payload.status !== undefined) data.status = payload.status

    const result = await updateOneLocationService(id, data)

    revalidatePath('/locations');
    revalidatePath('/rooms');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('updateLocation error', error);

    return {
      success: false,
      error: {
        message: error.message || 'Failed to update location'
      }
    };
  }
};

// ==== DELETE A LOCATION ==== //
export const deleteLocation = async (id: string) => {
  try {
    const result = await deleteLocationByIdService(id);

    revalidatePath('/locations');
    revalidatePath('/rooms');

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('deleteLocation error', error);
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
  try {
    const result = await bulkDeleteLocationsByIdsService(ids);

    revalidatePath('/locations');
    revalidatePath('/rooms');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteLocations error', error);
    return false;
  }
};
