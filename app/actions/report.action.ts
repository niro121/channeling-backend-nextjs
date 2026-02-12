'use server';

import { getDoctorReportDataService, getChannelAgentReferenceBookReportDataService } from '@/services/report.service';
import { DoctorReportQuery, DoctorReportResponse, ChannelAgentReferenceBookReportQuery, ChannelAgentReferenceBookReportResponse } from '@/types/report';
import { requirePermission } from '@/lib/server-permissions';
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

// ==== GET CHANNEL AGENT REFERENCE BOOK REPORT DATA ==== //
export const getChannelAgentReferenceBookReportData = async (
  query: ChannelAgentReferenceBookReportQuery
): Promise<ChannelAgentReferenceBookReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelAgentReferenceBookReportDataService(query);
    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords,
    };
  } catch (error: any) {
    console.error('getChannelAgentReferenceBookReportData error', error);
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: error.message || 'Error getting channel agent reference book report data',
    };
  }
};

// ==== EXPORT CHANNEL AGENT REFERENCE BOOK REPORT DATA ==== //
export const exportChannelAgentReferenceBookReportData = async (
  query: ChannelAgentReferenceBookReportQuery
): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getChannelAgentReferenceBookReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    const formatUserName = (user: { name: string; code: string | null } | null): string => {
      if (!user) return '-';
      const name = user.name ? user.name.toUpperCase() : '';
      const code = user.code ? `(${user.code})` : '';
      return code ? `${name} ${code}` : name;
    };

    const mappedBooks = result.data.map((book, index) => {
      const createdDate = book.createdAt instanceof Date ? book.createdAt : new Date(book.createdAt);
      const updatedDate = book.updatedAt instanceof Date ? book.updatedAt : new Date(book.updatedAt);

      return {
        sNo: index + 1,
        agent: book.agency?.name?.toUpperCase() || '-',
        bookNumber: book.bookNumber?.toUpperCase() || '-',
        utilizedPageCount: '', // Empty as per requirement
        startingReferenceNumber: book.startNumber || '-',
        endingReferenceNumber: book.endNumber || '-',
        createdBy: formatUserName(book.createdUser),
        createdDate: moment(createdDate).format('YYYY-MM-DD hh:mm A'),
        updatedBy: book.updatedBy ? formatUserName(book.updatedUser) : '-',
        updatedDate: book.updatedBy ? moment(updatedDate).format('YYYY-MM-DD hh:mm A') : '-',
        active: book.status === 1 ? 'Active' : 'Inactive',
      };
    });

    return {
      success: true,
      data: mappedBooks,
    };
  } catch (error: any) {
    console.error('exportChannelAgentReferenceBookReportData error', error);
    return {
      success: false,
      message: error.message || 'Error exporting channel agent reference book report data',
    };
  }
};
