'use server';

import { getDoctorViewReportDataService } from '@/services/reports/doctor-view.service';
import { 
  DoctorViewReportQuery, 
  DoctorViewReportResponse
} from '@/types/report';
import { requirePermission } from '@/lib/server-permissions';

// ==== GET DOCTOR VIEW REPORT DATA ==== //
export const getDoctorViewReportData = async (
  query: DoctorViewReportQuery
): Promise<DoctorViewReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getDoctorViewReportDataService(query);
    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getDoctorViewReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting doctor view report data';
    return {
      success: false,
      data: null,
      totalRecords: 0,
      message: errorMessage,
    };
  }
};
