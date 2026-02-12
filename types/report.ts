import { Doctor } from './doctor';
import { Session } from './booking.dashboard';
import { AgencyBook } from './agencybook';

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