export type NoShowPatientReportType = 'by_date' | 'by_month';

export type NoShowPatientReportQuery = {
  fromDate?: string;
  toDate?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  specialityId?: string;
  doctorId?: string;
  reportType?: NoShowPatientReportType;
};

export type NoShowPatientReportRow = {
  rowId: string;
  speciality: string;
  doctorName: string;
  periodCounts: Record<string, number>;
  total: number;
};

export type NoShowPatientReportResult = {
  success: boolean;
  data?: NoShowPatientReportRow[];
  periodKeys?: string[];
  periodLabels?: Record<string, string>;
  columnTotals?: Record<string, number>;
  grandTotal?: number;
  totalRecords?: number;
  message?: string;
};

export type NoShowPatientReportExportRow = {
  speciality: string;
  doctorName: string;
  total: string;
  [key: string]: string;
};

export type NoShowPatientReportContentProps = {
  currentUserName: string;
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};
