'use server';

import { revalidatePath } from 'next/cache';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAuditUser } from '@/lib/audit-user';
import { requirePermission } from '@/lib/server-permissions';
import {
  applyChangeStaff,
  evaluateChangeStaffGuards,
  getChangeStaffHistory,
  getChangeStaffMemberById,
  getChangeStaffMembers
} from '@/services/hr-admin-services/change-staff.service';
import { getDepartmentOptions } from '@/services/organization-services/department.service';
import { getDesignationOptions } from '@/services/hr-admin-services/designation.service';
import { getStaffGradeOptions } from '@/services/hr-admin-services/staff-grade.service';
import type {
  ApplyChangeStaffPayload,
  ChangeStaffFormOptions,
  ChangeStaffGuardResult,
  ChangeStaffHistoryRow,
  ChangeStaffMemberOption
} from '@/types/change-staff';

export async function getChangeStaffMembersAction(): Promise<{
  isError: boolean;
  data: ChangeStaffMemberOption[] | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('change-staff', 'view');
    const result = await getChangeStaffMembers();
    if (!result.success) {
      throw new Error(result.error?.message ?? 'Failed to load staff');
    }
    return { isError: false, data: result.data ?? [], errors: {} };
  } catch (error: any) {
    console.error('getChangeStaffMembersAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to load staff.' }
    };
  }
}

export async function getChangeStaffDetailAction(staffId: string): Promise<{
  isError: boolean;
  data: {
    member: ChangeStaffMemberOption;
    history: ChangeStaffHistoryRow[];
  } | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('change-staff', 'view');
    const [memberRes, historyRes] = await Promise.all([
      getChangeStaffMemberById(staffId),
      getChangeStaffHistory(staffId)
    ]);
    if (!memberRes.success || !memberRes.data) {
      throw new Error(memberRes.error?.message ?? 'Staff not found');
    }
    return {
      isError: false,
      data: {
        member: memberRes.data,
        history: historyRes.success ? (historyRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getChangeStaffDetailAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to load staff detail.' }
    };
  }
}

export async function getChangeStaffFormOptionsAction(): Promise<{
  isError: boolean;
  data: ChangeStaffFormOptions | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('change-staff', 'view');
    const [deptRes, desigRes, gradeRes] = await Promise.all([
      getDepartmentOptions(),
      getDesignationOptions(),
      getStaffGradeOptions()
    ]);

    return {
      isError: false,
      data: {
        departments: deptRes.success ? (deptRes.data ?? []) : [],
        designations: desigRes.success ? (desigRes.data ?? []) : [],
        grades: gradeRes.success ? (gradeRes.data ?? []) : []
      },
      errors: {}
    };
  } catch (error: any) {
    console.error('getChangeStaffFormOptionsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: { message: error.message ?? 'Unable to load form options.' }
    };
  }
}

export async function previewChangeStaffGuardsAction(
  payload: ApplyChangeStaffPayload
): Promise<{
  isError: boolean;
  data: (ChangeStaffGuardResult & { hasChanges: boolean }) | null;
  errors: Record<string, unknown>;
}> {
  try {
    await requirePermission('change-staff', 'edit');
    const result = await evaluateChangeStaffGuards(payload);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors:
          result.error?.issues ?? {
            message: result.error?.message ?? 'Failed to evaluate guards'
          }
      };
    }
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('previewChangeStaffGuardsAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Unable to preview change guards.'
      }
    };
  }
}

export async function applyChangeStaffAction(payload: ApplyChangeStaffPayload): Promise<{
  isError: boolean;
  data: {
    member: ChangeStaffMemberOption;
    history: ChangeStaffHistoryRow[];
  } | null;
  errors: Record<string, unknown>;
}> {
  await requirePermission('change-staff', 'edit');
  try {
    const auditUser = await getAuditUser();
    const result = await applyChangeStaff(payload, auditUser);
    if (!result.success || !result.data) {
      return {
        isError: true,
        data: null,
        errors: {
          ...(result.error?.issues ?? {}),
          message: result.error?.message ?? 'Failed to apply change',
          ...(result.error?.hardBlocks
            ? { hardBlocks: result.error.hardBlocks }
            : {}),
          ...(result.error?.softWarnings
            ? { softWarnings: result.error.softWarnings }
            : {}),
          ...(result.error?.requiresAck ? { requiresAck: true } : {})
        }
      };
    }

    if (auditUser?.id) {
      logActivityNonBlocking({
        userId: auditUser.id,
        action: 'change-staff.updated',
        entityType: 'StaffEmploymentChange',
        entityId: payload.staffId,
        importance: 'high'
      });
    }

    revalidatePath('/change-staff');
    return { isError: false, data: result.data, errors: {} };
  } catch (error: any) {
    console.error('applyChangeStaffAction error:', error);
    return {
      isError: true,
      data: null,
      errors: {
        message: error.message ?? 'Something went wrong. Please try again later'
      }
    };
  }
}
