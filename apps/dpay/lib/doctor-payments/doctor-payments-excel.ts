import {
  downloadBrandedReportExcel,
  type BrandedPdfSummaryItem,
} from '@/lib/report-print/report-excel-branded';
import type { DoctorPaymentExportRow } from '@/types/doctor-payment';

const MONEY = '#,##0.00';

const COLUMNS = [
  'Receipt No',
  'Status',
  'Doctor',
  'Method',
  'Total',
  'Net',
  'Created By',
  'Created',
  'Handed to Staff',
];

const KEYS: (keyof DoctorPaymentExportRow)[] = [
  'receiptNumber',
  'status',
  'doctorName',
  'paymentMethod',
  'total',
  'net',
  'createdBy',
  'createdAt',
  'handedToStaff',
];

export async function downloadDoctorPaymentsExcel(args: {
  rows: DoctorPaymentExportRow[];
  summaryItems: BrandedPdfSummaryItem[];
  fileName?: string;
}) {
  await downloadBrandedReportExcel({
    reportName: 'Doctor Payment Manager',
    summaryItems: args.summaryItems,
    generatedAt: new Date().toLocaleString(),
    data: args.rows,
    columns: COLUMNS,
    keys: KEYS,
    fileName: args.fileName ?? 'doctor-payments.xlsx',
    sheetName: 'Doctor Payments',
    orientation: 'portrait',
    compactTable: true,
    columnWidths: [15, 11, 22, 14, 12, 12, 14, 11, 22],
    columnNumberFormats: [undefined, undefined, undefined, undefined, MONEY, MONEY, undefined, undefined, undefined],
    extraWrapColumnIndexes: [2, 3, 6, 8],
  });
}
