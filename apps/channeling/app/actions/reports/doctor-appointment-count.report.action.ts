'use server';

import { requirePermission } from '@/lib/server-permissions';
import { getDoctorAppointmentCountReportService } from '@/services/reports/doctor-appointment-count.report.service';
import type {
  DoctorAppointmentCountReportExportRow,
  DoctorAppointmentCountReportQuery,
  DoctorAppointmentCountReportRow,
  DoctorAppointmentCountReportTotals,
} from '@/types/reports/doctor-appointment-count';

export async function getDoctorAppointmentCountReportData(
  query: DoctorAppointmentCountReportQuery
): Promise<{
  success: boolean;
  data: DoctorAppointmentCountReportRow[];
  totals: DoctorAppointmentCountReportTotals | null;
  totalRecords: number;
  message?: string;
}> {
  await requirePermission('reports', 'view');
  try {
    const res = await getDoctorAppointmentCountReportService(query);
    return {
      success: res.success,
      data: res.data ?? [],
      totals: res.totals ?? null,
      totalRecords: res.totalRecords ?? 0,
      message: res.message,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch doctor appointment count report';
    return { success: false, data: [], totals: null, totalRecords: 0, message: msg };
  }
}

export async function exportDoctorAppointmentCountReportData(
  query: DoctorAppointmentCountReportQuery
): Promise<{ success: boolean; data?: DoctorAppointmentCountReportExportRow[]; message?: string }> {
  await requirePermission('reports', 'view');
  try {
    const res = await getDoctorAppointmentCountReportService(query);
    if (!res.success || !res.data?.length) {
      return { success: false, message: res.message ?? 'No data available' };
    }
    const data: DoctorAppointmentCountReportExportRow[] = res.data.map((r) => ({
      consultant: r.consultant,
      speciality: r.speciality,
      notPaid: String(r.notPaid),
      paid: String(r.paid),
      cancel: String(r.cancel),
      hosRefund: String(r.hosRefund),
      proRefund: String(r.proRefund),
      hosValid: String(r.hosValid),
      proValid: String(r.proValid),
      nettValid: String(r.nettValid),
      hos: r.hos.toFixed(2),
      pro: r.pro.toFixed(2),
      total: r.total.toFixed(2),
    }));
    return { success: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export doctor appointment count report';
    return { success: false, message: msg };
  }
}
