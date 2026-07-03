'use server';

import { getAllDoctorViewReportDataService } from '@/services/reports/all-doctor-view.service';
import { 
  AllDoctorViewReportQuery, 
  AllDoctorViewReportResponse,
  ExportAllDoctorViewData
} from '@/types/report';
import { requirePermission } from '@/lib/server-permissions';

// ==== GET ALL DOCTOR VIEW REPORT DATA ==== //
export const getAllDoctorViewReportData = async (
  query: AllDoctorViewReportQuery
): Promise<AllDoctorViewReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getAllDoctorViewReportDataService(query);
    return {
      success: true,
      data: result.data,
      totals: result.totals,
      totalRecords: result.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getAllDoctorViewReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting all doctor view report data';
    return {
      success: false,
      data: [],
      totals: null,
      totalRecords: 0,
      message: errorMessage,
    };
  }
};

// ==== EXPORT ALL DOCTOR VIEW REPORT DATA ==== //
export const exportAllDoctorViewReportData = async (
  query: AllDoctorViewReportQuery
): Promise<{ success: boolean; data?: ExportAllDoctorViewData[]; message?: string }> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getAllDoctorViewReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    const mappedData: ExportAllDoctorViewData[] = result.data.map((row) => ({
      no: row.no.toString(),
      consultant: `${row.consultantName} (${row.consultantCode})`,
      notPaid: row.notPaid.toString(),
      paid: row.paid.toString(),
      cancel: row.cancel.toString(),
      hosRefund: row.hosRefund.toString(),
      proRefund: row.proRefund.toString(),
      hosValid: row.hosValid.toString(),
      proValid: row.proValid.toString(),
      nettValid: row.nettValid.toString(),
      total: row.total.toFixed(2),
      doctorSessionTime: row.doctorSessionTimes.join(' / '),
    }));

    return {
      success: true,
      data: mappedData,
    };
  } catch (error: unknown) {
    console.error('exportAllDoctorViewReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error exporting all doctor view report data';
    return {
      success: false,
      message: errorMessage,
    };
  }
};
