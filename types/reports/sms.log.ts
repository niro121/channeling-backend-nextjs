export type SmsLogReportRow = {
  id: string;
  name: string; // "SMS Sent" or "SMS Failure"
  phone: string; // Phone number(s) can be comma separated
  template: string; // SMS message content
  createdAt: Date;
  status: number; // 0 = Sent, 1 = Failure
  count: number; // 1 for Sent (status=0), 0 for Failure (status=1)
};

/** Report query params for SMS log report */
export type SmsLogReportQuery = {
  fromDateTime?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  toDateTime?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  reportType?: string; // 'all', 'sent', 'fail'
  phoneNo?: string;
};

export type SmsLogReportExportRow = {
  name: string;
  phone: string;
  template: string;
  createdDate: string;
  status: string;
  count: string;
};

export type SmsLogReportContentProps = {
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
};
