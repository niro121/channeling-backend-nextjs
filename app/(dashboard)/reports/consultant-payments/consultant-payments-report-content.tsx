'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
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

type ConsultantPaymentsReportContentProps = {
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};

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
    status: searchParams.get('status') ?? undefined
  });

  const statusOptions = [
    { id: '__all__', name: 'All' },
    { id: '1', name: 'Paid' },
    { id: '0', name: 'Due Pay' }
  ];

  return (
    <ReportTemplate<ConsultantPaymentsReportRow, ConsultantPaymentsReportExportRow>
      title="Consultant Payments Report"
      description="View consultant (doctor) payments for channeling bookings with filters for date & time range, institution, branch, department, speciality, doctor, and payment status"
      filterButtonLabel="Search"
      filterContent={({ values, setValue }) => (
        <>
          <div className="flex-shrink-0">
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
            label="Status"
            options={statusOptions}
            value={values.status ?? '__all__'}
            onChange={(v) => setValue('status', v)}
            className={{
              trigger: 'self-end!'
            }}
          />
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
          status: params.get('status') ?? undefined
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
