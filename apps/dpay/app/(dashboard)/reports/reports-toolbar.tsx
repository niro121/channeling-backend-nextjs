'use client';

import { ExportWrapper } from '../export-wrapper';
import type {
  DoctorPaymentReportExportRow,
  ReceiptReportExportRow,
} from '@/types/reports';

const RECEIPT_EXPORT_COLUMNS = [
  'Receipt No',
  'Patient Name',
  'Bill Number',
  'Payment Date',
  'Payment Method',
  'Amount Paid',
];

const RECEIPT_EXPORT_KEYS: (keyof ReceiptReportExportRow)[] = [
  'receiptNumber',
  'patientName',
  'billNumber',
  'paymentDate',
  'paymentMethod',
  'amountPaid',
];

const DOCTOR_PAYMENT_EXPORT_COLUMNS = [
  'Doctor Name',
  'Receipt No',
  'Total Amount',
  'Paid Amount',
  'Due Amount',
  'Status',
  'Payment Method',
  'Created',
];

const DOCTOR_PAYMENT_EXPORT_KEYS: (keyof DoctorPaymentReportExportRow)[] = [
  'doctorName',
  'receiptNumber',
  'totalAmount',
  'paidAmount',
  'dueAmount',
  'status',
  'paymentMethod',
  'createdAt',
];

type ReceiptReportsToolbarProps = {
  variant: 'receipts';
  serverData: () => Promise<{
    success: boolean;
    data?: ReceiptReportExportRow[];
    message?: string;
  }>;
};

type DoctorPaymentReportsToolbarProps = {
  variant: 'doctor-payments';
  serverData: () => Promise<{
    success: boolean;
    data?: DoctorPaymentReportExportRow[];
    message?: string;
  }>;
};

type ReportsToolbarProps = ReceiptReportsToolbarProps | DoctorPaymentReportsToolbarProps;

export function ReportsToolbar(props: ReportsToolbarProps) {
  if (props.variant === 'receipts') {
    return (
      <ExportWrapper<ReceiptReportExportRow>
        serverData={props.serverData}
        columns={RECEIPT_EXPORT_COLUMNS}
        keys={RECEIPT_EXPORT_KEYS}
        title="Receipt Report"
        fileName="receipt-report"
        showPrintButton
      />
    );
  }

  return (
    <ExportWrapper<DoctorPaymentReportExportRow>
      serverData={props.serverData}
      columns={DOCTOR_PAYMENT_EXPORT_COLUMNS}
      keys={DOCTOR_PAYMENT_EXPORT_KEYS}
      title="Doctor Payment Report"
      fileName="doctor-payment-report"
      showPrintButton
    />
  );
}
