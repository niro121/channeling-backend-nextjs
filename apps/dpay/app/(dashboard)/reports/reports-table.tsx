'use client';

import { CustomDataTable } from '@archmage/ui';
import { formatLkr } from '@/lib/patient-bills/calculations';
import { receiptReportColumns } from './receipt-report-columns';
import { doctorPaymentReportColumns } from './doctor-payment-report-columns';
import type { DoctorPaymentReportRow, ReceiptReportRow } from '@/types/reports';

type SharedTableProps = {
  totalRecords: number;
  totalAmount: number;
  page?: string;
  limit?: string;
  toolbarLeft: React.ReactNode;
  toolbarRight?: React.ReactNode;
};

type ReceiptTableProps = SharedTableProps & {
  tab: 'receipts';
  data: ReceiptReportRow[];
};

type DoctorPaymentTableProps = SharedTableProps & {
  tab: 'doctor-payments';
  data: DoctorPaymentReportRow[];
};

type ReportsTableProps = ReceiptTableProps | DoctorPaymentTableProps;

function ReportTotalFooter({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div className="flex justify-end rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium text-muted-foreground">{label}</span>
        <span className="text-base font-bold tabular-nums text-emerald-700">
          {formatLkr(amount)}
        </span>
      </div>
    </div>
  );
}

export function ReportsTable(props: ReportsTableProps) {
  if (props.tab === 'receipts') {
    return (
      <div className="space-y-3">
        <CustomDataTable
          heading="Receipt Report"
          subHeading="Patient payment receipts filtered by search and date range."
          columns={receiptReportColumns}
          data={props.data}
          rowCount={props.totalRecords}
          haveBulkDelete={false}
          page={props.page}
          limit={props.limit}
          toolbarLeft={props.toolbarLeft}
          headingRight={props.toolbarRight}
        />
        <ReportTotalFooter label="Total Received" amount={props.totalAmount} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CustomDataTable
        heading="Doctor Payment Report"
        subHeading="Doctor payment receipts with totals and payment status."
        columns={doctorPaymentReportColumns}
        data={props.data}
        rowCount={props.totalRecords}
        haveBulkDelete={false}
        page={props.page}
        limit={props.limit}
        toolbarLeft={props.toolbarLeft}
        headingRight={props.toolbarRight}
      />
      <ReportTotalFooter label="Total Paid" amount={props.totalAmount} />
    </div>
  );
}
