import prisma from '@/lib/prisma';
import { authPrisma } from '@archmage/db-auth';
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

function parseLocalDay(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { start, end };
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
  const fromParsed = dateFrom?.trim() ? parseLocalDay(dateFrom) : null;
  const toParsed = dateTo?.trim() ? parseLocalDay(dateTo) : null;

  if (!fromParsed || !toParsed) {
    return {
      success: false,
      data: [],
      totalReturned: 0,
      hasMore: false,
      message: 'From date and to date are required.',
    };
  }

  const from = fromParsed.start;
  const to = toParsed.end;

  if (from.getTime() > to.getTime()) {
    return {
      success: false,
      data: [],
      totalReturned: 0,
      hasMore: false,
      message: 'From date must be before or equal to to date.',
    };
  }

  const daySpan = getInclusiveDaySpan(from, to);
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
