export type DoctorBalanceReportQuery = {
  /** YYYY-MM-DD; balance is taken at end of this day. */
  asOfDate: string;
  /** '__all__' or doctor id */
  doctorId?: string;
  /** '__all__' or speciality id */
  specialityId?: string;
  /** '__all__' | '1' | '0' */
  status?: string;
};

export type DoctorBalanceReportRow = {
  id: string;
  status: number;
  doctorCode: string;
  doctorName: string;
  speciality: string;
  doctorPhoneNo: string;
  doctorAddress: string;
  /** Linked PAYABLE account balance in rupees, as of the selected date. */
  doctorBalance: number;
};

export type DoctorBalanceReportExportRow = {
  no: string;
  status: string;
  doctorCode: string;
  doctorName: string;
  speciality: string;
  doctorPhoneNo: string;
  doctorAddress: string;
  doctorBalance: string;
};
