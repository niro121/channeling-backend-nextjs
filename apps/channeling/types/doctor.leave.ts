export type Session = {
  id: string;
  date: Date;
  location: string;
  startTime: string;
  endTime: string;
  /** Set when mapping from API; used for “session already started” UI. */
  startAt?: Date;
};

type Doctor = {
  id: string
  name: string
  code: string
}

/** Doctor leave record as stored (fromDate/toDate as YYYYMMDD) */
export type DoctorLeave = {
  id?: string;
  fromDate: Date;
  toDate: Date;
  remarks: string | null;
  sessions?: Session[];
  sendSms: boolean;
  status: number; // 0 = leave active (on leave), 1 = leave cancelled (matches Prisma DoctorLeave.status)
  doctor: Doctor
  doctorId: string;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DoctorLeaveFormProps = {
  fromDate: Date;
  toDate: Date;
  remarks: string | null;
  sesssions: Session[];
  sendSms: boolean;
  status: number; // 0 = leave active (on leave), 1 = leave cancelled (matches Prisma DoctorLeave.status)
  doctorId: string;
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
  toDate?: string; // YYYY-MM-DD
};

export type GetDoctorLeavesQuery = {
  page: number;
  limit: number;
  doctorId: string;
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
};

/** Filter option for combos (e.g. doctor select) */
export type DoctorLeaveFilterOption = {
  id: string;
  name: string;
};

export type GetActiveSession = {
  doctorId: string;
  fromDate: string;
  toDate: string;
};

/** Params for fetching session IDs already used by other leaves (to disallow double-booking) */
export type GetLockedSessionIdsParams = {
  doctorId: string;
  /** When editing, exclude this leave so its own sessions are not considered "locked" */
  excludeLeaveId?: string | null;
};
