'use server';

import prisma from '@/lib/prisma';
import { getInclusiveDaySpan, getReportMaxRangeDays, getReportMaxRecords } from '@/lib/report-limits';
import { parseReportDateTime } from '@/lib/parse-report-datetime';
import { formatUserDisplayName } from '@/lib/helpers/user-display.helper';
import type {
  AgentHistoryCreditLimitUpdateReportQuery,
  AgentHistoryCreditLimitUpdateReportRow,
} from '@/types/reports/agent-history-credit-limit-update';

const MAX_RECORDS = getReportMaxRecords('user_activity', 10000);
const MAX_RANGE_DAYS = getReportMaxRangeDays('user_activity', 366);

const ACTION_SOFT = 'agencies.limit.soft_changed';
const ACTION_HARD = 'agencies.limit.hard_changed';
const ACTION_CREDIT = 'agencies.limit.credit_changed';

type LimitKind = AgentHistoryCreditLimitUpdateReportRow['limitType'];

function actionsForLimitType(limitType: string): string[] {
  if (limitType === 'soft') return [ACTION_SOFT];
  if (limitType === 'hard') return [ACTION_HARD];
  if (limitType === 'credit') return [ACTION_CREDIT];
  return [ACTION_SOFT, ACTION_HARD, ACTION_CREDIT];
}

function limitKindFromAction(action: string): LimitKind {
  if (action === ACTION_SOFT) return 'soft';
  if (action === ACTION_CREDIT) return 'credit';
  return 'hard';
}

function createdAtFilter(
  query: AgentHistoryCreditLimitUpdateReportQuery
): { ok: true; createdAt?: { gte?: Date; lte?: Date } } | { ok: false; message: string } {
  const fromRaw = (query.fromDateTime ?? '').trim();
  const toRaw = (query.toDateTime ?? '').trim();
  if (!fromRaw && !toRaw) return { ok: true };

  const from = fromRaw ? parseReportDateTime(fromRaw, false) : null;
  const to = toRaw ? parseReportDateTime(toRaw, true) : null;
  if (fromRaw && !from) return { ok: false, message: 'From date is invalid.' };
  if (toRaw && !to) return { ok: false, message: 'To date is invalid.' };
  if (from && to && from.getTime() > to.getTime()) {
    return { ok: false, message: 'From date must be before or equal to to date.' };
  }
  if (from && to && getInclusiveDaySpan(from, to) > MAX_RANGE_DAYS) {
    return {
      ok: false,
      message: `Date range is too large. Please select ${MAX_RANGE_DAYS} days or less.`,
    };
  }

  return {
    ok: true,
    createdAt: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

export async function getAgentHistoryCreditLimitUpdateReportService(
  query: AgentHistoryCreditLimitUpdateReportQuery
): Promise<{
  success: boolean;
  data: AgentHistoryCreditLimitUpdateReportRow[];
  totalRecords: number;
  message?: string;
}> {
  const dateFilter = createdAtFilter(query);
  if (!dateFilter.ok) {
    return { success: false, data: [], totalRecords: 0, message: dateFilter.message };
  }

  const limitType = (query.limitType ?? '__all__').trim();
  const actions = actionsForLimitType(limitType);

  const where: any = {
    action: { in: actions },
    ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
  };

  const changedByUserId = (query.changedByUserId ?? '__all__').trim();
  if (changedByUserId && changedByUserId !== '__all__') {
    where.userId = changedByUserId;
  }

  const agencyId = (query.agencyId ?? '__all__').trim();
  if (agencyId && agencyId !== '__all__') {
    // Soft and credit changes: entityId is agency id.
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
      const limitType = limitKindFromAction(log.action);
      const agencyIdFromMetadata = (md?.agencyId as string | undefined) ?? null;
      const agencyIdResolved =
        limitType === 'hard' ? (agencyIdFromMetadata ?? null) : (log.entityId ?? null);
      const agencyName = (md?.agencyName as string | undefined) ?? null;
      const agencyCode = (md?.agencyCode as string | undefined) ?? null;
      const hardLimitFieldRaw = (md?.field as string | undefined) ?? null;
      const hardLimitField =
        hardLimitFieldRaw === 'minBalanceAllowed' || hardLimitFieldRaw === 'maxBalanceAllowed'
          ? (hardLimitFieldRaw as 'minBalanceAllowed' | 'maxBalanceAllowed')
          : null;
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
        hardLimitField,
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

