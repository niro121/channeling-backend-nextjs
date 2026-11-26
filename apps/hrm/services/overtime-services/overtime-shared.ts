import { format } from 'date-fns';
import { z } from 'zod';
import { authPrisma } from '@archmage/db-auth';
import type { Permissions } from '@archmage/shared';
import { hasPermission } from '@/lib/permissions';
import { userTypes } from '@/lib/roles';
import { getStaffOptions } from '@/services/staff-services/staff.service';
import { OVERTIME_STATUSES } from '@/types/overtime';

export const overtimeStatusSchema = z.enum(OVERTIME_STATUSES);

export type OvertimeApproverOption = { id: string; name: string };

export function computeOvertimeHours(fromAt: Date, toAt: Date): number {
  let ms = toAt.getTime() - fromAt.getTime();
  if (ms < 0) ms += 24 * 60 * 60 * 1000;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

export function formatOvertimeDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export async function resolveApproverName(
  approverId?: string | null
): Promise<string | null> {
  if (!approverId) return null;
  const user = await authPrisma.user.findUnique({
    where: { id: approverId },
    select: { id: true, name: true }
  });
  return user?.name ?? null;
}

export function staffRosterSnapshot(staff: {
  employmentDetails?: {
    employment?: { roster?: string | null } | null;
  } | null;
}): string {
  return staff.employmentDetails?.employment?.roster?.trim() || '';
}

export function staffDepartmentSnapshot(staff: {
  employmentDetails?: {
    employment?: { department?: string | null } | null;
  } | null;
}): string {
  return staff.employmentDetails?.employment?.department?.trim() || '';
}

export async function getOvertimeApproverOptions(): Promise<{
  success: boolean;
  data?: OvertimeApproverOption[];
  message?: string;
  error?: { message?: string };
}> {
  try {
    const take =
      Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100;

    const users = await authPrisma.user.findMany({
      where: { status: 1 },
      orderBy: { name: 'asc' },
      take: Math.min(Math.max(take, 50), 300),
      select: {
        id: true,
        name: true,
        userType: true,
        userGroup: { select: { permissions: true } }
      }
    });

    const options = users
      .filter((user) => {
        if (user.userType === userTypes.admin) return true;
        const permissions = user.userGroup?.permissions as Permissions | null;
        return (
          hasPermission(permissions, 'overtime-requests', 'edit') ||
          hasPermission(permissions, 'overtime-requests', 'view')
        );
      })
      .map((user) => ({ id: user.id, name: user.name }));

    return {
      success: true,
      data: options,
      message: 'Approver options fetched'
    };
  } catch (error: any) {
    console.error('getOvertimeApproverOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to fetch approver options' }
    };
  }
}

export async function getOvertimeFormOptions(): Promise<{
  success: boolean;
  data?: {
    staff: Array<{ id: string; name: string; code: string }>;
    approvers: OvertimeApproverOption[];
  };
  error?: { message?: string };
}> {
  try {
    const [staffResult, approverResult] = await Promise.all([
      getStaffOptions(),
      getOvertimeApproverOptions()
    ]);

    return {
      success: true,
      data: {
        staff: staffResult.data ?? [],
        approvers: approverResult.data ?? []
      }
    };
  } catch (error: any) {
    console.error('getOvertimeFormOptions error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load overtime form options' }
    };
  }
}
