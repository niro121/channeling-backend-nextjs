"use server"

import { getDoctorOptionsService } from "@/services/sessions.service";
import { analyseSessionsHelper } from "@/services/sessions.service";
import moment from "moment";

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