'use server';

import { getDoctorLeavesService, getActiveSessionsService } from '@/services/doctor.leave.service';
import { requirePermission } from '@/lib/server-permissions';
import {
  GetActiveSession,
  GetDoctorLeavesParams,
  GetDoctorLeavesQuery
} from '@/types/doctor.leave';

// ==== GET LEAVES FOR A SPECIFIC DOCTOR ==== //
export const getDoctorLeaves = async (sort: GetDoctorLeavesParams) => {
  // Check view permission
  await requirePermission('doctor_leaves', 'view');

  try {
    const newFilter: GetDoctorLeavesQuery = {
      page: sort.page
        ? parseInt(sort.page)
        : parseInt(process.env.DEFAULT_PAGE ?? '0'),
      limit: sort.limit
        ? parseInt(sort.limit)
        : parseInt(process.env.DEFAULT_PER_PAGE ?? '10'),
      doctorId: sort.doctorId ?? undefined,
      fromDate: sort.fromDate ?? undefined,
      toDate: sort.toDate ?? undefined
    };

    const response = await getDoctorLeavesService(newFilter);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch doctor leaves',
        data: [],
        totalRecords: 0
      };
    }

    return {
      success: true,
      data: response.data ?? [],
      totalRecords: response.totalRecords ?? 0,
      message: response.message
    };
  } catch (error: any) {
    console.error('getDoctorLeaves action error:', error);

    return {
      success: false,
      message:
        error.message || 'Error getting doctor leaves. Please try again later',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET ALL ACTIVE SESSIONS TO SPECIFIC DATE RANGE ==== //
export const getAllActiveSessions = async (params: GetActiveSession) => {
  try {
    // Basic validation
    if (!params?.doctorId) {
      return {
        success: false,
        message: 'Doctor ID is required.',
        data: [],
        totalRecords: 0
      };
    }

    if (params.fromDate && isNaN(Date.parse(params.fromDate))) {
      return {
        success: false,
        message: 'Invalid fromDate format.',
        data: [],
        totalRecords: 0
      };
    }

    if (params.toDate && isNaN(Date.parse(params.toDate))) {
      return {
        success: false,
        message: 'Invalid toDate format.',
        data: [],
        totalRecords: 0
      };
    }

    // Call service
    const response = await getActiveSessionsService(params);

    // Service-level error
    if (!response.success) {
      return {
        success: false,
        message: response.error?.message || 'Failed to fetch active sessions.',
        data: [],
        totalRecords: 0
      };
    }

    // Success
    return {
      success: true,
      message: 'Active sessions fetched successfully.',
      data: response.data ?? [],
      totalRecords: response.totalRecords ?? 0
    };
  } catch (error: any) {
    console.error('getAllActiveSessions action error:', error);

    return {
      success: false,
      message:
        error?.message || 'Unexpected error occurred while fetching sessions.',
      data: [],
      totalRecords: 0
    };
  }
};
