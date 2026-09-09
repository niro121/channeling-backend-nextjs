'use server';

import { format } from 'date-fns';
import { authPrisma } from '@archmage/db-auth';
import { requirePermission } from '@/lib/server-permissions';
import { fetchServerSession } from '@/lib/session';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getActivityLogsForReport } from '@/services/reports/get-user-activity-report.service';
import type {
  ExportUserActivityData,
  UserActivityReportQuery,
  UserActivityReportResponse,
} from '@/types/user-activity-report';

export async function getReportUserOptionsAction(): Promise<{
  success: boolean;
  data?: Array<{ id: string; name: string }>;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const users = await authPrisma.user.findMany({
      where: { status: 1 },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 500,
    });

    return {
      success: true,
      data: users.map((user) => ({
        id: user.id,
        name: user.name?.trim() || user.id,
      })),
    };
  } catch (error: unknown) {
    console.error('getReportUserOptionsAction error', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to load users',
    };
  }
}

export async function getUserActivityReportData(
  query: UserActivityReportQuery
): Promise<UserActivityReportResponse> {
  await requirePermission('reports', 'view');
  try {
    return await getActivityLogsForReport(
      query.userId === '__all__' || !query.userId ? undefined : query.userId,
      query.action === '__all__' || !query.action ? undefined : query.action,
      query.dateFrom,
      query.dateTo
    );
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
      createdAt: format(row.createdAt, 'yyyy-MM-dd HH:mm:ss'),
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
        action:
          'Note: More than 10,000 records exist for this range. Only first 10,000 are included.',
        entityType: '',
        entityId: '',
        ipAddress: '',
        importance: '',
      });
    }

    const session = await fetchServerSession();
    if (session?.user?.id) {
      logActivityNonBlocking({
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
