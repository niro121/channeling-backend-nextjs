'use server';

import prisma from '@/lib/prisma';
import type { AuditUser } from '@/lib/audit-user';
import { toAuditUser } from '@/lib/audit-user';
import {
  colomboCivilDayUtc,
  toColomboDateIso
} from '@/lib/helpers/attendance-timezone.helper';
import {
  computeEntitlementRemaining,
  LIEU_GRANT_DAYS,
  type LieuGrantPreview
} from '@/types/leave';

export type { LieuGrantPreview };

/** RosterAllocation statuses that may post a lieu grant. */
const LIEU_GRANT_ELIGIBLE_STATUSES = [
  'published',
  'amended',
  'approved'
] as const;

function isEligibleGrantStatus(status: string): boolean {
  return (LIEU_GRANT_ELIGIBLE_STATUSES as readonly string[]).includes(status);
}

function calendarYearBoundsUtc(dutyDate: Date): { fromDate: Date; toDate: Date } {
  const year = Number(toColomboDateIso(dutyDate).slice(0, 4));
  return {
    fromDate: new Date(Date.UTC(year, 0, 1)),
    toDate: new Date(Date.UTC(year, 11, 31))
  };
}

export async function getPublishedLieuLeaveType(): Promise<{
  id: string;
  code: string;
  name: string;
} | null> {
  return prisma.leaveType.findFirst({
    where: { isLieuLeave: true, status: 1 },
    select: { id: true, code: true, name: true },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Preview which calendar-year Lieu bank a PH grant would credit for staff + duty date.
 */
export async function getLieuGrantPreview(params: {
  staffId: string;
  dutyDate: Date | string;
  allocationId?: string | null;
}): Promise<{
  success: boolean;
  data?: LieuGrantPreview;
  error?: { message?: string };
}> {
  try {
    const staffId = params.staffId?.trim();
    const dutyDate = new Date(params.dutyDate);
    if (!staffId) {
      return {
        success: false,
        error: { message: 'Select staff to preview Lieu grant.' }
      };
    }
    if (Number.isNaN(dutyDate.getTime())) {
      return {
        success: false,
        error: { message: 'Set holiday duty date to preview Lieu grant.' }
      };
    }

    const leaveType = await getPublishedLieuLeaveType();
    const civil = colomboCivilDayUtc(dutyDate);
    const { fromDate, toDate } = calendarYearBoundsUtc(civil);
    const periodFrom = toColomboDateIso(fromDate);
    const periodTo = toColomboDateIso(toDate);
    const year = periodFrom.slice(0, 4);
    const periodLabel = `1 Jan ${year} – 31 Dec ${year}`;

    let alreadyGrantedForAllocation = false;
    const allocationId = params.allocationId?.trim();
    if (allocationId) {
      const existing = await prisma.lieuLeaveGrant.findFirst({
        where: { allocationId },
        select: { id: true }
      });
      alreadyGrantedForAllocation = Boolean(existing);
    }

    if (!leaveType) {
      return {
        success: true,
        data: {
          hasPublishedLieuType: false,
          leaveTypeCode: null,
          leaveTypeName: null,
          periodFrom,
          periodTo,
          periodLabel,
          entitled: 0,
          used: 0,
          remaining: 0,
          daysEarnedThisYear: 0,
          grantDays: LIEU_GRANT_DAYS,
          afterGrantEntitled: LIEU_GRANT_DAYS,
          afterGrantRemaining: LIEU_GRANT_DAYS,
          alreadyGrantedForAllocation,
          message:
            'No published Lieu leave type. Use Leave Types → Add Lieu, then Publish.'
        }
      };
    }

    const entitlement = await prisma.leaveEntitlement.findFirst({
      where: {
        staffId,
        leaveTypeId: leaveType.id,
        fromDate,
        toDate
      },
      select: {
        entitled: true,
        used: true,
        remaining: true
      }
    });

    const entitled = Number(entitlement?.entitled ?? 0);
    const used = Number(entitlement?.used ?? 0);
    const remaining = Number(
      entitlement?.remaining ??
        computeEntitlementRemaining(entitled, 0, used)
    );

    const willAdd = alreadyGrantedForAllocation ? 0 : LIEU_GRANT_DAYS;
    const afterGrantEntitled = entitled + willAdd;
    const afterGrantRemaining = computeEntitlementRemaining(
      afterGrantEntitled,
      0,
      used
    );

    return {
      success: true,
      data: {
        hasPublishedLieuType: true,
        leaveTypeCode: leaveType.code,
        leaveTypeName: leaveType.name,
        periodFrom,
        periodTo,
        periodLabel,
        entitled,
        used,
        remaining,
        daysEarnedThisYear: entitled,
        grantDays: LIEU_GRANT_DAYS,
        afterGrantEntitled,
        afterGrantRemaining,
        alreadyGrantedForAllocation,
        message: alreadyGrantedForAllocation
          ? 'This duty already has a Lieu grant — saving again will not add another day.'
          : undefined
      }
    };
  } catch (error: any) {
    console.error('getLieuGrantPreview error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load Lieu grant preview' }
    };
  }
}

/**
 * Sync ledger + Lieu entitlement for one allocation.
 * Grants when grantLieuLeave + eligible status; reverses unused grant otherwise.
 */
export async function syncLieuLeaveGrantForAllocation(
  allocationId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'granted' | 'reversed' | 'noop';
  error?: { message?: string };
}> {
  try {
    const id = allocationId?.trim();
    if (!id) {
      return { success: false, error: { message: 'Invalid allocation id' } };
    }

    const allocation = await prisma.rosterAllocation.findUnique({
      where: { id },
      select: {
        id: true,
        staffId: true,
        date: true,
        status: true,
        grantLieuLeave: true
      }
    });

    if (!allocation) {
      return { success: false, error: { message: 'Roster allocation not found' } };
    }

    const shouldGrant =
      Boolean(allocation.grantLieuLeave) &&
      isEligibleGrantStatus(allocation.status);

    const existing = await prisma.lieuLeaveGrant.findUnique({
      where: { allocationId: id }
    });

    if (shouldGrant) {
      if (existing?.status === 'granted') {
        return { success: true, action: 'noop' };
      }
      return grantLieuLeaveForAllocation(allocation, user, existing?.id);
    }

    if (existing?.status === 'granted') {
      return reverseLieuLeaveGrant(existing.id, user);
    }

    return { success: true, action: 'noop' };
  } catch (error: any) {
    console.error('syncLieuLeaveGrantForAllocation error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to sync lieu leave grant' }
    };
  }
}

async function grantLieuLeaveForAllocation(
  allocation: {
    id: string;
    staffId: string;
    date: Date;
  },
  user?: AuditUser,
  reuseGrantId?: string
): Promise<{
  success: boolean;
  action?: 'granted' | 'reversed' | 'noop';
  error?: { message?: string };
}> {
  const leaveType = await getPublishedLieuLeaveType();
  if (!leaveType) {
    return {
      success: false,
      error: {
        message:
          'No published Lieu leave type configured. Use Leave Types → Add Lieu (then Publish) first.'
      }
    };
  }

  const auditUser = toAuditUser(user);
  const dutyDate = colomboCivilDayUtc(allocation.date);
  const { fromDate, toDate } = calendarYearBoundsUtc(dutyDate);

  await prisma.$transaction(async (tx) => {
    let entitlement = await tx.leaveEntitlement.findFirst({
      where: {
        staffId: allocation.staffId,
        leaveTypeId: leaveType.id,
        fromDate,
        toDate
      }
    });

    if (!entitlement) {
      entitlement = await tx.leaveEntitlement.create({
        data: {
          staffId: allocation.staffId,
          leaveTypeId: leaveType.id,
          fromDate,
          toDate,
          entitled: LIEU_GRANT_DAYS,
          used: 0,
          carryForward: 0,
          remaining: LIEU_GRANT_DAYS,
          status: 'active',
          ...(auditUser?.id && {
            createdBy: auditUser.id,
            updatedBy: auditUser.id
          })
        }
      });
    } else {
      const entitled = entitlement.entitled + LIEU_GRANT_DAYS;
      const remaining = computeEntitlementRemaining(
        entitled,
        entitlement.carryForward,
        entitlement.used
      );
      entitlement = await tx.leaveEntitlement.update({
        where: { id: entitlement.id },
        data: {
          entitled,
          remaining,
          status: 'active',
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    if (reuseGrantId) {
      await tx.lieuLeaveGrant.update({
        where: { id: reuseGrantId },
        data: {
          staffId: allocation.staffId,
          leaveTypeId: leaveType.id,
          entitlementId: entitlement.id,
          daysGranted: LIEU_GRANT_DAYS,
          dutyDate,
          status: 'granted',
          grantedAt: new Date(),
          reversedAt: null,
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    } else {
      await tx.lieuLeaveGrant.create({
        data: {
          allocationId: allocation.id,
          staffId: allocation.staffId,
          leaveTypeId: leaveType.id,
          entitlementId: entitlement.id,
          daysGranted: LIEU_GRANT_DAYS,
          dutyDate,
          status: 'granted',
          ...(auditUser?.id && {
            createdBy: auditUser.id,
            updatedBy: auditUser.id
          })
        }
      });
    }
  });

  return { success: true, action: 'granted' };
}

async function reverseLieuLeaveGrant(
  grantId: string,
  user?: AuditUser
): Promise<{
  success: boolean;
  action?: 'granted' | 'reversed' | 'noop';
  error?: { message?: string };
}> {
  const auditUser = toAuditUser(user);

  const result = await prisma.$transaction(async (tx) => {
    const grant = await tx.lieuLeaveGrant.findUnique({
      where: { id: grantId }
    });
    if (!grant || grant.status !== 'granted') {
      return { ok: true as const, action: 'noop' as const };
    }

    const approvedLink = await tx.leaveApplication.findFirst({
      where: {
        lieuShiftId: grant.allocationId,
        status: 'approved'
      },
      select: { formNumber: true }
    });

    if (approvedLink) {
      return {
        ok: false as const,
        message: `Cannot reverse lieu grant — already used by approved leave ${approvedLink.formNumber}.`
      };
    }

    // Free pending apps that pointed at this duty.
    await tx.leaveApplication.updateMany({
      where: {
        lieuShiftId: grant.allocationId,
        status: 'pending'
      },
      data: {
        lieuShiftId: null,
        lieuShiftLabel: null,
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    const entitlement = await tx.leaveEntitlement.findUnique({
      where: { id: grant.entitlementId }
    });

    if (entitlement) {
      const entitled = Math.max(0, entitlement.entitled - grant.daysGranted);
      const remaining = computeEntitlementRemaining(
        entitled,
        entitlement.carryForward,
        entitlement.used
      );
      await tx.leaveEntitlement.update({
        where: { id: entitlement.id },
        data: {
          entitled,
          remaining,
          ...(auditUser?.id && { updatedBy: auditUser.id })
        }
      });
    }

    await tx.lieuLeaveGrant.update({
      where: { id: grant.id },
      data: {
        status: 'reversed',
        reversedAt: new Date(),
        ...(auditUser?.id && { updatedBy: auditUser.id })
      }
    });

    return { ok: true as const, action: 'reversed' as const };
  });

  if (!result.ok) {
    return { success: false, error: { message: result.message } };
  }

  return { success: true, action: result.action };
}
