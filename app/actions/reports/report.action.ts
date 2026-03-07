'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { getDoctorReportDataService, getChannelAgentReferenceBookReportDataService, getDoctorArrivalsReportDataService } from '@/services/reports/report.service';
import { 
  DoctorReportQuery, 
  DoctorReportResponse, 
  ChannelAgentReferenceBookReportQuery, 
  ChannelAgentReferenceBookReportResponse, 
  DoctorArrivalsReportQuery, 
  DoctorArrivalsReportResponse,
  ExportDoctorData,
  ExportDoctorArrivalsData,
  ExportChannelAgentReferenceBookData
} from '@/types/report';
import { normalizeSessionTime } from '@/lib/utils';
import { requirePermission } from '@/lib/server-permissions';
import { formatDoctorName } from '@/lib/helpers/doctor-name.helper';
import { Doctor } from '@/types/doctor';
import { Session } from '@/types/booking.dashboard';
import { AgencyBook } from '@/types/agencybook';
import moment from 'moment';

// ==== GET DOCTOR REPORT DATA ==== //
export const getDoctorReportData = async (
  query: DoctorReportQuery
): Promise<DoctorReportResponse> => {
  try {
    const result = await getDoctorReportDataService(query);

    // Map the result to ensure User objects have all required fields
    const mappedData: Doctor[] = result.data.map((doctor: any) => ({
      ...doctor,
      createdUser: doctor.createdUser ? {
        ...doctor.createdUser,
        checkedDefaultLocation: doctor.createdUser.checkedDefaultLocation ?? false
      } : null,
      updatedUser: doctor.updatedUser ? {
        ...doctor.updatedUser,
        checkedDefaultLocation: doctor.updatedUser.checkedDefaultLocation ?? false
      } : null
    }));

    return {
      success: true,
      data: mappedData,
      totalRecords: result.totalRecords
    };
  } catch (error: unknown) {
    console.error('getDoctorReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting doctor report data';

    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: errorMessage
    };
  }
};

// ==== EXPORT DOCTOR REPORT DATA ==== //
export const exportDoctorReportData = async (
  query: DoctorReportQuery
): Promise<{ success: boolean; data?: ExportDoctorData[]; message?: string }> => {
  try {
    const result = await getDoctorReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available'
      };
    }

    // Map the result to ensure User objects have all required fields
    const mappedDoctorsData: Doctor[] = result.data.map((doctor: any) => ({
      ...doctor,
      createdUser: doctor.createdUser ? {
        ...doctor.createdUser,
        checkedDefaultLocation: doctor.createdUser.checkedDefaultLocation ?? false
      } : null,
      updatedUser: doctor.updatedUser ? {
        ...doctor.updatedUser,
        checkedDefaultLocation: doctor.updatedUser.checkedDefaultLocation ?? false
      } : null
    }));

    const mappedDoctors: ExportDoctorData[] = mappedDoctorsData.map((d: Doctor) => ({
      code: d.code,
      name: `${d.title} ${d.name}`,
      registrationNumber: d.registrationNumber || '-',
      updatedBy: d.updatedUser?.name || '-',
      updatedDate: d.updatedAt ? new Date(d.updatedAt).toLocaleDateString('en-GB') : '-',
      createdBy: d.createdUser?.name || '-',
      createdDate: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-GB') : '-',
      published: d.status === 1 ? 'Yes' : 'No'
    }));

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'reports.doctors.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mappedDoctors.length },
      });
    }
    return {
      success: true,
      data: mappedDoctors
    };
  } catch (error: unknown) {
    console.error('exportDoctorReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error exporting doctor report data';
    return {
      success: false,
      message: errorMessage
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
  } catch (error: unknown) {
    console.error('getDoctorArrivalsReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting doctor arrivals report data';

    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: errorMessage
    };
  }
};

// ==== GET CHANNEL AGENT REFERENCE BOOK REPORT DATA ==== //
export const getChannelAgentReferenceBookReportData = async (
  query: ChannelAgentReferenceBookReportQuery
): Promise<ChannelAgentReferenceBookReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelAgentReferenceBookReportDataService(query);
    
    // Map the result to ensure User objects have all required fields
    const mappedData: AgencyBook[] = result.data.map((book: any) => ({
      ...book,
      createdUser: book.createdUser ? {
        ...book.createdUser,
        checkedDefaultLocation: book.createdUser.checkedDefaultLocation ?? false
      } : null,
      updatedUser: book.updatedUser ? {
        ...book.updatedUser,
        checkedDefaultLocation: book.updatedUser.checkedDefaultLocation ?? false
      } : null
    }));
    
    return {
      success: true,
      data: mappedData,
      totalRecords: result.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getChannelAgentReferenceBookReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting channel agent reference book report data';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: errorMessage,
    };
  }
};

// ==== EXPORT CHANNEL AGENT REFERENCE BOOK REPORT DATA ==== //
export const exportChannelAgentReferenceBookReportData = async (
  query: ChannelAgentReferenceBookReportQuery
): Promise<{ success: boolean; data?: ExportChannelAgentReferenceBookData[]; message?: string }> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelAgentReferenceBookReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    // Map the result to ensure User objects have all required fields
    const mappedBooksData: AgencyBook[] = result.data.map((book: any) => ({
      ...book,
      createdUser: book.createdUser ? {
        ...book.createdUser,
        checkedDefaultLocation: book.createdUser.checkedDefaultLocation ?? false
      } : null,
      updatedUser: book.updatedUser ? {
        ...book.updatedUser,
        checkedDefaultLocation: book.updatedUser.checkedDefaultLocation ?? false
      } : null
    }));

    const mappedBooks: ExportChannelAgentReferenceBookData[] = mappedBooksData.map((book: AgencyBook, index: number) => {
      const createdDate = book.createdAt 
        ? (book.createdAt instanceof Date ? book.createdAt : new Date(book.createdAt))
        : new Date();
      const updatedDate = book.updatedAt 
        ? (book.updatedAt instanceof Date ? book.updatedAt : new Date(book.updatedAt))
        : new Date();

      return {
        sNo: index + 1,
        agent: book.agency?.name?.toUpperCase() || '-',
        bookNumber: book.bookNumber?.toUpperCase() || '-',
        utilizedPageCount: '', // Empty as per requirement
        startingReferenceNumber: book.startNumber || '-',
        endingReferenceNumber: book.endNumber || '-',
        createdBy: book.createdUser?.name || '-',
        createdDate: moment(createdDate).format('YYYY-MM-DD hh:mm A'),
        updatedBy: book.updatedUser?.name || '-',
        updatedDate: book.updatedBy ? moment(updatedDate).format('YYYY-MM-DD hh:mm A') : '-',
        active: book.status === 1 ? 'Active' : 'Inactive',
      };
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'reports.channel-agent-reference-book.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mappedBooks.length },
      });
    }
    return {
      success: true,
      data: mappedBooks,
    };
  } catch (error: unknown) {
    console.error('exportChannelAgentReferenceBookReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error exporting channel agent reference book report data';
    return {
      success: false,
      message: errorMessage,
    };
  }
};

// ==== EXPORT DOCTOR ARRIVALS REPORT DATA ==== //
export const exportDoctorArrivalsReportData = async (
  query: DoctorArrivalsReportQuery
): Promise<{ success: boolean; data?: ExportDoctorArrivalsData[]; message?: string }> => {
  try {
    const result = await getDoctorArrivalsReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available'
      };
    }

    const mappedSessions: ExportDoctorArrivalsData[] = result.data.map((session: Session) => {
      const sessionDate = session.date instanceof Date ? session.date : new Date(session.date);
      const startDate = normalizeSessionTime(session.startTime as Date | number, sessionDate);
      const endDate = normalizeSessionTime(session.endTime as Date | number, sessionDate);
      const startTimeStr = moment(startDate).format('h:mm A');
      const endTimeStr = moment(endDate).format('h:mm A');
      
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

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logActivity({
        userId: session.user.id,
        action: 'reports.doctor-arrivals.exported',
        entityType: 'Report',
        importance: 'medium',
        metadata: { count: mappedSessions.length },
      });
    }
    return {
      success: true,
      data: mappedSessions
    };
  } catch (error: unknown) {
    console.error('exportDoctorArrivalsReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error exporting doctor arrivals report data';
    return {
      success: false,
      message: errorMessage
    };
  }
};
