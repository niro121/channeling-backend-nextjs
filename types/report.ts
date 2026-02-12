import { Doctor } from './doctor';
import { Session } from './booking.dashboard';

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
