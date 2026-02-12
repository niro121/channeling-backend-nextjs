import { Doctor } from './doctor';
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
