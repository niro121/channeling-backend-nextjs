export type Fee = {
  id: string;
  name: string;
  feeType: string;
  localFee: number;
  foreignFee: number;
};

export interface SessionInputData {
  institution: number;
  date: string;
  doctorSessionId: string;
  previousDoctorSession: string | null;
  startTime: number;
  endTime: number;
  durationMinutes: number | null;
  startingPatientNumber: number;
  maxPatientNumber: number;
  refundable: number;
  fees: any;
  amountLocal: number | null;
  amountForeign: number | null;
  status: number // == 1: active, 0: leave == //;
  remarks: string;
  isScan: boolean;
  doctorId: string;
  departmentId: string | null;
  locationId: string | null;
  roomId: string | null;
}

export interface SessionFormValues {
  doctorId: string | null
  fromDate: Date
  toDate: Date
}