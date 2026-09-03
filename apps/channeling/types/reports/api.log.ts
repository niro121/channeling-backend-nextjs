export type ApiLogReportRow = {
  id: string;
  createdAt: Date;
  duration?: number | null; // Duration in seconds
  endpoint: string;
  uuid?: string | null;
  errorStatus: boolean | string | null;
  requestBody?: string | null;
  responseBody?: string | null;
};

/** Report query params for API log report */
export type ApiLogReportQuery = {
  fromDateTime?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  toDateTime?: string;
  uuid?: string; // Search by UUID
};

export type ApiLogReportExportRow = {
  id: string;
  dateTime: string;
  duration: string;
  api: string;
  uuid: string;
  errorStatus: string;
  body: string;
};

export type ApiLogReportContentProps = Record<string, never>;
