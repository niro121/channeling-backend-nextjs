export type ChannelReportReceiptWiseQuery = {
  fromDateTime?: string;
  toDateTime?: string;
  receiptNo?: string;
  receiptScope?: string; // '__all__' | 'channel' | 'other'
  receiptCategory?: string; // '__all__' | 'channel_txn' | 'agent_deposit' | 'bank_deposit' | ...
};

export type ChannelReportReceiptWiseRow = {
  id: string;
  receiptScope: string;
  receiptNo: string;
  receiptDate: Date;
  receiptMethod: string;
  transactionType: string;
  receiptAmount: number;
  bookingNo: string;
  appointmentNo: string;
  sessionDate: Date | null;
  sessionTime: string;
  consultant: string;
  patientName: string;
  bookingStatus: string;
  agency: string;
  creditCustomer: string;
  creator: string;
};

export type ChannelReportReceiptWiseExportRow = {
  receiptScope: string;
  receiptNo: string;
  receiptDate: string;
  receiptMethod: string;
  transactionType: string;
  receiptAmount: string;
  bookingNo: string;
  appointmentNo: string;
  sessionDate: string;
  sessionTime: string;
  consultant: string;
  patientName: string;
  bookingStatus: string;
  agency: string;
  creditCustomer: string;
  creator: string;
};

export const RECEIPT_SCOPE_OPTIONS = [
  { id: '__all__', name: 'All Receipts' },
  { id: 'channel', name: 'Channel Receipts' },
  { id: 'other', name: 'Other Receipts' },
];

export const RECEIPT_CATEGORY_OPTIONS = [
  { id: '__all__', name: 'All Categories' },
  { id: 'channel_txn', name: 'Channel (Payment/Refund)' },
  { id: 'agent_ledger', name: 'Agent Ledger (Deposit/Withdraw/Notes)' },
  { id: 'bank_ledger', name: 'Bank Ledger (Deposit/Withdraw)' },
  { id: 'doctor_payments', name: 'Doctor Payments' },
  { id: 'branch_ledger', name: 'Branch Ledger (Income/Expense)' },
];

export type ChannelReportReceiptWiseContentProps = {
  currentUserName: string;
};
