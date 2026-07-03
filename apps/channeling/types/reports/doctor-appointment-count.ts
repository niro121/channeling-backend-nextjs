export type DoctorAppointmentCountReportQuery = {
  fromDateTime?: string;
  toDateTime?: string;
  locationId?: string;
  specialityId?: string;
  doctorId?: string;
  bookingType?: string; // __all__ | scan
  groupBy?: string; // __none__ | speciality
  sessionType?: string; // __all__ | morning | evening
};

export type DoctorAppointmentCountReportRow = {
  rowId: string;
  consultant: string;
  speciality: string;
  notPaid: number;
  paid: number;
  cancel: number;
  hosRefund: number;
  proRefund: number;
  hosValid: number;
  proValid: number;
  nettValid: number;
  hos: number;
  pro: number;
  total: number;
};

export type DoctorAppointmentCountReportTotals = {
  notPaid: number;
  paid: number;
  cancel: number;
  hosRefund: number;
  proRefund: number;
  hosValid: number;
  proValid: number;
  nettValid: number;
  hos: number;
  pro: number;
  total: number;
};

export type DoctorAppointmentCountReportExportRow = {
  consultant: string;
  speciality: string;
  notPaid: string;
  paid: string;
  cancel: string;
  hosRefund: string;
  proRefund: string;
  hosValid: string;
  proValid: string;
  nettValid: string;
  hos: string;
  pro: string;
  total: string;
};

export type DoctorAppointmentCountReportContentProps = {
  locationOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};
