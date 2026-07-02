'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { requirePermission } from '@/lib/server-permissions';
import { logActivityNonBlocking } from '@/lib/activity-log';
import { getAgentWiseAppointmentsReportService } from '@/services/reports/agent-wise-appointments.report.service';
import type {
  AgentWiseAppointmentsReportQuery,
  AgentWiseAppointmentsReportResult,
} from '@/types/reports/agent-wise-appointments';

export async function getAgentWiseAppointmentsReportData(
  query: AgentWiseAppointmentsReportQuery
): Promise<AgentWiseAppointmentsReportResult> {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentWiseAppointmentsReportService(query);
    const session = await getServerSession(authOptions);
    if (session?.user?.id && result.success) {
      logActivityNonBlocking({
        userId: session.user.id,
        action: 'reports.agent-wise-appointments.viewed',
        entityType: 'Report',
        importance: 'low',
        metadata: { reportType: query.reportType },
      });
    }
    return result;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load report';
    return {
      success: false,
      message: msg,
      monthColumns: [],
      summaryRows: [],
      detailRows: [],
      summaryMonthTotals: {},
      summaryGrandTotal: 0,
      detailTotals: { hospitalFee: 0, doctorFee: 0, discount: 0, totalFee: 0 },
    };
  }
}
