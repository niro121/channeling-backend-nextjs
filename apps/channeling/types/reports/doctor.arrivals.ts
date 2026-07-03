export type DoctorArrivalsReportQuery = {
  fromDateTime?: string;
  toDateTime?: string;
  institutionId?: string;
  locationId?: string;
  departmentId?: string;
  specialityId?: string;
  doctorId?: string;
};

export type DoctorArrivalsReportRow = {
  id: string;
  doctor: { id: string; code: string; name: string };
  doctorCode: string;
  doctorName: string;
  roomAllocatedBy: string;
  sessionDate: Date;
  sessionStartTime: Date;
  sessionEndTime: Date;
  sessionStatus: number;
  doctorArrivalDisplay: string;
  doctorDepartureDisplay: string;
  roomReleasedBy: string;
  roomNumber: string;
};

export type DoctorArrivalsReportExportRow = {
  doctorCode: string;
  doctorName: string;
  roomAllocatedBy: string;
  sessionDate: string;
  sessionStartTime: string;
  sessionStatus: string;
  doctorArrivalTime: string;
  doctorDepartureTime: string;
  roomReleasedBy: string;
  roomNumber: string;
};

export type DoctorArrivalsReportContentProps = {
  currentUserName: string;
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};
