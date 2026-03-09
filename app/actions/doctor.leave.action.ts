'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getDoctorLeavesService,
  getActiveSessionsService,
  getCanceledSessionsService,
  getSessionIdsLockedByOtherLeavesService,
  getSessionsByIdsService,
  getOneLeaveByIdService,
  createDoctorLeaveService,
  updateDoctorLeaveService,
  deleteOneDoctorLeaveService,
  bulkDeleteDoctorLeavesService
} from '@/services/doctor.leave.service';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import {
  GetActiveSession,
  GetDoctorLeavesParams,
  GetDoctorLeavesQuery,
  GetLockedSessionIdsParams,
  DoctorLeaveFormProps
} from '@/types/doctor.leave';
import { revalidatePath } from 'next/cache';

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

// ==== GET ALL CANCELED SESSIONS (status 0) IN DATE RANGE ==== //
export const getCanceledSessions = async (
  params: GetActiveSession
): Promise<{
  success: boolean;
  data?: any[];
  totalRecords?: number;
  message?: string;
  error?: { message?: string };
}> => {
  await requirePermission('doctor_leaves', 'view');
  try {
    if (!params?.doctorId) {
      return {
        success: false,
        message: 'Doctor ID is required.',
        data: [],
        totalRecords: 0
      };
    }
    const response = await getCanceledSessionsService(params);
    if (!response.success) {
      return {
        success: false,
        message: response.error?.message ?? 'Failed to fetch canceled sessions',
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
    console.error('getCanceledSessions action error:', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to fetch canceled sessions',
      data: [],
      totalRecords: 0
    };
  }
};

// ==== GET SESSION IDs LOCKED BY OTHER LEAVES (same doctor) ==== //
export const getSessionIdsLockedByOtherLeaves = async (
  params: GetLockedSessionIdsParams
): Promise<{
  success: boolean;
  data?: string[];
  message?: string;
  error?: { message?: string };
}> => {
  await requirePermission('doctor_leaves', 'view');
  try {
    if (!params?.doctorId) {
      return { success: true, data: [] };
    }
    const response = await getSessionIdsLockedByOtherLeavesService(
      params.doctorId,
      params.excludeLeaveId ?? undefined
    );
    if (!response.success) {
      return {
        success: false,
        data: [],
        message: response.error?.message ?? 'Failed to fetch locked session IDs'
      };
    }
    return {
      success: true,
      data: response.data ?? [],
      message: response.message
    };
  } catch (error: any) {
    console.error('getSessionIdsLockedByOtherLeaves action error:', error);
    return {
      success: false,
      data: [],
      message: error?.message ?? 'Failed to fetch locked session IDs'
    };
  }
};

// ==== GET SESSIONS BY IDS (any status, for leave canceled-sessions display) ==== //
export const getSessionsByIds = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: any[];
  message?: string;
  error?: { message?: string };
}> => {
  await requirePermission('doctor_leaves', 'view');
  try {
    const response = await getSessionsByIdsService(ids);
    if (!response.success) {
      return {
        success: false,
        message: response.error?.message ?? 'Failed to fetch sessions',
        data: []
      };
    }
    return {
      success: true,
      data: response.data ?? [],
      message: response.message
    };
  } catch (error: any) {
    console.error('getSessionsByIds action error:', error);
    return {
      success: false,
      message: error?.message ?? 'Failed to fetch sessions by ids',
      data: []
    };
  }
};

// ==== GET ONE DOCTOR LEAVE BY ID ==== //
export const getOneLeaveByID = async (id: string) => {
  await requirePermission('doctor_leaves', 'view');

  try {
    const response = await getOneLeaveByIdService(id);

    if (!response.success) {
      return {
        success: false,
        message: response.error?.message ?? 'Failed to fetch doctor leave',
        data: null
      };
    }

    return {
      success: true,
      data: response.data ?? null,
      message: response.message
    };
  } catch (error: any) {
    console.error('getOneLeaveByID action error:', error);
    return {
      success: false,
      message: error?.message ?? 'Error getting doctor leave.',
      data: null
    };
  }
};

// ==== CREATE DOCTOR LEAVE ==== //
export const createDoctorLeave = async (
  payload: DoctorLeaveFormProps & { sessions?: { id: string }[] },
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> => {
  await requirePermission('doctor_leaves', 'add');

  try {
    const result = await createDoctorLeaveService(payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? { message: 'Doctor leave creation failed' }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-leaves.leave.created',
        entityType: 'DoctorLeave',
        entityId: result.data?.id ?? undefined,
        importance: 'high',
      });
    }
    revalidatePath('/doctor-leaves');

    return {
      success: true,
      data: result.data,
      message: result.message ?? 'Doctor leave created successfully'
    };
  } catch (error: any) {
    console.error('createDoctorLeave action error:', error);
    return {
      success: false,
      error: { message: error?.message ?? 'Unexpected error occurred' }
    };
  }
};

// ==== UPDATE DOCTOR LEAVE ==== //
export const updateDoctorLeave = async (
  id: string,
  payload: Partial<DoctorLeaveFormProps> & { sessions?: { id: string }[] },
  user?: { id?: string; name?: string }
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string; issues?: Record<string, string[]> };
}> => {
  await requirePermission('doctor_leaves', 'edit');

  try {
    const result = await updateDoctorLeaveService(id, payload, user);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? { message: 'Doctor leave update failed' }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-leaves.leave.updated',
        entityType: 'DoctorLeave',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/doctor-leaves');

    return {
      success: true,
      data: result.data,
      message: result.message ?? 'Doctor leave updated successfully'
    };
  } catch (error: any) {
    console.error('updateDoctorLeave action error:', error);
    return {
      success: false,
      error: { message: error?.message ?? 'Unexpected error occurred' }
    };
  }
};

// ==== DELETE ONE DOCTOR LEAVE ==== //
export const deleteOneDoctorLeave = async (
  id: string
): Promise<{
  success: boolean;
  data?: any;
  message?: string;
  error?: { message?: string };
}> => {
  await requirePermission('doctor_leaves', 'delete');

  try {
    const result = await deleteOneDoctorLeaveService(id);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? { message: 'Doctor leave deletion failed' }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-leaves.leave.deleted',
        entityType: 'DoctorLeave',
        entityId: id,
        importance: 'high',
      });
    }
    revalidatePath('/doctor-leaves');

    return {
      success: true,
      message: result.message ?? 'Doctor leave deleted successfully'
    };
  } catch (error: any) {
    console.error('deleteOneDoctorLeave action error:', error);
    return {
      success: false,
      error: { message: error?.message ?? 'Failed to delete doctor leave' }
    };
  }
};

// ==== BULK DELETE DOCTOR LEAVES ==== //
export const bulkDeleteDoctorLeaves = async (
  ids: string[]
): Promise<{
  success: boolean;
  data?: { count: number };
  message?: string;
  error?: { message?: string };
}> => {
  await requirePermission('doctor_leaves', 'delete');

  try {
    const result = await bulkDeleteDoctorLeavesService(ids);

    if (!result.success) {
      return {
        success: false,
        error: result.error ?? { message: 'Bulk delete failed' }
      };
    }
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'doctor-leaves.leaves.bulkDeleted',
        entityType: 'DoctorLeave',
        importance: 'high',
        metadata: { count: ids.length },
      });
    }
    revalidatePath('/doctor-leaves');

    return {
      success: true,
      data: result.data,
      message: result.message ?? 'Doctor leaves deleted successfully'
    };
  } catch (error: any) {
    console.error('bulkDeleteDoctorLeaves action error:', error);
    return {
      success: false,
      error: { message: error?.message ?? 'Failed to bulk delete doctor leaves' }
    };
  }
};
