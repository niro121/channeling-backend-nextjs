'use server';

import { requireReport } from '@/lib/server-permissions';
import { getAgentBalanceReportService } from '@/services/reports/agent-balance.report.service';
import type { AgentBalanceReportQuery, AgentBalanceReportRow } from '@/types/reports/agent-balance';

export async function getAgentBalanceReportData(
  query: AgentBalanceReportQuery
): Promise<{
  success: boolean;
  data?: AgentBalanceReportRow[];
  totalRecords?: number;
  message?: string;
}> {
  await requireReport('agent-balance');
  try {
    const result = await getAgentBalanceReportService(query);
    return {
      success: result.success,
      data: result.data,
      totalRecords: result.totalRecords,
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
