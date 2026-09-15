'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays } from '@/lib/report-limits';

const DEFAULT_REPORT_MAX = 10000;
const MAX_RANGE_DAYS = getReportMaxRangeDays('user_activity', 62);

/** Max rows for report queries (env: REPORT_MAX). Used across reports to protect the server. */
function getReportMax(): number {
  const raw = process.env.REPORT_MAX;
  if (raw == null || raw === '') return DEFAULT_REPORT_MAX;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_REPORT_MAX;
  return n;
}

/** Parse YYYY-MM-DD to start/end of day in server local time. */
function parseLocalDay(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const year = Number(y);
  const month = Number(m) - 1;
  const day = Number(d);
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start, end };
}

export type UserActivityReportRow = {
  id: string;
  userId: string;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  importance: string | null;
  createdAt: Date;
};

export type UserActivityReportResult = {
  success: boolean;
  data: UserActivityReportRow[];
  totalReturned: number;
  hasMore: boolean;
  message?: string;
};

export async function getActivityLogsForReport(
  userId: string | undefined | null,
  action: string | undefined | null,
  dateFrom: string,
  dateTo: string
): Promise<UserActivityReportResult> {
  const fromParsed = dateFrom?.trim() ? parseLocalDay(dateFrom) : null;
  const toParsed = dateTo?.trim() ? parseLocalDay(dateTo) : null;
  if (!fromParsed || !toParsed) {
    return { success: false, data: [], totalReturned: 0, hasMore: false, message: 'From date and to date are required.' };
  }
  const from = fromParsed.start;
  const to = toParsed.end;
  if (from.getTime() > to.getTime()) {
    return { success: false, data: [], totalReturned: 0, hasMore: false, message: 'From date must be before or equal to to date.' };
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
  const where: { userId?: string; action?: string | { contains: string }; createdAt: { gte: Date; lte: Date } } = {
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
    include: {
      user: { select: { name: true } },
    },
  });

  const hasMore = logs.length > max;
  const data = (hasMore ? logs.slice(0, max) : logs).map((log) => {
    const row = log as typeof log & { ipAddress?: string | null; importance?: string | null };
    return {
      id: log.id,
      userId: log.userId,
      userName: log.user?.name ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId ?? null,
      metadata: log.metadata as Record<string, unknown> | null,
      ipAddress: row.ipAddress ?? null,
      importance: row.importance ?? null,
      createdAt: log.createdAt,
    };
  });

  return {
    success: true,
    data,
    totalReturned: data.length,
    hasMore,
  };
}
