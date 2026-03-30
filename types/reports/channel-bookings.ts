/**
 * Channel Bookings report types.
 * Table columns will be added when provided by the user.
 */

/** Report query params for channel bookings report */
export type ChannelBookingsReportQuery = {
  fromDateTime?: string;
  toDateTime?: string;
  dateType?: string; // 'session_date' | 'transaction_date'
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  branchTypeId?: string;
  specialityId?: string;
  doctorId?: string;
  status?: string; // '__all__' | '0' | '1' | '2' | '3' (Pending, Paid, Cancel, Refund)
  refundStatus?: string; // '__all__' | 'no_refund' | 'any_refund' | 'hospital_only' | 'professional_only' | 'full_only'
  areaId?: string;
  agencyId?: string;
  patientPhone?: string;
  gender?: string; // '__all__' | 'male' | 'female'
  paymentTypeId?: string;
  methodId?: string;
};

/** Row shape for channel bookings report - extend with actual columns when provided */
export type ChannelBookingsReportRow = {
  id: string;
  [key: string]: unknown;
};

/** Export row shape - flat structure for PDF/Excel */
export type ChannelBookingsReportExportRow = {
  [key: string]: string | number | undefined;
};

export type ChannelBookingsReportContentProps = {
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  branchTypeOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
  statusOptions: Array<{ id: string; name: string }>;
  refundStatusOptions: Array<{ id: string; name: string }>;
  dateTypeOptions: Array<{ id: string; name: string }>;
  areaOptions: Array<{ id: string; name: string }>;
  agencyOptions: Array<{ id: string; name: string }>;
  genderOptions: Array<{ id: string; name: string }>;
  paymentTypeOptions: Array<{ id: string; name: string }>;
  methodOptions: Array<{ id: string; name: string }>;
};

export const STATUS_OPTIONS = [
  // { id: '__all__', name: 'All' },
  { id: '1', name: 'Paid' },
  { id: '0', name: 'Pending' },
  { id: '2', name: 'Cancel' },
  { id: '3', name: 'Refund' },
];

export const REFUND_STATUS_OPTIONS = [
  // { id: '__all__', name: 'All' },
  { id: 'no_refund', name: 'No Refund' },
  { id: 'any_refund', name: 'Any Refund' },
  { id: 'hospital_only', name: 'Hospital fee Refund Only' },
  { id: 'professional_only', name: 'Professional fee Refund Only' },
  { id: 'full_only', name: 'Full Refund Only' },
];

export const DATE_TYPE_OPTIONS = [
  { id: 'session_date', name: 'Session Date' },
  { id: 'transaction_date', name: 'Transaction Date' },
];
