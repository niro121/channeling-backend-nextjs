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
  standardCreditLimit: string;
  allowedCreditLimit: string;
  allowedMaximinCreditLimit: string;
  balance: string;
};