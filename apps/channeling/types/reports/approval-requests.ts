export type ApprovalRequestsReportQuery = {
  /** YYYY-MM-DD */
  dateFrom: string;
  /** YYYY-MM-DD */
  dateTo: string;
  /** 'requested' | 'decided' */
  dateField?: string;
  /** '__all__' | 'channel_cancel' | 'channel_refund' | 'bank_deposit' */
  type?: string;
  /** '__all__' | 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'completed' */
  status?: string;
  /** '__all__' or User.id */
  requestedById?: string;
  /** '__all__' or User.id — matches approvedBy or rejectedBy */
  decidedById?: string;
};

export type ApprovalRequestsReportRow = {
  id: string;
  type: string;
  typeLabel: string;
  status: number;
  statusLabel: string;
  channelType: string;
  paymentMode: string;
  details: string;
  detailsSub: string;
  amount: number;
  requestedByName: string;
  requestedAt: Date;
  withdrawnAt: Date | null;
  approvedByName: string | null;
  approvedAt: Date | null;
  rejectedByName: string | null;
  rejectedAt: Date | null;
  remarks: string;
  rejectReason: string | null;
};

export type ApprovalRequestsReportExportRow = {
  no: string;
  requestedAt: string;
  type: string;
  channelType: string;
  paymentMode: string;
  details: string;
  amount: string;
  requestedBy: string;
  status: string;
  approvedBy: string;
  approvedAt: string;
  rejectedBy: string;
  rejectedAt: string;
  withdrawnAt: string;
  remarks: string;
  rejectReason: string;
};
