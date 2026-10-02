export type SmsReportStatusFilter = 'all' | 'sent' | 'failed';

export type SmsReportQuery = {
  fromDateTime?: string; // YYYY-MM-DDTHH:mm
  toDateTime?: string; // YYYY-MM-DDTHH:mm
  status?: SmsReportStatusFilter;
  /** Branch (location) id, or `__all__` / omitted for all. Without a `locationId` on `SmsLog`, filtering matches `template` text against the location (name, city, code, `Branch:`-style lines). */
  locationId?: string;
  /** Substring match on `phone` (case-insensitive). */
  phoneNo?: string;
};

export type SmsReportsContentProps = {
  currentUserName: string;
  locationOptions: Array<{ id: string; name: string }>;
};

export type SmsReportRow = {
  id: string;
  createdAt: Date;
  status: number; // 0 = Sent, 1 = Failed
  name: string;
  phone: string;
  template: string;
  count: number; // 1 for sent, 0 for failed
};

export type SmsReportExportRow = {
  dateTime: string;
  status: string;
  source: string;
  phone: string;
  message: string;
  count: string;
};
