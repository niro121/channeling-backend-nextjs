'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type {
  AgentHistoryCreditLimitUpdateReportQuery,
  AgentHistoryCreditLimitUpdateReportRow,
} from '@/types/reports/agent-history-credit-limit-update';

const MAX_RANGE_DAYS = getReportMaxRangeDays('user_activity', 62);
const MAX_RECORDS = getReportMaxRecords('user_activity', 10000);

function parseLocalDay(dateStr: string): { start: Date; end: Date } {
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const start = new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
  return { start, end };
}

const ACTION_SOFT = 'agencies.limit.soft_changed';
const ACTION_HARD = 'agencies.limit.hard_changed';

export async function getAgentHistoryCreditLimitUpdateReportService(
  query: AgentHistoryCreditLimitUpdateReportQuery
): Promise<{
  success: boolean;
  data: AgentHistoryCreditLimitUpdateReportRow[];
  totalRecords: number;
  message?: string;
}> {
  const fromParsed = query.dateFrom?.trim() ? parseLocalDay(query.dateFrom) : null;
  const toParsed = query.dateTo?.trim() ? parseLocalDay(query.dateTo) : null;
  if (!fromParsed || !toParsed) {
    return { success: false, data: [], totalRecords: 0, message: 'From date and to date are required.' };
  }
  const from = fromParsed.start;
  const to = toParsed.end;
  if (from.getTime() > to.getTime()) {
    return { success: false, data: [], totalRecords: 0, message: 'From date must be before or equal to to date.' };
  }
  const daySpan = getInclusiveDaySpan(from, to);
  if (daySpan > MAX_RANGE_DAYS) {
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  const limitType = (query.limitType ?? '__all__').trim();
  const actions =
    limitType === 'soft'
      ? [ACTION_SOFT]
      : limitType === 'hard'
        ? [ACTION_HARD]
        : [ACTION_SOFT, ACTION_HARD];

  const where: any = {
    action: { in: actions },
    createdAt: { gte: from, lte: to },
  };

  const changedByUserId = (query.changedByUserId ?? '__all__').trim();
  if (changedByUserId && changedByUserId !== '__all__') {
    where.userId = changedByUserId;
  }

  const agencyId = (query.agencyId ?? '__all__').trim();
  if (agencyId && agencyId !== '__all__') {
    // Soft changes: entityId is agency id.
    // Hard changes: agencyId is in metadata; we filter client-side after fetch (Mongo JSON query via Prisma is limited).
    where.OR = [
      { entityType: 'Agency', entityId: agencyId },
      { action: ACTION_HARD }, // will be filtered by metadata after fetch
    ];
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: MAX_RECORDS + 1,
    include: { user: { select: { name: true, staff: { select: { code: true } } } } },
  });

  const hasMore = logs.length > MAX_RECORDS;
  const sliced = hasMore ? logs.slice(0, MAX_RECORDS) : logs;

  const data: AgentHistoryCreditLimitUpdateReportRow[] = sliced
    .map((log) => {
      const md = (log.metadata ?? null) as Record<string, unknown> | null;
      const limitType: 'soft' | 'hard' = log.action === ACTION_SOFT ? 'soft' : 'hard';
      const agencyIdFromMetadata = (md?.agencyId as string | undefined) ?? null;
      const agencyIdResolved =
        limitType === 'soft' ? (log.entityId ?? null) : (agencyIdFromMetadata ?? null);
      const agencyName = (md?.agencyName as string | undefined) ?? null;
      const agencyCode = (md?.agencyCode as string | undefined) ?? null;
      const oldValue = (md?.oldValue as number | undefined) ?? null;
      const newValue = (md?.newValue as number | undefined) ?? null;
      const delta = (md?.delta as number | undefined) ?? (oldValue != null && newValue != null ? newValue - oldValue : null);
      return {
        id: log.id,
        createdAt: log.createdAt,
        changedByUserId: log.userId,
        changedByUserName: formatUserDisplayName(log.user?.name, log.userId, log.user?.staff?.code),
        limitType,
        agencyId: agencyIdResolved,
        agencyName,
        agencyCode,
        oldValue: typeof oldValue === 'number' ? oldValue : null,
        newValue: typeof newValue === 'number' ? newValue : null,
        delta: typeof delta === 'number' ? delta : null,
        action: log.action,
        entityType: log.entityType ?? null,
        entityId: log.entityId ?? null,
        metadata: md,
      };
    })
    .filter((row) => {
      if (!agencyId || agencyId === '__all__') return true;
      return row.agencyId === agencyId;
    });

  return {
    success: true,
    data,
    totalRecords: data.length,
    message: hasMore ? `More than ${MAX_RECORDS} records exist for this range. Showing first ${MAX_RECORDS}.` : undefined,
  };
}

