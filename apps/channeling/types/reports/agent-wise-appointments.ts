export type AgentWiseAppointmentsReportType = 'summary' | 'detail';

export type AgentWiseAppointmentsReportQuery = {
  fromDateTime: string;
  toDateTime: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  agencyId?: string;
  reportType: AgentWiseAppointmentsReportType;
};

export type AgentWiseAppointmentsMonthColumn = {
  key: string;
  label: string;
};

export type AgentWiseAppointmentsSummaryRow = {
  agencyId: string;
  agentNameWithCode: string;
  agentCode: string;
  monthCounts: Record<string, number>;
  grandTotal: number;
};

export type AgentWiseAppointmentsDetailRow = {
  id: string;
  agentNameWithCode: string;
  agentRef: string;
  consultantNameWithCode: string;
  appointmentDateLabel: string;
  appointmentTimeLabel: string;
  appointmentNo: number;
  billNumber: string;
  statusLabel: string;
  patientName: string;
  patientPhone: string;
  creatorLabel: string;
  hospitalFee: number;
  doctorFee: number;
  discount: number;
  totalFee: number;
  /** For sorting / grouping */
  appointmentAtMs: number;
};

export type AgentWiseAppointmentsReportResult = {
  success: boolean;
  /** Present when success is false or for client toasts */
  message?: string;
  monthColumns: AgentWiseAppointmentsMonthColumn[];
  summaryRows: AgentWiseAppointmentsSummaryRow[];
  detailRows: AgentWiseAppointmentsDetailRow[];
  summaryMonthTotals: Record<string, number>;
  summaryGrandTotal: number;
  detailTotals: {
    hospitalFee: number;
    doctorFee: number;
    discount: number;
    totalFee: number;
  };
};
