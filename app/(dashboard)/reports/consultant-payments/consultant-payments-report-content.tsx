'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import {
  getConsultantPaymentsReportData,
  exportConsultantPaymentsReportData,
  ConsultantPaymentsReportExportRow
} from '@/app/actions/reports/consultant.payments.report.action';
import { ConsultantPaymentsReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading'
import type { ConsultantPaymentsReportRow } from '@/types/report';
import { formatLKR } from '@/lib/format-money';

type ConsultantPaymentsReportContentProps = {
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};

/** Default from = today 00:00, to = today 23:59 (local) in YYYY-MM-DDTHH:mm */
function getTodayDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${d}T00:00`,
    to: `${y}-${m}-${d}T23:59`
  };
}

function ConsultantPaymentsReportContentInner({
  institutionOptions,
  locationOptions,
  departmentOptions,
  specialityOptions,
  doctorOptions
}: ConsultantPaymentsReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    specialityId: searchParams.get('specialityId') ?? undefined,
    doctorId: searchParams.get('doctorId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    sessionType: searchParams.get('sessionType') ?? undefined
  });

  const statusOptions = [
    { id: '__all__', name: 'All Status' },
    { id: '1', name: 'Paid' },
    { id: '0', name: 'Due Pay' }
  ];

  const sessionOptions = [
    { id: '__all__', name: 'All Session' },
    { id: 'morning', name: 'Morning (12.00 AM – 11.59 AM)' },
    { id: 'evening', name: 'Evening (12.00 PM – 11.59 PM)' }
  ];

  return (
    <ReportTemplate<ConsultantPaymentsReportRow, ConsultantPaymentsReportExportRow>
      title="Consultant Payments Report"
      description="View consultant (doctor) payments for channeling bookings with filters for date & time range, institution, branch, department, speciality, doctor, and payment status"
      filterButtonLabel="Search"
      skipFetchWhenNoParams={true}
      initialFilterValues={{
        fromDateTime: getTodayDateTimeRange().from,
        toDateTime: getTodayDateTimeRange().to,
        status: '__all__',
        sessionType: '__all__'
      }}
      filterContent={({ values, setValue }) => (
        <>
          <div className="flex-shrink-0">
            <DateAndTimeRangePicker
              label="Date & Time Range"
              from={values.fromDateTime}
              to={values.toDateTime}
              onChange={({ from, to }) => {
                setValue('fromDateTime', from);
                setValue('toDateTime', to);
              }}
            />
          </div>
          <div className='flex flex-wrap gap-3'>
            <Selector
              label="Institution"
              options={institutionOptions}
              value={values.institutionId ?? '__all__'}
              onChange={(v) => setValue('institutionId', v)}
              className={{
                trigger: 'self-end!'
              }}
            />
            <Combobox
              label="Branch"
              options={locationOptions}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('locationId', v)}
            />
            <Combobox
              label="Department"
              options={departmentOptions}
              value={values.departmentId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('departmentId', v)}
            />
            <Combobox
              label="Speciality"
              options={specialityOptions}
              value={values.specialityId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('specialityId', v)}
            />
            <Combobox
              label="Doctor"
              options={doctorOptions}
              value={values.doctorId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('doctorId', v)}
            />
            <Selector
              label="All Status"
              options={statusOptions}
              value={values.status || '__all__'}
              showDefaultOption={false}
              onChange={(v) => setValue('status', v)}
              className={{
                trigger: 'self-end!'
              }}
            />
            <Selector
              label="All Session"
              options={sessionOptions}
              value={values.sessionType || '__all__'}
              showDefaultOption={false}
              onChange={(v) => setValue('sessionType', v)}
              className={{
                trigger: 'self-end!'
              }}
            />
          </div>
        </>
      )}
      fetchData={async (params) => {
        const query = {
          fromDateTime: params.get('fromDateTime') ?? undefined,
          toDateTime: params.get('toDateTime') ?? undefined,
          institutionId: params.get('institutionId') ?? undefined,
          locationId: params.get('locationId') ?? undefined,
          departmentId: params.get('departmentId') ?? undefined,
          specialityId: params.get('specialityId') ?? undefined,
          doctorId: params.get('doctorId') ?? undefined,
          status: params.get('status') ?? undefined,
          sessionType: params.get('sessionType') ?? undefined
        };
        return getConsultantPaymentsReportData(query);
      }}
      exportData={async () => exportConsultantPaymentsReportData(buildQuery())}
      columns={ConsultantPaymentsReportColumns}
      exportColumns={[
        'S.No',
        'Branch',
        'Consultant',
        'Consultant Code',
        'Payment Receipt',
        'Channel Receipt',
        'Consultation Date/Session Time',
        'Patient Name',
        'Mode of Pay',
        'Consultation Charge',
        'Discount Amount',
        'Net Amount',
        'Payment Status',
        'Paid By',
        'Paid Date',
        'Handed By'
      ]}
      exportKeys={
        [
          'sNo',
          'branch',
          'consultant',
          'consultantCode',
          'paymentReceipt',
          'channelReceipt',
          'consultationSession',
          'patientName',
          'modeOfPay',
          'consultationCharge',
          'discountAmount',
          'netAmount',
          'paymentStatus',
          'paidBy',
          'paidDate',
          'handedBy'
        ] as (keyof ConsultantPaymentsReportExportRow)[]
      }
      exportTitle="Consultant Payments Report"
      exportFileName="consultant-payments-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      totalColumnIds={['consultationCharge', 'discountAmount', 'netAmount']}
      formatTotalValue={(columnId, sum) => {
        if (
          columnId === 'consultationCharge' ||
          columnId === 'discountAmount' ||
          columnId === 'netAmount'
        ) {
          return <span className="tabular-nums font-medium">{formatLKR(sum)}</span>;
        }
        return sum.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0
        });
      }}
      emptyMessage="No consultant payment records found. Please select a date & time range and apply filters."
    />
  );
}

export default function ConsultantPaymentsReportContent(props: ConsultantPaymentsReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ConsultantPaymentsReportContentInner {...props} />
    </Suspense>
  );
}
