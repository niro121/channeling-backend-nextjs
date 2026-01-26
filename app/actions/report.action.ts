'use server';

import { getDoctorReportDataService } from '@/services/report.service';
import { DoctorReportQuery, DoctorReportResponse } from '@/types/report';

// ==== GET DOCTOR REPORT DATA ==== //
export const getDoctorReportData = async (
  query: DoctorReportQuery
): Promise<DoctorReportResponse> => {
  try {
    const result = await getDoctorReportDataService(query);

    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorReportData error', error);

    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: error.message || 'Error getting doctor report data'
    };
  }
};

// ==== EXPORT DOCTOR REPORT DATA ==== //
export const exportDoctorReportData = async (
  query: DoctorReportQuery
): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  try {
    const result = await getDoctorReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available'
      };
    }

    const mappedDoctors = result.data.map((d) => ({
      code: d.code,
      name: `${d.title} ${d.name}`,
      registrationNumber: d.registrationNumber || '-',
      updatedBy: d.updatedUser?.name || '-',
      updatedDate: d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('en-GB') : '-',
      createdBy: d.createdUser?.name || '-',
      createdDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '-',
      published: d.status === 1 ? 'Yes' : 'No'
    }));

    return {
      success: true,
      data: mappedDoctors
    };
  } catch (error: any) {
    console.error('exportDoctorReportData error', error);
    return {
      success: false,
      message: error.message || 'Error exporting doctor report data'
    };
  }
};
