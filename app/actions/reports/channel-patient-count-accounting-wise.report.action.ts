'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getChannelPatientCountAccountingWiseService } from '@/services/reports/channel-patient-count-accounting-wise.report.service';
import type {
  ChannelPatientCountAccountingWiseQuery,
  ChannelPatientCountAccountingWiseResult,
} from '@/types/reports/channel-patient-count-accounting-wise';

export async function getChannelPatientCountAccountingWiseData(
  query: ChannelPatientCountAccountingWiseQuery
): Promise<ChannelPatientCountAccountingWiseResult> {
  await requirePermission('reports', 'view');
  try {
    return await getChannelPatientCountAccountingWiseService(query);
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : 'Failed to fetch channel patient count (accounting wise) report';
    return { success: false, message: msg };
  }
}

