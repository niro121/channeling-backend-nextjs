/** Doctor leave record as stored (fromDate/toDate as YYYYMMDD number) */
export type DoctorLeave = {
  id: string;
  fromDate: number;
  toDate: number;
  remarks: string | null;
  cancelRemarks: string | null;
  sessions?: unknown;
  sendSms: number | null;
  status: number; // 0 = CANCEL, 1 = ACTIVE
  doctorId: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Doctor summary included in list responses */
export type DoctorLeaveDoctorRef = {
  id: string;
  name: string;
  code: string;
};

/** Doctor leave list item (API/list view with doctor included) */
export type DoctorLeaveListItem = Omit<DoctorLeave, 'doctorId'> & {
  doctor: DoctorLeaveDoctorRef;
};

/** Query params for fetching doctor leaves */
export type GetDoctorLeavesParams = {
  page?: string;
  limit?: string;
  doctorId: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
};

export type GetDoctorLeavesQuery = {
  page: number;
  limit: number;
  doctorId: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string;   // YYYY-MM-DD
};

/** Filter option for combos (e.g. doctor select) */
export type DoctorLeaveFilterOption = {
  id: string;
  name: string;
};

export type GetActiveSession = {
  doctorId: string
  fromDate: string
  toDate: string
}
