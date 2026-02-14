'use server';

import { getAgentDetailReportDataService } from '@/services/reports/agent-detail.service';
import { 
  AgentDetailReportQuery, 
  AgentDetailReportResponse,
  ExportAgentDetailData
} from '@/types/report';
import { requirePermission } from '@/lib/server-permissions';
import { Agency } from '@/types/agency';
import moment from 'moment';

// ==== GET AGENT DETAIL REPORT DATA ==== //
export const getAgentDetailReportData = async (
  query: AgentDetailReportQuery
): Promise<AgentDetailReportResponse> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentDetailReportDataService(query);
    return {
      success: true,
      data: result.data,
      totalRecords: result.totalRecords,
    };
  } catch (error: unknown) {
    console.error('getAgentDetailReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error getting agent detail report data';
    return {
      success: false,
      data: [],
      totalRecords: 0,
      message: errorMessage,
    };
  }
};

// ==== EXPORT AGENT DETAIL REPORT DATA ==== //
export const exportAgentDetailReportData = async (
  query: AgentDetailReportQuery
): Promise<{ success: boolean; data?: ExportAgentDetailData[]; message?: string }> => {
  await requirePermission('reports', 'view');
  try {
    const result = await getAgentDetailReportDataService(query);

    if (!result.success || !result.data?.length) {
      return {
        success: false,
        message: 'No data available',
      };
    }

    const mappedAgencies: ExportAgentDetailData[] = result.data.map((agency: Agency) => {
      const createdDate = agency.createdAt 
        ? (agency.createdAt instanceof Date ? agency.createdAt : new Date(agency.createdAt))
        : new Date();

      // Build address string
      const addressParts = [
        agency.addressLine1,
        agency.addressLine2,
        agency.city
      ].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : '-';

      return {
        created: moment(createdDate).format('YYYY-MM-DD hh:mm A'),
        agentCode: agency.code?.toUpperCase() || '-',
        agentName: agency.name.toUpperCase(),
        status: agency.status === 1 ? 'Active' : 'Inactive',
        address: address,
        phone: agency.phone || '-',
        fax: agency.fax || '-',
        email: agency.email || '-',
        contactPerson: agency.contactPersonName || '-',
        contactPhone: agency.contactPersonPhone || '-',
        contactPersonEmail: agency.contactPersonEmail || '-',
        standardCreditLimit: agency.creditLimit?.toFixed(2) || '0.00',
        allowedCreditLimit: agency.allowedCreditLimit?.toFixed(2) || '0.00',
        allowedMaximinCreditLimit: agency.maxCreditLimit?.toFixed(2) || '0.00',
        balance: agency.balance?.toFixed(2) || '0.00',
      };
    });

    return {
      success: true,
      data: mappedAgencies,
    };
  } catch (error: unknown) {
    console.error('exportAgentDetailReportData error', error);
    const errorMessage = error instanceof Error ? error.message : 'Error exporting agent detail report data';
    return {
      success: false,
      message: errorMessage,
    };
  }
};
