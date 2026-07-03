'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDoctorOptionsService,
  getLocationOptionsService,
  getDoctorByIdService,
  getDepartmentOptionsService,
  getAllRoomsByLocaionIDService,
  createDoctorSessionService,
  updateDoctorSessionService,
  getAllDoctorSessionsService,
  getDoctorSessionByIdService,
  deleteDoctorSessionByIdService,
  bulkDeleteDoctorSessionsByIdsService
} from '@/services/doctor.sessions.service';
import { Doctor } from '@/types/doctor';
import {
  CreateDoctorSessionPayload,
  getDoctorSessionParams,
  getDoctorSessionQuery,
  UpdateDoctorSessionPayload
} from '@/types/doctor.session';
import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';

// ==== CREATE DOCTOR SESSION ==== //
export const createDoctorSession = async (
  doctorId: string,
  payload: CreateDoctorSessionPayload,
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
  try {
    const result = await createDoctorSessionService(doctorId, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Doctor Session creation failed'
        }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-sessions.session.created',
        entityType: 'DoctorSession',
        entityId: result.data?.id ?? undefined,
        importance: 'high',
        metadata: doctorId ? { doctorId } : undefined,
      });
    }
    revalidatePath('/doctor-sessions');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Doctor Session created successfully'
    };
  } catch (error: any) {
    console.error('createDoctorSession action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== UPDATE DOCTOR ==== //
export const updateOneDoctorSession = async (
  doctorId: string,
  id: string,
  payload: UpdateDoctorSessionPayload,
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
  try {
    const result = await updateDoctorSessionService(
      doctorId,
      id,
      payload,
      user
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Doctor Session update failed'
        }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-sessions.session.updated',
        entityType: 'DoctorSession',
        entityId: id,
        importance: 'high',
        metadata: doctorId ? { doctorId } : undefined,
      });
    }
    revalidatePath('/doctor-sessions');

    return {
      success: true,
      data: result.data,
      message: result.message || 'Doctor Session updated successfully'
    };
  } catch (error: any) {
    console.error('updateOneDoctorSession action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== GET DOCTOR SESSIONS ==== //
export const getAllDoctorSessions = async (sort: getDoctorSessionParams) => {
  try {
    const newFilter: getDoctorSessionQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit:
        sort.doctorId && sort.institutionId
          ? 10000
          : sort.limit
            ? parseInt(sort.limit)
            : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      locationId: sort.locationId ?? undefined,
      doctorId: sort.doctorId ?? undefined,
      institutionId: sort.institutionId ?? undefined
    };

    const response = await getAllDoctorSessionsService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch doctor sessions',
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
    console.error('getAllDoctorSessions action error:', error);

    return {
      success: false,
      message:
        error.message ||
        'Error getting doctor sessions. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ONE DOCTOR SESSION ==== //
export const getDoctorSessionById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getDoctorSessionByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch doctor session'
        }
      };
    }

    const session = result.data;

    const normalizedSession = {
      ...session,
      fees: Array.isArray(session?.fees) ? session.fees : []
    };

    return {
      success: true,
      data: normalizedSession,
      message: result.message
    };
  } catch (error: any) {
    console.error('getDoctorSessionById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE DOCTOR SESSION ==== //
export const deleteDoctorSession = async (id: string) => {
  try {
    const result = await deleteDoctorSessionByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-sessions.session.deleted',
        entityType: 'DoctorSession',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/doctor-sessions');
    revalidatePath('/doctors');
    revalidatePath('/locations');
    revalidatePath('/departments');

    return {
      success: true,
      message: result.message
    };
  } catch (error: any) {
    console.error('deleteDoctorSession action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== DELETE BULK DOCTOR SESSIONS ==== //
export const bulkDeleteDoctorSessions = async (ids: string[]) => {
  try {
    const result = await bulkDeleteDoctorSessionsByIdsService(ids);

    if (!result.success) {
      return false;
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-sessions.sessions.bulkDeleted',
        entityType: 'DoctorSession',
        importance: 'high',
        metadata: { count: ids.length },
      });
    }
    revalidatePath('/doctor-sessions');
    revalidatePath('/doctors');
    revalidatePath('/locations');
    revalidatePath('/departments');

    return true;
  } catch (error: any) {
    console.error('bulkDeleteDoctorSessions action error:', error);

    return false;
  }
};

// ==== GET DOCTOR OPTIONS ==== //
export const getDoctorOptions = async (): Promise<{
  success: boolean;
  data: Awaited<ReturnType<typeof getDoctorOptionsService>>['data'];
  totalRecords?: number;
  error?: { message?: string };
}> => {
  try {
    const response = await getDoctorOptionsService();

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorOptions error', error);
    return {
      success: false,
      data: [],
      error: {
        message: error.message || 'Failed to get doctors'
      }
    };
  }
};

// ==== GET ONE DOCTOR ==== //
export const getDoctorById = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  try {
    const result = await getDoctorByIdService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Failed to fetch doctor'
        }
      };
    }

    return {
      success: true,
      data: result.data as Doctor,
      message: result.message
    };
  } catch (error: any) {
    console.error('getDoctorById action error:', error);

    return {
      success: false,
      error: {
        message: error.message || 'Unexpected error occurred'
      }
    };
  }
};

// ==== GET DEPARTMENT OPTIONS ==== //
export const getDepartmentOptions = async (): Promise<{
  success: boolean;
  data: Awaited<ReturnType<typeof getDepartmentOptionsService>>['data'];
  totalRecords?: number;
  error?: { message?: string };
}> => {
  try {
    const response = await getDepartmentOptionsService();

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getDepartmentOptions error', error);
    return {
      success: false,
      data: [],
      error: {
        message: error.message || 'Failed to get departments'
      }
    };
  }
};

// ==== GET LOCATION OPTIONS ==== //
export const getLocationOptions = async (): Promise<{
  success: boolean;
  data: Awaited<ReturnType<typeof getLocationOptionsService>>['data'];
  totalRecords?: number;
  error?: { message?: string };
}> => {
  try {
    const response = await getLocationOptionsService();

    return {
      success: true,
      data: response.data,
      totalRecords: response.totalRecords
    };
  } catch (error: any) {
    console.error('getLocationOptions error', error);
    return {
      success: false,
      data: [],
      error: {
        message: error.message || 'Failed to get locations'
      }
    };
  }
};

// ==== GET ALL ROOMS ==== //
export const getAllRoomsByLocaionID = async (
  locationId: string
): Promise<{
  success: boolean;
  data: Awaited<ReturnType<typeof getAllRoomsByLocaionIDService>>;
  error?: { message?: string };
}> => {
  try {
    const data = await getAllRoomsByLocaionIDService(locationId);

    return {
      success: true,
      data: data
    };
  } catch (error: any) {
    console.error('getAllRoomsByLocaionID error', error);
    return {
      success: false,
      data: [],
      error: {
        message: error.message || 'Failed to get rooms'
      }
    };
  }
};
