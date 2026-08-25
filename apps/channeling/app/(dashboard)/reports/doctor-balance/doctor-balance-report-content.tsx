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
    <ReportTemplate<DoctorBalanceReportRow, DoctorBalanceReportExportRow>
      title="Doctor Balance Report"
      description="Doctor payable balances as of a selected date, from linked PAYABLE accounts."
      filterButtonLabel="Search"
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
  );
}

export default function DoctorBalanceReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <DoctorBalanceReportContentInner {...props} />
    </Suspense>
  );
}
