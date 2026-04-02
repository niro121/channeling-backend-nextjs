export type ChannelTransferReportQuery = {
  /** YYYY-MM-DD */
  dateFrom: string;
  /** YYYY-MM-DD */
  dateTo: string;
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
  /** Optional exact booking id (ObjectId) */
  bookingId?: string;
};

export type ChannelTransferReportRow = {
  id: string; // activity log id
  transferredAt: Date;
  transferredByUserId: string;
  transferredByUserName: string | null;

  bookingId: string;

  fromSessionId: string | null;
  fromDoctorId: string | null;
  beforeActivity: string | null;

  toSessionId: string | null;
  toDoctorId: string | null;
  afterActivity: string | null;

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

