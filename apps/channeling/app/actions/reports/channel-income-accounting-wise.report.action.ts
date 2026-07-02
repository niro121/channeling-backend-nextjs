'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getChannelIncomeAccountingWiseService } from '@/services/reports/channel-income-accounting-wise.report.service';
import type { ChannelIncomeAccountingWiseQuery, ChannelIncomeAccountingWiseResult } from '@/types/reports/channel-income-accounting-wise';

export async function getChannelIncomeAccountingWiseData(
  query: ChannelIncomeAccountingWiseQuery
): Promise<ChannelIncomeAccountingWiseResult> {
  await requirePermission('reports', 'view');
  try {
    return await getChannelIncomeAccountingWiseService({
      dateType: query.dateType,
      fromDateTime: query.fromDateTime,
      toDateTime: query.toDateTime,
      locationId: query.locationId,
      feeMode: query.feeMode,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to load channel income report';
    return { success: false, message: msg };
  }
}

