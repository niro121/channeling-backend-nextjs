'use server';

import { getPhoneViewReportDataService } from '@/services/reports/phone-view.service';
import { 
  PhoneViewReportQuery, 
  PhoneViewReportResponse,
  ExportPhoneViewData
} from '@/types/report';
import { requirePermission } from '@/lib/server-permissions';
import moment from 'moment';

// ==== GET PHONE VIEW REPORT DATA ==== //
export const getPhoneViewReportData = async (
  query: PhoneViewReportQuery
): Promise<PhoneViewReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getPhoneViewReportDataService(query);
    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getPhoneViewReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting phone view report data';
    return {
      success: false,
      data: null,
      totalRecords: 0,
      message: errorMessage,
    };
  }
};

// ==== EXPORT PHONE VIEW REPORT DATA ==== //
export const exportPhoneViewReportData = async (
  query: PhoneViewReportQuery
): Promise<{ success: boolean; data?: ExportPhoneViewData[]; message?: string }> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getPhoneViewReportDataService(query);

    if (!result.success || !result.data || !result.data.bookings?.length) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    const mappedData: ExportPhoneViewData[] = result.data.bookings.map((booking) => {
      const sessionDate = result.data!.date instanceof Date 
        ? result.data!.date 
        : new Date(result.data!.date);
      const startTime = result.data!.startTime instanceof Date 
        ? result.data!.startTime 
        : new Date(result.data!.startTime);
      
      const timeStr = moment(startTime).format('hh:mm:ss A');

      return {
        appNo: booking.appointmentNo.toString(),
        bookingId: booking.bookingId,
        patientName: `${booking.title} ${booking.name}`.trim(),
        phoneNo: booking.phone || '-',
        time: timeStr,
        presentAbsent:
          (booking.refund ?? 0) > 0
            ? 'Refunded'
            : booking.status === 2
              ? 'Cancelled'
              : booking.status === 1
                ? 'Present'
                : 'Absent',
      };
    });

    return {
      success: true,
      data: mappedData,
    };
  } catch (error: unknown) {
    console.error('exportPhoneViewReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error exporting phone view report data';
    return {
      success: false,
      message: errorMessage,
    };
  }
};
