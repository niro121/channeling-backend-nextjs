import prisma from '@/lib/prisma';
import { authPrisma } from '@archmage/db-auth';
import { parseReportDateTimeSl } from '@/lib/parse-report-datetime';
import type { UserActivityReportResponse } from '@/types/user-activity-report';

const DEFAULT_REPORT_MAX = 10000;
const MAX_RANGE_DAYS = 62;

function getReportMax(): number {
  const raw = process.env.REPORT_MAX;
  if (raw == null || raw === '') return DEFAULT_REPORT_MAX;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REPORT_MAX;
  return n;
}

function calendarDateFromFilter(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function getInclusiveDaySpan(from: Date, to: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

export async function getActivityLogsForReport(
  userId: string | undefined | null,
  action: string | undefined | null,
  dateFrom: string,
  dateTo: string
): Promise<UserActivityReportResponse> {
  const from = dateFrom?.trim() ? parseReportDateTimeSl(dateFrom, false) : null;
  const to = dateTo?.trim() ? parseReportDateTimeSl(dateTo, true) : null;

  if (!from || !to) {
    return {
      success: false,
      data: [],
      totalReturned: 0,
      hasMore: false,
      message: 'From date and to date are required.',
    };
  }

  if (from.getTime() > to.getTime()) {
    return {
      success: false,
      data: [],
      totalReturned: 0,
      hasMore: false,
      message: 'From date must be before or equal to to date.',
    };
  }

  const fromCalendar = calendarDateFromFilter(dateFrom);
  const toCalendar = calendarDateFromFilter(dateTo);
  const daySpan =
    fromCalendar && toCalendar ? getInclusiveDaySpan(fromCalendar, toCalendar) : 0;
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      data: [],
      totalReturned: 0,
      hasMore: false,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  const max = getReportMax();
  const where: {
    userId?: string;
    action?: { contains: string };
    createdAt: { gte: Date; lte: Date };
  } = {
    createdAt: { gte: from, lte: to },
  };

  if (userId && userId.trim() !== '' && userId !== '__all__') {
    where.userId = userId.trim();
  }
  if (action && action.trim() !== '') {
    where.action = { contains: action.trim() };
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: max + 1,
  });

  const hasMore = logs.length > max;
  const sliced = hasMore ? logs.slice(0, max) : logs;
  const userIds = [...new Set(sliced.map((log) => log.userId).filter(Boolean))];

  const users =
    userIds.length > 0
      ? await authPrisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];

  const nameById = new Map(users.map((user) => [user.id, user.name]));

  const data = sliced.map((log) => ({
    id: log.id,
    userId: log.userId,
    userName: nameById.get(log.userId) ?? null,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId ?? null,
    metadata: (log.metadata as Record<string, unknown> | null) ?? null,
    ipAddress: log.ipAddress ?? null,
    importance: log.importance ?? null,
    createdAt: log.createdAt,
  }));

  return {
    success: true,
    data,
    totalReturned: data.length,
    hasMore,
  };
}
