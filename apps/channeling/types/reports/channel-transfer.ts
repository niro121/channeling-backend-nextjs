export type ChannelTransferReportQuery = {
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateFrom: string;
  /** YYYY-MM-DD or YYYY-MM-DDTHH:mm */
  dateTo: string;
  /** '__all__' or location id */
  branchId?: string;
  /** '__all__' or speciality id */
  fromSpecialityId?: string;
  /** '__all__' or speciality id */
  toSpecialityId?: string;
  /** '__all__' or doctor id */
  fromDoctorId?: string;
  /** '__all__' or doctor id */
  toDoctorId?: string;
  /** '__all__' or user id */
  transferredByUserId?: string;
  /** '__all__' or session id */
  fromSessionId?: string;
  /** '__all__' or session id */
  toSessionId?: string;
  /** Optional booking reference (ObjectId, bookingid_string, receiptNoString, or appointmentNo) */
  bookingId?: string;
};

export type ChannelTransferReportRow = {
  id: string; // activity log id
  transferredAt: Date;
  transferredByUserId: string;
  transferredByUserName: string | null;

  bookingId: string;
  bookingDisplayId: string | null;

  fromSessionId: string | null;
  fromDoctorId: string | null;
  fromSpecialityId: string | null;
  beforeActivity: string | null;

  toSessionId: string | null;
  toDoctorId: string | null;
  toSpecialityId: string | null;
  afterActivity: string | null;
  branchId: string | null;

  remarks: string | null;
  metadata: Record<string, unknown> | null;
};

export type ChannelTransferReportExportRow = {
  transferredAt: string;
  transferredBy: string;
  bookingId: string;

  beforeActivity: string;

  afterActivity: string;

  remarks: string;
  action: string;
};

