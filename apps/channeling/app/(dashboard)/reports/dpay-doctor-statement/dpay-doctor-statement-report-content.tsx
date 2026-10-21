'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Input } from '@/components/ui/input';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatLKR } from '@/lib/format-money';
import Loading from '@/app/(dashboard)/loading';
import {
  exportDpayDoctorStatementReportData,
  getDpayDoctorStatementReportData,
} from '@/app/actions/reports/dpay-doctor-statement.report.action';
import type {
  DpayDoctorStatementExportRow,
  DpayDoctorStatementQuery,
  DpayDoctorStatementRow,
} from '@/types/reports/dpay-doctor-statement';
import { DpayDoctorStatementColumns } from './columns';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
};

function todayLocalYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthStartLocalYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

function filterOptionLabel(
  id: string | undefined,
  options: Array<{ id: string; name: string }>
): string {
  if (!id) return 'Not selected';
  return options.find((o) => o.id === id)?.name ?? id;
}

function DpayDoctorStatementReportContentInner({ currentUserName, doctorOptions }: Props) {
  const searchParams = useSearchParams();
  const defaultDateFrom = monthStartLocalYyyyMmDd();
  const defaultDateTo = todayLocalYyyyMmDd();

  const buildQuery = (): DpayDoctorStatementQuery => ({
    doctorId: searchParams.get('doctorId') ?? '',
    dateFrom: searchParams.get('dateFrom') ?? defaultDateFrom,
    dateTo: searchParams.get('dateTo') ?? defaultDateTo,
  });

  return (
    <>
      <style>{`
        @media print {
          .dpay-doctor-statement-report-root,
          .dpay-doctor-statement-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .dpay-doctor-statement-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .dpay-doctor-statement-report-root .rpt-print-root th,
          .dpay-doctor-statement-report-root .rpt-print-root td {
            font-size: 7pt !important;
            padding: 0.8mm 1mm !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          .dpay-doctor-statement-report-root .rpt-print-root thead th {
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dpay-doctor-statement-report-root .rpt-print-root th:nth-child(1),
          .dpay-doctor-statement-report-root .rpt-print-root td:nth-child(1) { width: 16% !important; }
          .dpay-doctor-statement-report-root .rpt-print-root th:nth-child(2),
          .dpay-doctor-statement-report-root .rpt-print-root td:nth-child(2) { width: 40% !important; }
          .dpay-doctor-statement-report-root .rpt-print-root th:nth-child(3),
          .dpay-doctor-statement-report-root .rpt-print-root td:nth-child(3),
          .dpay-doctor-statement-report-root .rpt-print-root th:nth-child(4),
          .dpay-doctor-statement-report-root .rpt-print-root td:nth-child(4),
          .dpay-doctor-statement-report-root .rpt-print-root th:nth-child(5),
          .dpay-doctor-statement-report-root .rpt-print-root td:nth-child(5) {
            width: 14.6% !important;
            text-align: right !important;
          }
          .dpay-doctor-statement-report-root .rpt-print-root tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
        }
      `}</style>
      <ReportTemplate<DpayDoctorStatementRow, DpayDoctorStatementExportRow>
        title="DPAY Doctor Statement"
        description="Movements on one doctor's DPAY payable (DPAY-DOC-) for the selected dates. This is separate from the channeling doctor payable."
        filterButtonLabel="Search"
        printPageSize="A4 portrait"
        printPageMargins="7mm 5mm 18mm"
        containerClassName="container mx-auto py-3 space-y-4 dpay-doctor-statement-report-root"
        tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
        initialFilterValues={{ dateFrom: defaultDateFrom, dateTo: defaultDateTo }}
        generationDetails={{
          generatedBy: currentUserName,
          formatFilters: (values) => (
            <>
              <div>
                From: {values.dateFrom ?? defaultDateFrom} To: {values.dateTo ?? defaultDateTo}
              </div>
              <div>Doctor: {filterOptionLabel(values.doctorId, doctorOptions)}</div>
            </>
          ),
          formatPrintSummaryItems: (values) => [
            { label: 'From', value: values.dateFrom ?? defaultDateFrom },
            { label: 'To', value: values.dateTo ?? defaultDateTo },
            { label: 'Doctor', value: filterOptionLabel(values.doctorId, doctorOptions) },
          ],
        }}
        filterContent={({ values, setValue }) => (
          <>
            <div className="w-[180px]">
              <label className="text-sm font-semibold mb-2 block">From</label>
              <Input
                type="date"
                value={values.dateFrom ?? defaultDateFrom}
                onChange={(e) => setValue('dateFrom', e.target.value)}
                className="h-10 w-full py-0"
              />
            </div>
            <div className="w-[180px]">
              <label className="text-sm font-semibold mb-2 block">To</label>
              <Input
                type="date"
                value={values.dateTo ?? defaultDateTo}
                onChange={(e) => setValue('dateTo', e.target.value)}
                className="h-10 w-full py-0"
              />
            </div>
            <div className="self-end">
              <Combobox
                label="Doctor"
                options={doctorOptions}
                value={values.doctorId ?? ''}
                defaultValue=""
                onChange={(v) => setValue('doctorId', v)}
              />
            </div>
          </>
        )}
        fetchData={async (params) => {
          const query: DpayDoctorStatementQuery = {
            doctorId: params.get('doctorId') ?? '',
            dateFrom: params.get('dateFrom') ?? defaultDateFrom,
            dateTo: params.get('dateTo') ?? defaultDateTo,
          };
          return getDpayDoctorStatementReportData(query);
        }}
        exportData={async () => exportDpayDoctorStatementReportData(buildQuery())}
        columns={DpayDoctorStatementColumns}
        exportColumns={['Date', 'Particulars', 'Debit', 'Credit', 'Balance']}
        exportKeys={
          ['date', 'particulars', 'debit', 'credit', 'balance'] as (keyof DpayDoctorStatementExportRow)[]
        }
        exportTitle="DPAY Doctor Statement"
        exportFileName="dpay-doctor-statement"
        excelColumnNumberFormats={[undefined, undefined, '#,##0.00', '#,##0.00', '#,##0.00']}
        getRowId={(row) => row.id}
        footerRow={(rows) => {
          const lines = rows.filter((row) => row.kind === 'line');
          const debit = lines.reduce((sum, row) => sum + (row.debit ?? 0), 0);
          const credit = lines.reduce((sum, row) => sum + (row.credit ?? 0), 0);
          const closing = rows.length ? rows[rows.length - 1].balance : 0;
          return (
            <TableRow className="font-semibold bg-muted/50 rpt-print-total">
              <TableCell />
              <TableCell>Total</TableCell>
              <TableCell className="text-right tabular-nums">{formatLKR(debit)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatLKR(credit)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatLKR(closing)}</TableCell>
            </TableRow>
          );
        }}
        skipFetchWhenNoParams={true}
        initialEmptyMessage="No DPAY doctor statement found. Select a doctor and click Search."
        emptyMessage="No DPAY doctor statement found for the selected filters."
      />
    </>
  );
}

export default function DpayDoctorStatementReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <DpayDoctorStatementReportContentInner {...props} />
    </Suspense>
  );
}
