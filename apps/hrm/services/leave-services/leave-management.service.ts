'use server';

import { authPrisma } from '@archmage/db-auth';
import { endOfDay, endOfMonth, format, startOfDay, startOfMonth } from 'date-fns';
import prisma from '@/lib/prisma';
import { formatHalfDaySessionLabel } from '@/lib/helpers/leave-application-days.helper';
import { formatDate } from '@/lib/utils/date';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function formatDuration(days: number, halfDaySession?: string | null): string {
  if (days === 0.5) {
    const session = formatHalfDaySessionLabel(halfDaySession);
    return session ? `0.5 day (${session})` : '0.5 day';
  }
  if (days === 1) return '1 day';
  return `${days} days`;
}

function formatDateRangeLabel(fromDate: Date, toDate: Date): string {
  const sameDay =
    fromDate.getFullYear() === toDate.getFullYear() &&
    fromDate.getMonth() === toDate.getMonth() &&
    fromDate.getDate() === toDate.getDate();

  if (sameDay) {
    return format(fromDate, 'd MMM');
  }

  if (
    fromDate.getMonth() === toDate.getMonth() &&
    fromDate.getFullYear() === toDate.getFullYear()
  ) {
    return `${format(fromDate, 'd')}–${format(toDate, 'd MMM')}`;
  }

  return `${format(fromDate, 'd MMM')} – ${format(toDate, 'd MMM')}`;
}

export type LeaveManagementCounts = {
  onLeaveToday: number;
  pendingApproval: number;
  approvedMonth: number;
  rejectedMonth: number;
};

export async function getLeaveManagementCounts(): Promise<{
  success: boolean;
  data?: LeaveManagementCounts;
  error?: { message?: string };
}> {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [onLeaveToday, pendingApproval, approvedMonth, rejectedMonth] =
      await Promise.all([
        prisma.leaveApplication.count({
          where: {
            status: 'approved',
            fromDate: { lte: todayEnd },
            toDate: { gte: todayStart }
          }
        }),
        prisma.leaveApplication.count({
          where: { status: 'pending' }
        }),
        prisma.leaveApplication.count({
          where: {
            status: 'approved',
            approvedAt: { gte: monthStart, lte: monthEnd }
          }
        }),
        prisma.leaveApplication.count({
          where: {
            status: 'rejected',
            approvedAt: { gte: monthStart, lte: monthEnd }
          }
        })
      ]);

    return {
      success: true,
      data: {
        onLeaveToday,
        pendingApproval,
        approvedMonth,
        rejectedMonth
      }
    };
  } catch (error: any) {
    console.error('getLeaveManagementCounts error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load leave counts' }
    };
  }
}

export type PendingApprovalListItem = {
  id: string;
  name: string;
  initials: string;
  department: string;
  leaveType: string;
  dateRange: string;
  duration: string;
  staffCode?: string;
  days: number;
  halfDaySession?: string | null;
};

export async function getPendingLeaveApprovals(limit?: number): Promise<{
  success: boolean;
  data?: PendingApprovalListItem[];
  error?: { message?: string };
}> {
  try {
    const take =
      limit ??
      (Number.parseInt(process.env.DEFAULT_PAGE_SIZE ?? '100', 10) || 100);

    const records = await prisma.leaveApplication.findMany({
      where: { status: 'pending' },
      orderBy: [{ createdAt: 'asc' }],
      take: Math.min(Math.max(take, 1), 200),
      include: {
        leaveType: { select: { name: true, code: true } },
        staff: { select: { name: true, code: true } }
      }
    });

    const data: PendingApprovalListItem[] = records.map((row) => {
      const name = row.staff?.name ?? 'Unknown';
      return {
        id: row.id,
        name,
        initials: initialsFromName(name),
        department: '—',
        leaveType: row.leaveType?.name ?? 'Leave',
        dateRange: formatDateRangeLabel(row.fromDate, row.toDate),
        duration: formatDuration(row.days, row.halfDaySession),
        staffCode: row.staff?.code ?? undefined,
        days: row.days,
        halfDaySession: row.halfDaySession
      };
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('getPendingLeaveApprovals error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load pending approvals' }
    };
  }
}

export type LeaveCalendarDayEntry = {
  id: string;
  name: string;
  department?: string;
  leaveType: string;
};

export type LeaveCalendarDaysMap = Record<
  string,
  { count: number; entries: LeaveCalendarDayEntry[] }
>;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function getLeaveCalendarDays(params: {
  month: number;
  year: number;
}): Promise<{
  success: boolean;
  data?: LeaveCalendarDaysMap;
  error?: { message?: string };
}> {
  try {
    const monthStart = new Date(params.year, params.month, 1);
    const monthEnd = endOfMonth(monthStart);

    const records = await prisma.leaveApplication.findMany({
      where: {
        status: 'approved',
        fromDate: { lte: monthEnd },
        toDate: { gte: monthStart }
      },
      include: {
        leaveType: { select: { name: true } },
        staff: { select: { name: true } }
      }
    });

    const map: LeaveCalendarDaysMap = {};

    for (const row of records) {
      const rangeStart =
        row.fromDate < monthStart ? monthStart : startOfDay(row.fromDate);
      const rangeEnd = row.toDate > monthEnd ? monthEnd : startOfDay(row.toDate);

      for (
        let cursor = new Date(rangeStart);
        cursor <= rangeEnd;
        cursor.setDate(cursor.getDate() + 1)
      ) {
        const key = toDateKey(cursor);
        if (!map[key]) {
          map[key] = { count: 0, entries: [] };
        }
        map[key].entries.push({
          id: `${row.id}-${key}`,
          name: row.staff?.name ?? 'Unknown',
          leaveType: row.leaveType?.name ?? 'Leave'
        });
        map[key].count = map[key].entries.length;
      }
    }

    return { success: true, data: map };
  } catch (error: any) {
    console.error('getLeaveCalendarDays error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load leave calendar' }
    };
  }
}

export type MyLeaveBalanceItem = {
  id: string;
  label: string;
  used: number;
  total: number | null;
  remaining: number;
  indicatorClassName: string;
};

const BALANCE_COLORS = [
  'bg-teal-700',
  'bg-emerald-500',
  'bg-slate-500',
  'bg-cyan-600',
  'bg-slate-400'
];

export async function getMyLeaveBalances(authUserId: string): Promise<{
  success: boolean;
  data?: {
    staffId: string | null;
    staffName: string | null;
    items: MyLeaveBalanceItem[];
  };
  error?: { message?: string };
}> {
  try {
    if (!authUserId) {
      return {
        success: true,
        data: { staffId: null, staffName: null, items: [] }
      };
    }

    const authUser = await authPrisma.user.findUnique({
      where: { id: authUserId },
      select: { staffId: true }
    });

    const staffId = authUser?.staffId ?? null;
    if (!staffId) {
      return {
        success: true,
        data: { staffId: null, staffName: null, items: [] }
      };
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, name: true }
    });

    const entitlements = await prisma.leaveEntitlement.findMany({
      where: { staffId, status: { in: ['active', 'pending'] } },
      include: { leaveType: { select: { id: true, name: true, code: true } } },
      orderBy: { fromDate: 'desc' }
    });

    // Aggregate by leave type
    const byType = new Map<
      string,
      { label: string; used: number; entitled: number; remaining: number }
    >();

    for (const row of entitlements) {
      const key = row.leaveTypeId;
      const label = row.leaveType?.name ?? 'Leave';
      const existing = byType.get(key) ?? {
        label,
        used: 0,
        entitled: 0,
        remaining: 0
      };
      existing.used += row.used;
      existing.entitled += row.entitled + row.carryForward;
      existing.remaining += row.remaining;
      byType.set(key, existing);
    }

    const items: MyLeaveBalanceItem[] = [...byType.entries()].map(
      ([id, row], index) => ({
        id,
        label: row.label,
        used: row.used,
        total: row.entitled,
        remaining: row.remaining,
        indicatorClassName: BALANCE_COLORS[index % BALANCE_COLORS.length]
      })
    );

    return {
      success: true,
      data: {
        staffId,
        staffName: staff?.name ?? null,
        items
      }
    };
  } catch (error: any) {
    console.error('getMyLeaveBalances error:', error);
    return {
      success: false,
      error: { message: error.message || 'Failed to load leave balances' }
    };
  }
}

/** Re-export for callers that format dates. */
export { formatDate };
