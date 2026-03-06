import { Doctor } from './doctor';
import { Session } from './booking.dashboard';
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

export type DoctorArrivalsReportQuery = {
  doctorId?: string;
  locationId?: string;
  fromDate: Date | string;
  toDate: Date | string;
};

export type DoctorArrivalsReportResponse = {
  success: boolean;
  data: Session[];
  totalRecords: number;
  message?: string;
};

export type ChannelAgentReferenceBookReportQuery = {
  fromDate: string;
  toDate: string;
  agencyId?: string;
  bookNumber?: string;
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

export type ExportDoctorArrivalsData = {
  consultantName: string;
  roomAllocatedBy: string;
  sessionDate: string;
  sessionTime: string;
  sessionStatus: string;
  arrivalTime: string;
  departureTime: string;
  roomReleaseBy: string;
  roomNumber: string;
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
  fromDate: string;
  toDate: string;
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
  balance: string;
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
  staff?: {
    id: string;
    name: string;
  } | null;
  agency?: {
    id: string;
    name: string;
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
  sessionType?: string; // '__all__', 'morning', 'afternoon', 'evening', or hour number
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