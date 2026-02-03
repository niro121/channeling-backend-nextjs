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

// ==== CREATE SESSIONS ==== //
export const createSessions = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    totalDoctors: number;
    successful: number;
    failed: number;
    results: Array<{
      doctorName: string;
      status: boolean;
      sessionCount?: number;
      error?: string;
    }>;
  };
  error?: {
    message?: string;
  };
}> => {
  try {
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().add(Number(process.env.SESSION_DAYS_COUNT || 90), 'days').format('YYYY-MM-DD');

    // == GET ALL ACTIVE DOCTORS == //
    const doctorsResponse = await getDoctorOptionsService();

    const promises = doctorsResponse.data.map((doctor) =>
      analyseSessionsHelper({
        fromDate,
        toDate,
        doctorId: doctor.id,
        update: false
      })
    );

    const promisedData = await Promise.all(promises);

    const results = promisedData.map((result, index) => {
      const doctor = doctorsResponse.data[index];
      
      if (result.status === true) {
        console.log(
          `${index + 1}. SESSIONS CREATED : ${doctor.name} : ${result.data.length}`
        );
        return {
          doctorName: doctor.name,
          status: true,
          sessionCount: result.data.length
        };
      } else {
        console.log(
          `${index + 1}. SESSIONS ****FAILED **** : ${doctor.name} : NO SESSIONS`
        );
        return {
          doctorName: doctor.name,
          status: false,
          error: result.error || 'Unknown error'
        };
      }
    });

    const successful = results.filter((r) => r.status === true).length;
    const failed = results.filter((r) => r.status === false).length;

    return {
      success: true,
      message: `Sessions creation completed. ${successful} successful, ${failed} failed.`,
      data: {
        totalDoctors: doctorsResponse.totalRecords,
        successful,
        failed,
        results
      }
    };
  } catch (error: any) {
    console.error('createSessions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to create sessions'
      }
    };
  }
};

// ==== UPDATE SESSIONS ==== //
export const updateSessions = async (): Promise<{
  success: boolean;
  message?: string;
  data?: {
    totalDoctors: number;
    successful: number;
    failed: number;
    results: Array<{
      doctorName: string;
      status: boolean;
      sessionCount?: number;
      error?: string;
    }>;
  };
  error?: {
    message?: string;
  };
}> => {
  try {
    const fromDate = moment().format('YYYY-MM-DD');
    const toDate = moment().add(Number(process.env.SESSION_DAYS_COUNT || 90), 'days').format('YYYY-MM-DD');

    // == GET ALL ACTIVE DOCTORS == //
    const doctorsResponse = await getDoctorOptionsService();

    console.log("DOCTORS FOUND ::: " + doctorsResponse.totalRecords);

    const promises = doctorsResponse.data.map((doctor) =>
      analyseSessionsHelper({
        fromDate,
        toDate,
        doctorId: doctor.id,
        update: true
      })
    );

    const promisedData = await Promise.all(promises);

    const results = promisedData.map((result, index) => {
      const doctor = doctorsResponse.data[index];
      
      if (result.status === true) {
        console.log(
          `${index + 1}. SESSIONS UPDATED : ${doctor.name} : ${result.data.length}`
        );
        return {
          doctorName: doctor.name,
          status: true,
          sessionCount: result.data.length
        };
      } else {
        console.log(
          `${index + 1}. SESSIONS ****FAILED **** : ${doctor.name} : NO SESSIONS`
        );
        return {
          doctorName: doctor.name,
          status: false,
          error: result.error || 'Unknown error'
        };
      }
    });

    const successful = results.filter((r) => r.status === true).length;
    const failed = results.filter((r) => r.status === false).length;

    return {
      success: true,
      message: `Sessions update completed. ${successful} successful, ${failed} failed.`,
      data: {
        totalDoctors: doctorsResponse.totalRecords,
        successful,
        failed,
        results
      }
    };
  } catch (error: any) {
    console.error('updateSessions error:', error);
    return {
      success: false,
      error: {
        message: error.message || 'Failed to update sessions'
      }
    };
  }
};