'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Loading from '@/app/(dashboard)/loading';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import {
  exportChannelDiscountReportData,
  getChannelDiscountReportData
} from '@/app/actions/reports/channel-discount.report.action';
import { ChannelDiscountReportColumns } from './columns';
import type {
  ChannelDiscountReportExportRow,
  ChannelDiscountReportQuery,
  ChannelDiscountReportRow
} from '@/types/reports/channel-discount-report';

type Props = {
  currentUserName: string;
  doctorOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
};

function getDefaultDateTimeRange(): { fromDateTime: string; toDateTime: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { fromDateTime: `${y}-${m}-${d}T00:00`, toDateTime: `${y}-${m}-${d}T23:59` };
}

function ContentInner({ currentUserName, doctorOptions, locationOptions }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): ChannelDiscountReportQuery => ({
    doctorId: searchParams.get('doctorId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
    fromDateTime: searchParams.get('fromDateTime') ?? '',
    toDateTime: searchParams.get('toDateTime') ?? ''
  });

  return (
    <ReportTemplate<ChannelDiscountReportRow, ChannelDiscountReportExportRow>
      title="Channel Discount Report"
      description="Shows channel bookings with fee discounts, grouped as billed discount transactions."
      filterButtonLabel="Search"
      skipFetchWhenNoParams={true}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const doctorId = values.doctorId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const doctorLabel = doctorId === '__all__' ? 'All Doctors' : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId);
          const branchLabel =
            locationId === '__all__'
              ? 'All Branches'
              : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId);
          return (
            <>
              <div>Range: {formatReportRangeLabel(fromDateTime, toDateTime)}</div>
              <div>Doctor: {doctorLabel} | Branch: {branchLabel}</div>
            </>
          );
        }
      }}
      initialFilterValues={{
        ...getDefaultDateTimeRange(),
        doctorId: '__all__',
        locationId: '__all__'
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-3">
          <Combobox
            label="Select Doctor"
            options={doctorOptions}
            value={values.doctorId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('doctorId', v ?? '__all__')}
          />
          <Combobox
            label="Branch"
            options={locationOptions}
            value={values.locationId ?? '__all__'}
            defaultValue="__all__"
            clearable
            onChange={(v) => setValue('locationId', v ?? '__all__')}
          />
          <DateTimeRangePicker
            label="Date & Time Range"
            from={values.fromDateTime}
            to={values.toDateTime}
            onChange={({ from, to }) => {
              setValue('fromDateTime', from);
              setValue('toDateTime', to);
            }}
          />
        </div>
      )}
      fetchData={async (params) => {
        const result = await getChannelDiscountReportData({
          doctorId: params.get('doctorId') ?? '__all__',
          locationId: params.get('locationId') ?? '__all__',
          fromDateTime: params.get('fromDateTime') ?? '',
          toDateTime: params.get('toDateTime') ?? ''
        });
        return {
          success: result.success,
          data: result.data ?? [],
          totalRecords: result.totalRecords ?? 0,
          message: result.message
        };
      }}
      exportData={async () => exportChannelDiscountReportData(buildQuery())}
      columns={ChannelDiscountReportColumns}
      exportColumns={[
        'Booking Date',
        'Session',
        'Bill No',
        'Patient Name',
        'Doctor',
        'Type',
        'Hospital Fee',
        'Hospital Fee Discount',
        'Professional Fee',
        'Professional Fee Discount',
        'Discount',
        'Auto Discount Scheme',
        'Discount Scheme'
      ]}
      exportKeys={[
        'bookingDate',
        'session',
        'billNo',
        'patientName',
        'doctor',
        'type',
        'hospitalFee',
        'hospitalFeeDiscount',
        'professionalFee',
        'professionalFeeDiscount',
        'discount',
        'autoDiscountScheme',
        'discountScheme'
      ]}
      exportTitle="Channel Discount Report"
      exportFileName="channel-discount-report"
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      getRowId={(row) => row.id}
      showPrintButton={true}
      initialEmptyMessage="No channel discount records found. Select filters and click Search."
      emptyMessage="No channel discount records found for the selected filters."
    />
  );
}

export default function ChannelDiscountReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
