'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createSpecialityService,
  getAllSpecialitiesService,
  updateOneSpecialityService,
  getSpecialityByIdService,
  deleteSpecialityByIdService,
  bulkDeleteSpecialitiesByIdsService,
  getAllSpecialitiesForExportService,
  getDoctorCountBySpecialityIdService,
  getTotalDoctorCountBySpecialityIdsService
} from '@/services/speciality.service';
import {
  getSpecialityParams,
  getSpecialityQuery,
  Speciality,
  SpecialityFormValues,
  UpdateSpecialityPayload
} from '@/types/speciality';
import { revalidatePath } from 'next/cache';
import { padCode } from '@/lib/utils';
import { Prisma } from '@prisma/client';
import { requirePermission } from '@/lib/server-permissions';
import { logActivity } from '@/lib/activity-log';
import { getNextSequenceNumber } from '@/services/channel-booking/helpers/sequence';

type CreateSpecialityPayload = SpecialityFormValues & {
  createdBy?: string;
  updatedBy?: string;
}

const PREFIX = 'RHC';
const MAX_CODE = Number(process.env.MAX_CODE) || 1000;

// ==== GET ALL SPECIALIIES ==== //
export const getAllSpecialities = async (sort: getSpecialityParams) => {
  // View permission already checked by checkRouteAccess('/specialities') on the page; skip duplicate session fetch

  try {
    let newFilter: getSpecialityQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      keyword: sort.keyword ?? ''
    };

    const response = await getAllSpecialitiesService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch specialities',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data?.records ?? [],
      totalRecords: response.data?.totalRecords ?? 0,
      message: response.message
    };
  } catch (error: any) {
    console.error('getAllSpecialities action error:', error);

    return {
      success: false,
      message: error.message || 'Error getting specialities. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE SPECIALITY ==== //
export const getSpecialityById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getSpecialityByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch speciality'
        }
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message
    };
  } catch (error: any) {
    console.error('getSpecialityById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== CREATE A SPECIALITY ==== //
const SPECIALITY_SCOPE = 'speciality';

/** Get next speciality code using Sequence model (same pattern as appointment ID). Format: RHC0001, RHC0002, ... */
export const getNextSpecialityCode = async (): Promise<string> => {
  const result = await getNextSequenceNumber(SPECIALITY_SCOPE, {
    startFrom: 1,
    max: MAX_CODE,
  });

  if (!result.success) {
    throw new Error('Maximum speciality code limit reached');
  }

  return `${PREFIX}${padCode(result.value, 4)}`; // FORMAT: RHC0001
};

export const createSpeciality = async (
  payload: CreateSpecialityPayload,
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
  await requirePermission('specialities', 'add');

  try {
    const specialityCode = await getNextSpecialityCode();

    const result = await createSpecialityService(
      {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        code: specialityCode
      },
      user
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Speciality creation failed'
        }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'specialities.speciality.created',
        entityType: 'Speciality',
        entityId: result.data?.id ?? undefined,
        importance: 'high',
        metadata: result.data ? { code: result.data.code, name: result.data.name } : undefined,
      });
    }
    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Speciality created successfully'
    };
  } catch (error: any) {
    console.error('createSpeciality action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE A SPECIALITY ==== //
export const updateOneSpeciality = async (
  id: string,
  payload: UpdateSpecialityPayload,
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
  await requirePermission('specialities', 'edit');

  try {
    const result = await updateOneSpecialityService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Speciality update failed'
        }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'specialities.speciality.updated',
        entityType: 'Speciality',
        entityId: id,
        importance: 'high',
        metadata: result.data ? { code: result.data.code, name: result.data.name } : undefined,
      });
    }
    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Speciality updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneSpeciality action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE A SPECIALITY ==== //
export const deleteSpeciality = async (id: string) => {
  // Check delete permission
  await requirePermission('specialities', 'delete');

  try {
    const result = await deleteSpecialityByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'specialities.speciality.deleted',
        entityType: 'Speciality',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    console.error('deleteSpeciality action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE BULK SPECIALITIES ==== //
export const bulkDeleteSpecialities = async (ids: string[]) => {
  // Check delete permission
  await requirePermission('specialities', 'delete');

  try {
    const result = await bulkDeleteSpecialitiesByIdsService(ids);

    if (!result.success) {
      return false;
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'specialities.specialities.bulkDeleted',
        entityType: 'Speciality',
        importance: 'high',
        metadata: { count: ids.length },
      });
    }
    revalidatePath('/specialities');
    revalidatePath('/doctors');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteSpecialities action error:', error);

    return false;
  }
};


// ==== GET SPECIALITIES FOR EXPORT ==== //
export const getSpecialitiesExport = async (
  keyword?: string
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
}> => {
  try {
    const response = await getAllSpecialitiesForExportService(keyword);

    if (!response.success || !response.data?.length) {
      return {
        success: false,
        message: response.message || 'No specialities available'
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'specialities.exported',
        entityType: 'Speciality',
        importance: 'medium',
        metadata: { count: response.data?.length ?? 0 },
      });
    }
    return {
      success: true,
      data: response.data,
      message: response.message
    };
  } catch (error: any) {
    console.error('getSpecialitiesExport error', error);
    return {
      success: false,
      message: 'Error getting specialities data'
    };
  }
};

// ==== GET DOCTOR COUNT FOR SPECIALITY ==== //
export const getDoctorCountBySpecialityId = async (
  specialityId: string
): Promise<{
  success: boolean;
  data?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getDoctorCountBySpecialityIdService(specialityId);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || 'Failed to get doctor count'
      };
    }

    return {
      success: true,
      data: result.data ?? 0,
      message: 'Doctor count fetched successfully'
    };
  } catch (error: any) {
    console.error('getDoctorCountBySpecialityId action error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Error getting doctor count'
      }
    };
  }
};

// ==== GET TOTAL DOCTOR COUNT FOR MULTIPLE SPECIALITIES ==== //
export const getTotalDoctorCountBySpecialityIds = async (
  specialityIds: string[]
): Promise<{
  success: boolean;
  data?: number;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getTotalDoctorCountBySpecialityIdsService(specialityIds);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        message: result.error?.message || 'Failed to get doctor count'
      };
    }

    return {
      success: true,
      data: result.data ?? 0,
      message: 'Doctor count fetched successfully'
    };
  } catch (error: any) {
    console.error('getTotalDoctorCountBySpecialityIds action error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Error getting doctor count'
      }
    };
  }
};
