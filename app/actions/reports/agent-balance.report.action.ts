'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getAgentBalanceReportService } from '@/services/reports/agent-balance.report.service';
import { AgentBalanceReportQuery, AgentBalanceReportData } from '@/types/reports/agent-balance';

export async function getAgentBalanceReportData(
  query: AgentBalanceReportQuery
): Promise<{
  success: boolean;
  data?: AgentBalanceReportData;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentBalanceReportService(query);
    return {
      success: result.success,
      data: result.data,
      message: result.message
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch agent balance report';
    return {
      success: false,
      message: msg
    };
  }
}
