export type DpayDoctorBalanceReportQuery = {
  /** YYYY-MM-DD; balance is taken at end of this day. */
  asOfDate: string;
  /** '__all__' or doctor id */
  doctorId?: string;
  /** '__all__' or speciality id */
  specialityId?: string;
  /** '__all__' | '1' | '0' */
  status?: string;
};

export type DpayDoctorBalanceReportRow = {
  id: string;
  status: number;
  doctorCode: string;
  doctorName: string;
  speciality: string;
  doctorPhoneNo: string;
  accountCode: string;
  /** DPAY-DOC payable balance in rupees, as of the selected date. */
  doctorBalance: number;
  /** Same as the query as-of date, so the statement link can open that month. */
  asOfDate: string;
};

export type DpayDoctorBalanceReportExportRow = {
  no: string;
  status: string;
  doctorCode: string;
  doctorName: string;
  speciality: string;
  doctorPhoneNo: string;
  accountCode: string;
  doctorBalance: number;
};
