'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { Input } from '@/components/ui/input';
import { formatLKR } from '@/lib/format-money';
import Loading from '@/app/(dashboard)/loading';
import {
  exportDpayDoctorBalanceReportData,
  getDpayDoctorBalanceReportData,
} from '@/app/actions/reports/dpay-doctor-balance.report.action';
import type {
  DpayDoctorBalanceReportExportRow,
  DpayDoctorBalanceReportQuery,
  DpayDoctorBalanceReportRow,
} from '@/types/reports/dpay-doctor-balance';
import { buildDpayDoctorBalanceColumns } from './columns';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  canOpenStatement: boolean;
};

const STATUS_OPTIONS = [
  { id: '1', name: 'Active' },
  { id: '0', name: 'Inactive' },
];

function todayLocalYyyyMmDd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

function DpayDoctorBalanceReportContentInner({
  currentUserName,
  doctorOptions,
  specialityOptions,
  canOpenStatement,
}: Props) {
  const searchParams = useSearchParams();
  const defaultAsOfDate = todayLocalYyyyMmDd();
  const columns = useMemo(
    () => buildDpayDoctorBalanceColumns(canOpenStatement),
    [canOpenStatement]
  );

  const buildQuery = (): DpayDoctorBalanceReportQuery => ({
    asOfDate: searchParams.get('asOfDate') ?? defaultAsOfDate,
    doctorId: searchParams.get('doctorId') ?? '__all__',
    specialityId: searchParams.get('specialityId') ?? '__all__',
    status: searchParams.get('status') ?? '__all__',
  });

  const statusLabel = (status: string | undefined) =>
    status === '1' ? 'Active' : status === '0' ? 'Inactive' : 'All Status';

  return (
    <>
      <style>{`
        @media print {
          .dpay-doctor-balance-report-root,
          .dpay-doctor-balance-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .dpay-doctor-balance-report-root .rpt-template-card,
          .dpay-doctor-balance-report-root .rpt-print-root,
          .dpay-doctor-balance-report-root .rpt-print-body,
          .dpay-doctor-balance-report-root .rpt-print-header,
          .dpay-doctor-balance-report-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .dpay-doctor-balance-report-root .overflow-x-auto,
          .dpay-doctor-balance-report-root .overflow-auto,
          .dpay-doctor-balance-report-root .overflow-hidden,
          .dpay-doctor-balance-report-root .rounded-lg,
          .dpay-doctor-balance-report-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .dpay-doctor-balance-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .dpay-doctor-balance-report-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .dpay-doctor-balance-report-root .rpt-print-root th,
          .dpay-doctor-balance-report-root .rpt-print-root td {
            font-size: 5.5pt !important;
            padding: 0.7mm 0.5mm !important;
            line-height: 1.2 !important;
            white-space: normal !important;
            word-break: break-word !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            vertical-align: middle !important;
          }
          .dpay-doctor-balance-report-root .rpt-print-root thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .dpay-doctor-balance-report-root .rpt-print-root tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .dpay-balance-has-statement .rpt-print-root th:last-child,
          .dpay-balance-has-statement .rpt-print-root td:last-child {
            display: none !important;
          }
          .dpay-doctor-balance-report-root .rpt-print-root [class*="bg-emerald"],
          .dpay-doctor-balance-report-root .rpt-print-root [class*="bg-red"],
          .dpay-doctor-balance-report-root .rpt-print-root [class*="text-emerald"],
          .dpay-doctor-balance-report-root .rpt-print-root [class*="text-red"] {
            background: transparent !important;
            color: #000 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <ReportTemplate<DpayDoctorBalanceReportRow, DpayDoctorBalanceReportExportRow>
        title="DPAY Doctor Balance Report"
        description="DPAY doctor payable balances (DPAY-DOC-) as of a selected date. This is separate from the channeling doctor payable."
        filterButtonLabel="Search"
        printPageSize="A4 landscape"
        printPageMargins="7mm 5mm 18mm"
        containerClassName={`container mx-auto py-3 space-y-4 dpay-doctor-balance-report-root${canOpenStatement ? ' dpay-balance-has-statement' : ''}`}
        tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
        initialFilterValues={{ asOfDate: defaultAsOfDate }}
        generationDetails={{
          generatedBy: currentUserName,
          formatFilters: (values) => (
            <>
              <div>As of: {values.asOfDate ?? defaultAsOfDate}</div>
              <div>
                Doctor: {filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions)} | Speciality:{' '}
                {filterOptionLabel(values.specialityId, 'All Specialities', specialityOptions)} | Status:{' '}
                {statusLabel(values.status)}
              </div>
            </>
          ),
          formatPrintSummaryItems: (values) => [
            { label: 'As of', value: values.asOfDate ?? defaultAsOfDate },
            { label: 'Doctor', value: filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions) },
            {
              label: 'Speciality',
              value: filterOptionLabel(values.specialityId, 'All Specialities', specialityOptions),
            },
            { label: 'Status', value: statusLabel(values.status) },
          ],
        }}
        filterContent={({ values, setValue }) => (
          <>
            <div className="w-[200px]">
              <label className="text-sm font-semibold mb-2 block">As-of Date</label>
              <Input
                type="date"
                value={values.asOfDate ?? defaultAsOfDate}
                onChange={(e) => setValue('asOfDate', e.target.value)}
                className="h-10 w-full py-0"
              />
            </div>
            <div className="self-end">
              <Combobox
                label="Doctor"
                options={doctorOptions}
                value={values.doctorId ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('doctorId', v)}
              />
            </div>
            <div className="self-end">
              <Combobox
                label="Speciality"
                options={specialityOptions}
                value={values.specialityId ?? '__all__'}
                defaultValue="__all__"
                onChange={(v) => setValue('specialityId', v)}
              />
            </div>
            <div className="self-end">
              <Selector
                label="All Status"
                options={STATUS_OPTIONS}
                value={values.status ?? '__all__'}
                onChange={(v) => setValue('status', v)}
                className={{ trigger: 'w-[180px]' }}
              />
            </div>
          </>
        )}
        fetchData={async (params) => {
          const query: DpayDoctorBalanceReportQuery = {
            asOfDate: params.get('asOfDate') ?? defaultAsOfDate,
            doctorId: params.get('doctorId') ?? '__all__',
            specialityId: params.get('specialityId') ?? '__all__',
            status: params.get('status') ?? '__all__',
          };
          return getDpayDoctorBalanceReportData(query);
        }}
        exportData={async () => exportDpayDoctorBalanceReportData(buildQuery())}
        columns={columns}
        exportColumns={[
          'No.',
          'Status',
          'Doctor Code',
          'Doctor Name',
          'Speciality',
          'Phone',
          'DPAY Account',
          'DPAY Balance',
        ]}
        exportKeys={
          [
            'no',
            'status',
            'doctorCode',
            'doctorName',
            'speciality',
            'doctorPhoneNo',
            'accountCode',
            'doctorBalance',
          ] as (keyof DpayDoctorBalanceReportExportRow)[]
        }
        exportTitle="DPAY Doctor Balance Report"
        exportFileName="dpay-doctor-balance"
        excelColumnNumberFormats={[
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          '#,##0.00',
        ]}
        getRowId={(row) => row.id}
        totalColumnIds={['doctorBalance']}
        formatTotalValue={(_columnId, sum) => formatLKR(sum)}
        skipFetchWhenNoParams={true}
        initialEmptyMessage="No DPAY doctor balances found. Select filters and click Search."
        emptyMessage="No DPAY doctor balances found for the selected filters."
      />
    </>
  );
}

export default function DpayDoctorBalanceReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <DpayDoctorBalanceReportContentInner {...props} />
    </Suspense>
  );
}
