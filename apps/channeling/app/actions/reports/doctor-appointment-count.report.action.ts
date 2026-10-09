'use server';

import { requireReport } from '@/lib/server-permissions';
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
  await requireReport('doctor-appointment-count');
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
  await requireReport('doctor-appointment-count');
  try {
    const res = await getDoctorAppointmentCountReportService(query);
    if (!res.success || !res.data?.length) {
      return { success: false, message: res.message ?? 'No data available' };
    }
    const data: DoctorAppointmentCountReportExportRow[] = res.data.map((r) => ({
      consultant: r.consultant,
      speciality: r.speciality,
      notPaid: r.notPaid,
      paid: r.paid,
      cancel: r.cancel,
      hosRefund: r.hosRefund,
      proRefund: r.proRefund,
      hosValid: r.hosValid,
      proValid: r.proValid,
      nettValid: r.nettValid,
      hos: r.hos,
      pro: r.pro,
      total: r.total,
    }));
    return { success: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to export doctor appointment count report';
    return { success: false, message: msg };
  }
}
