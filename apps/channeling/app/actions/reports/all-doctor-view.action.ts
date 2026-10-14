'use server';

import { getAllDoctorViewReportDataService } from '@/services/reports/all-doctor-view.service';
import { 
  AllDoctorViewReportQuery, 
  AllDoctorViewReportResponse,
  ExportAllDoctorViewData
} from '@/types/report';
import { requireReport } from '@/lib/server-permissions';

// ==== GET ALL DOCTOR VIEW REPORT DATA ==== //
export const getAllDoctorViewReportData = async (
  query: AllDoctorViewReportQuery
): Promise<AllDoctorViewReportResponse> => {
  await requireReport('all-doctor-view');
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
  await requireReport('all-doctor-view');
  try {
    const result = await getAllDoctorViewReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    const mappedData: ExportAllDoctorViewData[] = result.data.map((row) => ({
      no: row.no,
      consultant: `${row.consultantName} (${row.consultantCode})`,
      notPaid: row.notPaid,
      paid: row.paid,
      cancel: row.cancel,
      hosRefund: row.hosRefund,
      proRefund: row.proRefund,
      hosValid: row.hosValid,
      proValid: row.proValid,
      nettValid: row.nettValid,
      total: row.total,
      doctorSessionTime: row.doctorSessionTimes.join(' / '),
    }));

    // Same Total footer row as the on-screen / print table.
    if (result.totals) {
      mappedData.push({
        no: result.totals.no,
        consultant: 'Total',
        notPaid: null,
        paid: null,
        cancel: null,
        hosRefund: null,
        proRefund: null,
        hosValid: null,
        proValid: null,
        nettValid: null,
        total: result.totals.total,
        doctorSessionTime: '',
      });
    }

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
