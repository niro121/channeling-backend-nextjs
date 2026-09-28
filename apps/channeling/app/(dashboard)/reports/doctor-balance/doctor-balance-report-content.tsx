'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { Input } from '@/components/ui/input';
import { formatLKR } from '@/lib/format-money';
import Loading from '@/app/(dashboard)/loading';
import {
  exportDoctorBalanceReportData,
  getDoctorBalanceReportData,
} from '@/app/actions/reports/doctor-balance.report.action';
import type {
  DoctorBalanceReportExportRow,
  DoctorBalanceReportQuery,
  DoctorBalanceReportRow,
} from '@/types/reports/doctor-balance';
import { DoctorBalanceReportColumns } from './columns';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
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

function DoctorBalanceReportContentInner({
  currentUserName,
  doctorOptions,
  specialityOptions,
}: Props) {
  const searchParams = useSearchParams();
  const defaultAsOfDate = todayLocalYyyyMmDd();

  const buildQuery = (): DoctorBalanceReportQuery => ({
    asOfDate: searchParams.get('asOfDate') ?? defaultAsOfDate,
    doctorId: searchParams.get('doctorId') ?? '__all__',
    specialityId: searchParams.get('specialityId') ?? '__all__',
    status: searchParams.get('status') ?? '__all__',
  });

  return (
    <>
      <style>{`
        @media print {
          /* Full page + PDF-like body — print only (screen / PDF / Excel unchanged) */
          .doctor-balance-report-root,
          .doctor-balance-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .doctor-balance-report-root .rpt-template-card,
          .doctor-balance-report-root .rpt-print-root,
          .doctor-balance-report-root .rpt-print-body,
          .doctor-balance-report-root .rpt-print-header,
          .doctor-balance-report-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .doctor-balance-report-root .overflow-x-auto,
          .doctor-balance-report-root .overflow-auto,
          .doctor-balance-report-root .overflow-hidden,
          .doctor-balance-report-root .rounded-lg,
          .doctor-balance-report-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .doctor-balance-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .doctor-balance-report-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          /* No. | Status | Code | Name | Speciality | Phone | Address | Balance — PDF-like proportions */
          .doctor-balance-report-root .rpt-print-root th:nth-child(1),
          .doctor-balance-report-root .rpt-print-root td:nth-child(1) { width: 5% !important; text-align: center !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(2),
          .doctor-balance-report-root .rpt-print-root td:nth-child(2) { width: 8% !important; text-align: center !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(3),
          .doctor-balance-report-root .rpt-print-root td:nth-child(3) { width: 9% !important; text-align: center !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(4),
          .doctor-balance-report-root .rpt-print-root td:nth-child(4) { width: 22% !important; text-align: left !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(5),
          .doctor-balance-report-root .rpt-print-root td:nth-child(5) { width: 14% !important; text-align: left !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(6),
          .doctor-balance-report-root .rpt-print-root td:nth-child(6) { width: 11% !important; text-align: left !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(7),
          .doctor-balance-report-root .rpt-print-root td:nth-child(7) { width: 18% !important; text-align: left !important; }
          .doctor-balance-report-root .rpt-print-root th:nth-child(8),
          .doctor-balance-report-root .rpt-print-root td:nth-child(8) {
            width: 13% !important;
            text-align: right !important;
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
          }
          .doctor-balance-report-root .rpt-print-root th,
          .doctor-balance-report-root .rpt-print-root td {
            font-size: 5.5pt !important;
            padding: 0.7mm 0.5mm !important;
            line-height: 1.2 !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            overflow: hidden !important;
            text-overflow: clip !important;
            max-width: none !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-balance-report-root .rpt-print-root thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-balance-report-root .rpt-print-root th:first-child,
          .doctor-balance-report-root .rpt-print-root td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .doctor-balance-report-root .rpt-print-root th:last-child,
          .doctor-balance-report-root .rpt-print-root td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .doctor-balance-report-root .rpt-print-root tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .doctor-balance-report-root .rpt-print-root [class*="bg-emerald"],
          .doctor-balance-report-root .rpt-print-root [class*="bg-red"],
          .doctor-balance-report-root .rpt-print-root [class*="text-emerald"],
          .doctor-balance-report-root .rpt-print-root [class*="text-red"] {
            background: transparent !important;
            color: #000 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <ReportTemplate<DoctorBalanceReportRow, DoctorBalanceReportExportRow>
      title="Doctor Balance Report"
      description="Doctor payable balances as of a selected date, from linked PAYABLE accounts."
      filterButtonLabel="Search"
      printPageSize="A4 portrait"
      printPageMargins="7mm 5mm 18mm"
      containerClassName="container mx-auto py-3 space-y-4 doctor-balance-report-root"
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      initialFilterValues={{ asOfDate: defaultAsOfDate }}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const statusLabel =
            values.status === '1' ? 'Active' : values.status === '0' ? 'Inactive' : 'All Status';
          return (
            <>
              <div>As of: {values.asOfDate ?? defaultAsOfDate}</div>
              <div>
                Doctor: {filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions)} | Speciality:{' '}
                {filterOptionLabel(values.specialityId, 'All Specialities', specialityOptions)} | Status:{' '}
                {statusLabel}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => {
          const statusLabel =
            values.status === '1' ? 'Active' : values.status === '0' ? 'Inactive' : 'All Status';
          return [
            { label: 'As of', value: values.asOfDate ?? defaultAsOfDate },
            {
              label: 'Doctor',
              value: filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions),
            },
            {
              label: 'Speciality',
              value: filterOptionLabel(
                values.specialityId,
                'All Specialities',
                specialityOptions
              ),
            },
            { label: 'Status', value: statusLabel },
          ];
        },
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
        const query: DoctorBalanceReportQuery = {
          asOfDate: params.get('asOfDate') ?? defaultAsOfDate,
          doctorId: params.get('doctorId') ?? '__all__',
          specialityId: params.get('specialityId') ?? '__all__',
          status: params.get('status') ?? '__all__',
        };
        return getDoctorBalanceReportData(query);
      }}
      exportData={async () => exportDoctorBalanceReportData(buildQuery())}
      columns={DoctorBalanceReportColumns}
      exportColumns={[
        'No.',
        'Status',
        'Doctor Code',
        'Doctor Name',
        'Speciality',
        'Phone',
        'Address',
        'Doctor Balance',
      ]}
      exportKeys={
        [
          'no',
          'status',
          'doctorCode',
          'doctorName',
          'speciality',
          'doctorPhoneNo',
          'doctorAddress',
          'doctorBalance',
        ] as (keyof DoctorBalanceReportExportRow)[]
      }
      exportTitle="Doctor Balance Report"
      exportFileName="doctor-balance"
      getRowId={(row) => row.id}
      totalColumnIds={['doctorBalance']}
      formatTotalValue={(_columnId, sum) => formatLKR(sum)}
      skipFetchWhenNoParams={true}
      initialEmptyMessage="No doctor balances found. Select filters and click Search."
      emptyMessage="No doctor balances found for the selected filters."
    />
    </>
  );
}

export default function DoctorBalanceReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <DoctorBalanceReportContentInner {...props} />
    </Suspense>
  );
}
