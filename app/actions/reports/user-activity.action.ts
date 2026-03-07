'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivity } from '@/lib/activity-log';
import prisma from '@/lib/prisma';
import { getActivityLogsForReport } from '@/services/reports/user-activity.service';
import type {
  UserActivityReportQuery,
  UserActivityReportResponse,
  ExportUserActivityData,
} from '@/types/report';
import moment from 'moment';

export async function getReportUserOptionsAction(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const users = await prisma.user.findMany({
      where: { status: 1 },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
    const data = users.map((u) => ({ id: u.id, name: u.name || u.id }));
    return { success: true, data };
  } catch (error: unknown) {
    console.error('getReportUserOptionsAction error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load users',
    };
  }
}

/** Distinct activity action strings from the database (for filter and reference list). */
export async function getReportActionOptionsAction(): Promise<{
  success: boolean;
  data?: string[];
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const logs = await prisma.activityLog.findMany({
      select: { action: true },
      orderBy: { action: 'asc' },
      take: 10000,
    });
    const data = [...new Set(logs.map((l) => l.action).filter(Boolean))].sort().slice(0, 500);
    return { success: true, data };
  } catch (error: unknown) {
    console.error('getReportActionOptionsAction error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load actions',
    };
  }
}

export async function getUserActivityReportData(
  query: UserActivityReportQuery
): Promise<UserActivityReportResponse> {
  await requirePermission('reports', 'view');
  try {
    const result = await getActivityLogsForReport(
      query.userId === '__all__' || !query.userId ? undefined : query.userId,
      query.action === '__all__' || !query.action ? undefined : query.action,
      query.dateFrom,
      query.dateTo
    );
    if (!result.success) {
      return {
        success: false,
        data: [],
        totalReturned: 0,
        hasMore: false,
        message: result.message,
      };
    }
    return {
      success: true,
      data: result.data,
      totalReturned: result.totalReturned,
      hasMore: result.hasMore,
    };
  } catch (error: unknown) {
    console.error('getUserActivityReportData error', error);
    return {
      success: false,
      data: [],
      totalReturned: 0,
      hasMore: false,
      message: error instanceof Error ? error.message : 'Failed to fetch activity',
    };
  }
}

export async function exportUserActivityReportData(
  query: UserActivityReportQuery
): Promise<{
  success: boolean;
  data?: ExportUserActivityData[];
  message?: string;
  hasMore?: boolean;
}> {
  await requirePermission('reports', 'view');
  try {
    const result = await getActivityLogsForReport(
      query.userId === '__all__' || !query.userId ? undefined : query.userId,
      query.action === '__all__' || !query.action ? undefined : query.action,
      query.dateFrom,
      query.dateTo
    );
    if (!result.success || !result.data.length) {
      return {
        success: false,
        message: result.message || 'No data available',
      };
    }
    const mapped: ExportUserActivityData[] = result.data.map((row) => ({
      createdAt: moment(row.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      userName: row.userName ?? '-',
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId ?? '-',
      ipAddress: row.ipAddress ?? '-',
      importance: row.importance ?? '-',
    }));

    if (result.hasMore) {
      mapped.push({
        createdAt: '',
        userName: '',
        action: 'Note: More than 10,000 records exist for this range. Only first 10,000 are included.',
        entityType: '',
        entityId: '',
        ipAddress: '',
        importance: '',
      });
    }

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'reports.user-activity.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length, hasMore: result.hasMore },
      });
    }

    return {
      success: true,
      data: mapped,
      hasMore: result.hasMore,
    };
  } catch (error: unknown) {
    console.error('exportUserActivityReportData error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to export',
    };
  }
}
