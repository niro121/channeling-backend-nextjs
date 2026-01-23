"use server"

import { getDoctorOptionsService, getLocationOptionsService } from "@/services/doctor.sessions.service";
import { Doctor } from "@/types/doctor";
import { Location } from "@/types/location";

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