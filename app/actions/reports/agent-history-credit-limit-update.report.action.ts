'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import moment from 'moment';
import type {
  AgentHistoryCreditLimitUpdateReportExportRow,
  AgentHistoryCreditLimitUpdateReportQuery,
  AgentHistoryCreditLimitUpdateReportRow,
} from '@/types/reports/agent-history-credit-limit-update';
import { getAgentHistoryCreditLimitUpdateReportService } from '@/services/reports/agent-history-credit-limit-update.report.service';

export async function getAgentHistoryCreditLimitUpdateReportData(
  query: AgentHistoryCreditLimitUpdateReportQuery
): Promise<{
  success: boolean;
  data: AgentHistoryCreditLimitUpdateReportRow[];
  totalRecords: number;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    return await getAgentHistoryCreditLimitUpdateReportService(query);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch report';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportAgentHistoryCreditLimitUpdateReportData(
  query: AgentHistoryCreditLimitUpdateReportQuery
): Promise<{ success: boolean; data?: AgentHistoryCreditLimitUpdateReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentHistoryCreditLimitUpdateReportService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: AgentHistoryCreditLimitUpdateReportExportRow[] = result.data.map((r) => ({
      dateTime: moment(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      changedBy: r.changedByUserName ?? r.changedByUserId ?? '-',
      limitType: r.limitType === 'soft' ? 'Soft limit' : 'Hard limit',
      agent: r.agencyName ?? '-',
      agentCode: r.agencyCode ?? '-',
      oldValue: r.oldValue == null ? '-' : String(r.oldValue.toFixed(2)),
      newValue: r.newValue == null ? '-' : String(r.newValue.toFixed(2)),
      delta: r.delta == null ? '-' : String(r.delta.toFixed(2)),
      action: r.action,
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.agent-history-credit-limit-update.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mapped.length },
      });
    }

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export';
    return { success: false, message: msg };
  }
}

