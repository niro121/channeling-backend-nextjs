'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getAgentBalanceConfirmationLetterService } from '@/services/reports/agent.balance.confirmation.letter.service';
import {
  AgentBalanceConfirmationLetterExportRow,
  AgentBalanceConfirmationLetterQuery,
} from '@/types/reports/agent.balance.confirmation.letter';

export async function getAgentBalanceConfirmationLetterData(
  query: AgentBalanceConfirmationLetterQuery
) {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentBalanceConfirmationLetterService(query);
    return {
      success: result.success,
      data: result.data ?? [],
      totalRecords: result.totalRecords ?? 0,
      message: result.message,
    };
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : 'Failed to fetch agent balance confirmation letter';
    return { success: false, data: [], totalRecords: 0, message: msg };
  }
}

export async function exportAgentBalanceConfirmationLetterData(
  query: AgentBalanceConfirmationLetterQuery
): Promise<{ success: boolean; data?: AgentBalanceConfirmationLetterExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentBalanceConfirmationLetterService(query);
    if (!result.success || !result.data?.length) {
      return { success: false, message: result.message ?? 'No data available' };
    }

    const mapped: AgentBalanceConfirmationLetterExportRow[] = result.data.map((row) => ({
      language: row.language === 'si' ? 'Sinhala' : 'English',
      asAtDate: row.asAtDate || '-',
      agentName: row.agentName || '-',
      agentCode: row.agentCode || '-',
      address: row.address || '-',
      balance: row.balance.toFixed(2),
    }));

    return { success: true, data: mapped };
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : 'Failed to export agent balance confirmation letter';
    return { success: false, message: msg };
  }
}
