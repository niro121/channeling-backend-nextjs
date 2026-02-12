'use server';

import { getDoctorReportDataService, getDoctorArrivalsReportDataService } from '@/services/report.service';
import { DoctorReportQuery, DoctorReportResponse, DoctorArrivalsReportQuery, DoctorArrivalsReportResponse } from '@/types/report';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import moment from 'moment';

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

// ==== GET DOCTOR ARRIVALS REPORT DATA ==== //
export const getDoctorArrivalsReportData = async (
  query: DoctorArrivalsReportQuery
): Promise<DoctorArrivalsReportResponse> => {
  try {
    const result = await getDoctorArrivalsReportDataService(query);

    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords
    };
  } catch (error: any) {
    console.error('getDoctorArrivalsReportData error', error);

    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: error.message || 'Error getting doctor arrivals report data'
    };
  }
};

// ==== EXPORT DOCTOR ARRIVALS REPORT DATA ==== //
export const exportDoctorArrivalsReportData = async (
  query: DoctorArrivalsReportQuery
): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  try {
    const result = await getDoctorArrivalsReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available'
      };
    }

    const mappedSessions = result.data.map((session) => {
      const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
      
      // startTime and endTime are in minutes from midnight
      const startTimeMinutes = Number(session.startTime) || 0;
      const endTimeMinutes = Number(session.endTime) || 0;
      
      // Convert minutes to hours and minutes
      const startHours = Math.floor(startTimeMinutes / 60);
      const startMinutes = startTimeMinutes % 60;
      const endHours = Math.floor(endTimeMinutes / 60);
      const endMinutes = endTimeMinutes % 60;
      
      // Create Date objects for formatting (using session date as base)
      const startTime = new Date(sessionDate);
      startTime.setHours(startHours, startMinutes, 0, 0);
      const endTime = new Date(sessionDate);
      endTime.setHours(endHours, endMinutes, 0, 0);
      
      // Format as 12-hour time with AM/PM
      const startTimeStr = moment(startTime).format('h:mm A');
      const endTimeStr = moment(endTime).format('h:mm A');
      
      return {
        consultantName: formatDoctorName(session.doctor),
        roomAllocatedBy: '', // Empty for now
        sessionDate: moment(sessionDate).format('DD/MM/YYYY'),
        sessionTime: `${startTimeStr} - ${endTimeStr}`,
        sessionStatus: session.status === 1 ? 'Active' : 'Leave',
        arrivalTime: '', // Empty for now
        departureTime: '', // Empty for now
        roomReleaseBy: '', // Empty for now
        roomNumber: session.room?.number || '-'
      };
    });

    return {
      success: true,
      data: mappedSessions
    };
  } catch (error: any) {
    console.error('exportDoctorArrivalsReportData error', error);
    return {
      success: false,
      message: error.message || 'Error exporting doctor arrivals report data'
    };
  }
};
