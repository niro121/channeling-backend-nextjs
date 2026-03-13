export type DoctorLeaveReportRow = {
  id: string;
  fromDate: Date;
  toDate: Date;
  status: number;
  remarks: string | null;
  doctor: { id: string; name: string; code: string };
  leaveSessionsFormatted?: string;
  createdUser?: { id: string; name: string } | null;
  updatedUser?: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Report query params for doctor leave report */
export type DoctorLeaveReportQuery = {
  fromDateTime?: string; // YYYY-MM-DD or YYYY-MM-DDTHH:mm
  toDateTime?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  specialityId?: string;
  doctorId?: string;
};

export type DoctorLeaveReportExportRow = {
  doctorCode: string;
  doctorName: string;
  leaveDate: string;
  leaveSessions: string;
  leaveRemark: string;
  leaveCreator: string;
  leaveCreatorAt: string;
  leaveUpdator: string;
  leaveUpdatorAt: string;
  status: string;
};

export type DoctorLeaveReportContentProps = {
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};