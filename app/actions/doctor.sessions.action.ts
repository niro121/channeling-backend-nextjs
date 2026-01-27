'use server';

import {
  getDoctorOptionsService,
  getLocationOptionsService,
  getDoctorByIdService,
  getDepartmentOptionsService,
  getAllRoomsByLocaionIDService,
  createDoctorSessionService,
  updateDoctorSessionService
} from '@/services/doctor.sessions.service';
import { Doctor } from '@/types/doctor';
import { CreateDoctorSessionPayload, UpdateDoctorSessionPayload } from '@/types/doctor.session';
import { revalidatePath } from 'next/cache';

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
    const result = await updateDoctorSessionService(doctorId, id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error || {
          message: result.message || 'Doctor Session update failed'
        }
      };
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

// ==== GET DOCTOR OPTIONS ==== //
export const getDoctorOptions = async () => {
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
export const getDepartmentOptions = async () => {
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
      error: {
        message: error.message || 'Failed to get departments'
      }
    };
  }
};

// ==== GET LOCATION OPTIONS ==== //
export const getLocationOptions = async () => {
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
      error: {
        message: error.message || 'Failed to get locations'
      }
    };
  }
};

// ==== GET ALL ROOMS ==== //
export const getAllRoomsByLocaionID = async (locationId: string) => {
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
      error: {
        message: error.message || 'Failed to get rooms'
      }
    };
  }
};
