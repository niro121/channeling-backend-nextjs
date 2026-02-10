"use server"

import {
  getDoctorOptionsService,
  getAllSessionsService,
} from "@/services/sessions.service"
import { getSessionParams, getSessionQuery } from "@/types/sessions";
import { requirePermission } from '@/lib/server-permissions';

// ==== GET SESSIONS ==== //
export const getAllSessions = async (sort: getSessionParams) => {
  // Check view permission
  await requirePermission('sessions', 'view');

  try {
    // Validate and parse date if provided
    let parsedDate: Date | undefined;
    if (sort.date) {
      // Parse date string as date-only (YYYY-MM-DD)
      // Use local timezone to match how sessions are stored in database
      const dateStr = sort.date.split('T')[0]; // Extract date part if datetime string
      const [year, month, day] = dateStr.split('-').map(Number);
      // Create date in local timezone to match session creation logic
      parsedDate = new Date(year, month - 1, day);
      
      if (isNaN(parsedDate.getTime())) {
        return {
          success: false,
          message: 'Invalid date format',
          data: [],
          totalRecords: 0
        };
      }
    }

    // Validate doctorId if provided
    const validDoctorId =
      sort.doctorId && /^[a-fA-F0-9]{24}$/.test(sort.doctorId)
        ? sort.doctorId
        : undefined;

    const newFilter: getSessionQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      date: parsedDate,
      doctorId: validDoctorId
    };

    const response = await getAllSessionsService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch sessions',
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
    console.error('getAllSessions action error:', error);

    return {
      success: false,
      message: error.message || 'Error getting sessions. Please try again later',
      data: [],
      totalRecords: 0
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