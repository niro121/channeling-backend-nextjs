'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import {
  getLeaveCalendarDays,
  getLeaveManagementCounts,
  getMyLeaveBalances,
  getPendingLeaveApprovals
} from '@/services/leave-services/leave-management.service';

export async function getLeaveManagementCountsAction() {
  try {
    await requirePermission('leave-management', 'view');
    const result = await getLeaveManagementCounts();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load counts');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getLeaveManagementCountsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Failed to load counts' }
    };
  }
}

export async function getPendingLeaveApprovalsAction() {
  try {
    await requirePermission('leave-management', 'view');
    const result = await getPendingLeaveApprovals();
    if (!result.success) {
      throw new Error(
        result.error?.message ?? 'Failed to load pending approvals'
      );
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getPendingLeaveApprovalsAction error:', error);
    return {
      isError: true,
      data: [],
      errors: { message: error.message ?? 'Failed to load pending approvals' }
    };
  }
}

export async function getLeaveCalendarDaysAction(params: {
  month: number;
  year: number;
}) {
  try {
    await requirePermission('leave-management', 'view');
    const result = await getLeaveCalendarDays(params);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load calendar');
    }
    return { isError: false, data: result.data ?? {}, errors: {} };
  } catch (error: any) {
    console.error('getLeaveCalendarDaysAction error:', error);
    return {
      isError: true,
      data: {},
      errors: { message: error.message ?? 'Failed to load calendar' }
    };
  }
}

export async function getMyLeaveBalancesAction() {
  try {
    await requirePermission('leave-management', 'view');
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) {
      return {
        isError: false,
        data: { staffId: null, staffName: null, items: [] },
        errors: {}
      };
    }

    const result = await getMyLeaveBalances(userId);
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load balances');
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('getMyLeaveBalancesAction error:', error);
    return {
      isError: true,
      data: { staffId: null, staffName: null, items: [] },
      errors: { message: error.message ?? 'Failed to load balances' }
    };
  }
}
