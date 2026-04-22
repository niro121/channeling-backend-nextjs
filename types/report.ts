import { Doctor } from './doctor';
import { AgencyBook } from './agencybook';
import { Agency } from './agency';

export type DoctorReportQuery = {
  date?: Date | string;
  doctorName?: string;
  doctorCode?: string;
};

export type DoctorReportResponse = {
  success: boolean;
  data: Doctor[];
  totalRecords: number;
  message?: string;
};

export type ChannelAgentReferenceBookReportQuery = {
  fromDate: string;
  toDate: string;
  agencyId?: string;
  bookNumber?: string;
  createdBy?: string;
  updatedBy?: string;
  status?: string; // '__all__' | '1' | '0'
};

export type ChannelAgentReferenceBookReportResponse = {
  success: boolean;
  data: AgencyBook[];
  totalRecords: number;
  message?: string;
};

// Export types for mapped data
export type ExportDoctorData = {
  code: string;
  name: string;
  registrationNumber: string;
  updatedBy: string;
  updatedDate: string;
  createdBy: string;
  createdDate: string;
  published: string;
};

export type ExportChannelAgentReferenceBookData = {
  sNo: number;
  agent: string;
  bookNumber: string;
  utilizedPageCount: string;
  startingReferenceNumber: string;
  endingReferenceNumber: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  active: string;
};

// Agent Detail Report Types
export type AgentDetailReportQuery = {
  fromDate?: string;
  toDate?: string;
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
  status?: string; // '0' | '1' | '__all__'
};

export type AgentDetailReportResponse = {
  success: boolean;
  data: Agency[];
  totalRecords: number;
  message?: string;
};

export type ExportAgentDetailData = {
  created: string;
  agentCode: string;
  agentName: string;
  status: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  contactPerson: string;
  contactPhone: string;
  contactPersonEmail: string;
  allowedCreditLimit: string;
  maxCreditLimit: string;
  standardCreditLimit: string;
  balance: string;
};

// User Activity Report Types
export type UserActivityReportQuery = {
  userId?: string; // __all__ or specific id
  action?: string; // __all__ or specific action string
  dateFrom: string;
  dateTo: string;
};

export type UserActivityReportResponse = {
  success: boolean;
  data: Array<{
    id: string;
    userId: string;
    userName: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    metadata: Record<string, unknown> | null;
    ipAddress: string | null;
    importance: string | null;
    createdAt: Date;
  }>;
  totalReturned: number;
  hasMore: boolean;
  message?: string;
};

export type ExportUserActivityData = {
  createdAt: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  importance: string;
};

// Nurse View Report Types
export type NurseViewReportQuery = {
  sessionId: string;
};

export type NurseViewSessionData = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: {
    id: string;
    name: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  doctor?: {
    id: string;
    title: string;
    name: string;
  } | null;
  bookings: NurseViewBookingData[];
};

export type NurseViewBookingData = {
  id: string;
  appointmentNo: number;
  title: string;
  name: string;
  status: number;
  remarks: string;
  area: string;
  agencyRef: string | null;
  staffId: string | null;
  agencyId: string | null;
  creditCustomerId?: string | null;
  staff?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  agency?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
  creditCustomer?: {
    id: string;
    name: string;
    code?: string | null;
  } | null;
};

export type NurseViewReportResponse = {
  success: boolean;
  data: NurseViewSessionData | null;
  totalRecords: number;
  message?: string;
};

// Doctor View Report Types
export type DoctorViewReportQuery = {
  sessionId: string;
};

export type DoctorViewSessionData = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  doctor?: {
    id: string;
    title: string;
    name: string;
  } | null;
  bookings: DoctorViewBookingData[];
};

export type DoctorViewBookingData = {
  id: string;
  appointmentNo: number;
  title: string;
  name: string;
  status: number;
  receiptNoString: string | null;
  agencyRef: string | null;
  staffId: string | null;
  agencyId: string | null;
  professionalFee: number;
  amount: number;
  refund: number;
  staff?: {
    id: string;
    name: string;
  } | null;
  agency?: {
    id: string;
    name: string;
  } | null;
  creditCustomerId?: string | null;
  creditCustomer?: { id: string; name: string } | null;
  refundReceiptCreatedAt?: Date | null;
};

export type DoctorViewReportResponse = {
  success: boolean;
  data: DoctorViewSessionData | null;
  totalRecords: number;
  message?: string;
};

// Phone View Report Types
export type PhoneViewReportQuery = {
  sessionId: string;
};

export type PhoneViewSessionData = {
  id: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  location?: {
    id: string;
    name: string;
    address?: string | null;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  doctor?: {
    id: string;
    title: string;
    name: string;
  } | null;
  bookings: PhoneViewBookingData[];
};

export type PhoneViewBookingData = {
  id: string;
  appointmentNo: number;
  bookingId: string;
  title: string;
  name: string;
  phone: string;
  status: number;
  refund: number;
  refundReceiptCreatedAt?: Date | null;
};

export type PhoneViewReportResponse = {
  success: boolean;
  data: PhoneViewSessionData | null;
  totalRecords: number;
  message?: string;
};

export type ExportPhoneViewData = {
  appNo: string;
  bookingId: string;
  patientName: string;
  phoneNo: string;
  time: string;
  presentAbsent: string;
};

// All Doctor View Report Types
export type AllDoctorViewReportQuery = {
  date: string;
  sessionType?: string; // '__all__', 'morning', 'evening'
  feeType?: string; // '__all__', 'hospital', 'professional', 'total'
  locationId?: string; // '__all__' or location ID
};

export type AllDoctorViewRowData = {
  no: number;
  consultantId: string;
  consultantName: string;
  consultantCode: string;
  notPaid: number;
  paid: number;
  cancel: number;
  hosRefund: number;
  proRefund: number;
  hosValid: number;
  proValid: number;
  nettValid: number;
  total: number;
  doctorSessionTimes: string[];
};

export type AllDoctorViewTotals = {
  no: number;
  notPaid: number;
  paid: number;
  cancel: number;
  hosRefund: number;
  proRefund: number;
  hosValid: number;
  proValid: number;
  nettValid: number;
  total: number;
};

export type AllDoctorViewReportResponse = {
  success: boolean;
  data: AllDoctorViewRowData[];
  totals: AllDoctorViewTotals | null;
  totalRecords: number;
  message?: string;
};

export type ExportAllDoctorViewData = {
  no: string;
  consultant: string;
  notPaid: string;
  paid: string;
  cancel: string;
  hosRefund: string;
  proRefund: string;
  hosValid: string;
  proValid: string;
  nettValid: string;
  total: string;
  doctorSessionTime: string;
};

// Cashier Summary (Userwise Cashier Detail - Channel) Report Types
export type CashierSummaryReportQuery = {
  userId?: string; // __all__ or specific user id
  dateFrom: string;
  dateTo: string;
  format: 'summary' | 'detail';
};

export type CashierSummaryPaymentAmounts = {
  cash: number;
  creditCard: number;
  slip: number;
  cheque: number;
  agent: number;
  agentCredit: number;
  eWallet: number;
};

export type CashierSummaryReportLineItem = {
  txCreated: Date;
  shiftLabel: string | null;
  sessionDateTime: string | null;
  billId: string | null;
  receiptId: string;
  patient: string | null;
  consultant: string | null;
  name?: string | null; // for Income/Expense
  type?: string | null; // for Income/Expense: "Income" | "Expense"
} & CashierSummaryPaymentAmounts;

export type CashierSummaryReportSection = {
  key: string;
  title: string;
  rows: CashierSummaryReportLineItem[];
  totals: CashierSummaryPaymentAmounts;
};

export type CashierSummaryIncludedShift = {
  id: string;
  userName: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

export type CashierSummaryReportResponse = {
  success: boolean;
  sections: CashierSummaryReportSection[];
  grandTotals: CashierSummaryPaymentAmounts;
  includedShifts: CashierSummaryIncludedShift[];
  message?: string;
};

// All Cashier Summary and Detail Report Types
export type AllCashierSummaryDetailReportQuery = {
  userId?: string; // __all__ or specific user id
  locationId?: string; // __all__ or specific branch/location id
  dateFrom: string;
  dateTo: string;
  format: 'summary' | 'detail';
};

export type AllCashierUserSummaryRow = {
  userId: string;
  userName: string;
  receiptCount: number;
} & CashierSummaryPaymentAmounts;

export type AllCashierUserDetailSection = {
  key: string;
  title: string;
  receiptCount: number;
  totals: CashierSummaryPaymentAmounts;
};

export type AllCashierUserDetailRow = {
  userId: string;
  userName: string;
  receiptCount: number;
  totals: CashierSummaryPaymentAmounts;
  sections: AllCashierUserDetailSection[];
};

export type AllCashierSummaryDetailReportResponse = {
  success: boolean;
  summaryRows: AllCashierUserSummaryRow[];
  detailRows: AllCashierUserDetailRow[];
  grandTotals: CashierSummaryPaymentAmounts;
  totalReceipts: number;
  message?: string;
};

// Consultant Payments Report Types
export type ConsultantPaymentsReportQuery = {
  fromDateTime?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  toDateTime?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  specialityId?: string;
  doctorId?: string;
  status?: string; // '__all__' | '0' | '1' (0 = Due Pay, 1 = Paid)
  sessionType?: string; // '__all__' | 'morning' | 'evening'
};

export type ConsultantPaymentsReportRow = {
  id: string;
  sNo: number;
  branch: string;
  consultant: string;
  consultantCode: string;
  paymentReceipt: string;
  channelReceipt: string;
  consultationSession: string;
  patientName: string;
  modeOfPay: string;
  consultationCharge: number;
  discountAmount: number;
  netAmount: number;
  paymentStatus: string;
  paidBy: string;
  paidDate: Date | null;
  handedBy: string;
};

export type ConsultantPaymentsReportTotals = {
  totalAmount: number;
  totalDiscount: number;
  netAmount: number;
};

export type ConsultantPaymentsReportExportRow = {
  sNo: string;
  branch: string;
  consultant: string;
  consultantCode: string;
  paymentReceipt: string;
  channelReceipt: string;
  consultationSession: string;
  patientName: string;
  modeOfPay: string;
  discountAmount: string;
  netAmount: string;
  paymentStatus: string;
  paidBy: string;
  paidDate: string;
  handedBy: string;
};

// Withholding Tax Report Types
export type WithholdingTaxReportQuery = {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  doctorId?: string; // '__all__' | doctor id
  locationId?: string; // '__all__' | location id
  reportType?: 'detail' | 'summary';
};

export type WithholdingTaxReportRow = {
  id: string;
  sNo: number;
  docDate: Date | null;
  docNo: string;
  consultant: string;
  speciality: string;
  remarks: string;
  totalAmt: number;
  taxPercent: number;
  holdingTax: number;
  netAmt: number;
};

export type WithholdingTaxReportExportRow = {
  sNo: string;
  docDate: string;
  docNo: string;
  consultant: string;
  speciality: string;
  remarks: string;
  totalAmt: string;
  taxPercent: string;
  holdingTax: string;
  netAmt: string;
};