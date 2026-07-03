'use server';

import { getNurseViewReportDataService } from '@/services/reports/nurse-view.service';
import { 
  NurseViewReportQuery, 
  NurseViewReportResponse
} from '@/types/report';
import { requirePermission } from '@/lib/server-permissions';

// ==== GET NURSE VIEW REPORT DATA ==== //
export const getNurseViewReportData = async (
  query: NurseViewReportQuery
): Promise<NurseViewReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getNurseViewReportDataService(query);
    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getNurseViewReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting nurse view report data';
    return {
      success: false,
      data: null,
      totalRecords: 0,
      message: errorMessage,
    };
  }
};
