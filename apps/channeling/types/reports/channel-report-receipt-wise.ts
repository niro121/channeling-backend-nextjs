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
  { id: 'channel_payment', name: 'Channel Payment' },
  { id: 'channel_refund', name: 'Channel Refund' },
  { id: 'agent_ledger', name: 'Agent Ledger (Deposit/Withdraw/Notes)' },
  { id: 'agent_deposit', name: 'Agent Deposit' },
  { id: 'agent_withdraw', name: 'Agent Withdraw' },
  { id: 'bank_ledger', name: 'Bank Ledger (Deposit/Withdraw)' },
  { id: 'bank_deposit', name: 'Bank Deposit' },
  { id: 'bank_withdraw', name: 'Bank Withdraw' },
  { id: 'doctor_payments', name: 'Doctor Ledger (Payment/Cancel)' },
  { id: 'doctor_payment', name: 'Doctor Payment' },
  { id: 'doctor_cancel', name: 'Doctor Cancel' },
  { id: 'branch_ledger', name: 'Branch Ledger (Income/Expense)' },
  { id: 'branch_income', name: 'Branch Income' },
  { id: 'branch_expense', name: 'Branch Expense' },
];

export type ChannelReportReceiptWiseContentProps = {
  currentUserName: string;
};
