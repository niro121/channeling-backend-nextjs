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
  specialityOptions: Array<{ id: string; name: string }>;
  discountSchemeOptions: Array<{ id: string; name: string }>;
};

function getDefaultDateTimeRange(): { fromDateTime: string; toDateTime: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { fromDateTime: `${y}-${m}-${d}T00:00`, toDateTime: `${y}-${m}-${d}T23:59` };
}

function ContentInner({
  currentUserName,
  doctorOptions,
  locationOptions,
  specialityOptions,
  discountSchemeOptions
}: Props) {
  const searchParams = useSearchParams();
  const defaultRange = getDefaultDateTimeRange();

  const buildQuery = (): ChannelDiscountReportQuery => ({
    doctorId: searchParams.get('doctorId') ?? '__all__',
    locationId: searchParams.get('locationId') ?? '__all__',
    specialityId: searchParams.get('specialityId') ?? '__all__',
    discountSchemeId: searchParams.get('discountSchemeId') ?? '__all__',
    fromDateTime: searchParams.get('fromDateTime') ?? defaultRange.fromDateTime,
    toDateTime: searchParams.get('toDateTime') ?? defaultRange.toDateTime
  });

  return (
    <>
      <style>{`
        @media print {
          .channel-discount-report-root,
          .channel-discount-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .channel-discount-report-root .rpt-print-root,
          .channel-discount-report-root .rpt-print-body {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          /* Table wrappers only — shared header / summary box stays untouched */
          .channel-discount-report-root .rpt-print-body .overflow-x-auto,
          .channel-discount-report-root .rpt-print-body .overflow-auto,
          .channel-discount-report-root .rpt-print-body .overflow-hidden,
          .channel-discount-report-root .rpt-print-body .rounded-lg,
          .channel-discount-report-root .rpt-print-body .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /* Body matches branded PDF compact table */
          .channel-discount-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .channel-discount-report-root .rpt-print-root th,
          .channel-discount-report-root .rpt-print-root td {
            width: auto !important;
            font-size: 5.5pt !important;
            font-weight: 400 !important;
            padding: 0.7mm !important;
            line-height: 1.15 !important;
            text-align: left !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            overflow: hidden !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .channel-discount-report-root .rpt-print-root thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .channel-discount-report-root .rpt-print-root th:first-child,
          .channel-discount-report-root .rpt-print-root td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .channel-discount-report-root .rpt-print-root th:last-child,
          .channel-discount-report-root .rpt-print-root td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .channel-discount-report-root .rpt-print-root tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .channel-discount-report-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <ReportTemplate<ChannelDiscountReportRow, ChannelDiscountReportExportRow>
      title="Channel Discount Report"
      description="Shows channel bookings with fee discounts, grouped as billed discount transactions."
      filterButtonLabel="Search"
      skipFetchWhenNoParams={true}
      printPageSize="A4 portrait"
      printPageMargins="7mm 5mm 18mm"
      containerClassName="container mx-auto py-3 space-y-4 channel-discount-report-root"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const doctorId = values.doctorId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const discountSchemeId = values.discountSchemeId ?? '__all__';
          const doctorLabel = doctorId === '__all__' ? 'All Doctors' : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId);
          const branchLabel =
            locationId === '__all__'
              ? 'All Branches'
              : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId);
          const specialityLabel =
            specialityId === '__all__'
              ? 'All Specialities'
              : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId);
          const discountSchemeLabel =
            discountSchemeId === '__all__'
              ? 'All Discount Schemes'
              : (discountSchemeOptions.find((d) => d.id === discountSchemeId)?.name ?? discountSchemeId);
          return (
            <>
              <div>Range: {formatReportRangeLabel(fromDateTime, toDateTime)}</div>
              <div>Doctor: {doctorLabel} | Branch: {branchLabel}</div>
              <div>Speciality: {specialityLabel} | Discount Scheme: {discountSchemeLabel}</div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const doctorId = values.doctorId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const discountSchemeId = values.discountSchemeId ?? '__all__';
          return [
            {
              label: 'Period',
              value: formatReportRangeLabel(fromDateTime, toDateTime),
              fullWidth: true,
            },
            {
              label: 'Doctor',
              value:
                doctorId === '__all__'
                  ? 'All Doctors'
                  : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId),
            },
            {
              label: 'Branch',
              value:
                locationId === '__all__'
                  ? 'All Branches'
                  : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId),
            },
            {
              label: 'Speciality',
              value:
                specialityId === '__all__'
                  ? 'All Specialities'
                  : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId),
            },
            {
              label: 'Discount Scheme',
              value:
                discountSchemeId === '__all__'
                  ? 'All Discount Schemes'
                  : (discountSchemeOptions.find((d) => d.id === discountSchemeId)?.name ??
                    discountSchemeId),
            },
          ];
        },
      }}
      initialFilterValues={{
        ...getDefaultDateTimeRange(),
        doctorId: '__all__',
        locationId: '__all__',
        specialityId: '__all__',
        discountSchemeId: '__all__'
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
          <Combobox
            label="Speciality"
            options={specialityOptions}
            value={values.specialityId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('specialityId', v ?? '__all__')}
          />
          <Combobox
            label="Discount Scheme"
            options={discountSchemeOptions}
            value={values.discountSchemeId ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('discountSchemeId', v ?? '__all__')}
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
          specialityId: params.get('specialityId') ?? '__all__',
          discountSchemeId: params.get('discountSchemeId') ?? '__all__',
          fromDateTime: params.get('fromDateTime') ?? defaultRange.fromDateTime,
          toDateTime: params.get('toDateTime') ?? defaultRange.toDateTime
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
      totalColumnIds={['hospitalFee', 'hospitalFeeDiscount', 'professionalFee', 'professionalFeeDiscount', 'discount']}
      getTotalNumericValue={(row, columnId) => {
        const source = row as Record<string, unknown>;
        const value = source[columnId];
        return typeof value === 'number' ? value : 0;
      }}
      initialEmptyMessage="No channel discount records found. Select filters and click Search."
      emptyMessage="No channel discount records found for the selected filters."
    />
    </>
  );
}

export default function ChannelDiscountReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}
