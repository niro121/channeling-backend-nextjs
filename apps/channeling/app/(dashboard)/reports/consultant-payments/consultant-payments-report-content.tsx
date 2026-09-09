'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
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
  currentUserName: string;
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
  currentUserName,
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
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const fromDateTime = values.fromDateTime ?? '';
          const toDateTime = values.toDateTime ?? '';
          const institutionId = values.institutionId ?? '__all__';
          const locationId = values.locationId ?? '__all__';
          const departmentId = values.departmentId ?? '__all__';
          const specialityId = values.specialityId ?? '__all__';
          const doctorId = values.doctorId ?? '__all__';
          const status = values.status ?? '__all__';
          const sessionType = values.sessionType ?? '__all__';

          const institutionLabel =
            institutionId === '__all__' ? 'All Institutions' : (institutionOptions.find((i) => i.id === institutionId)?.name ?? institutionId);
          const branchLabel =
            locationId === '__all__' ? 'All Branches' : (locationOptions.find((l) => l.id === locationId)?.name ?? locationId);
          const departmentLabel =
            departmentId === '__all__' ? 'All Departments' : (departmentOptions.find((d) => d.id === departmentId)?.name ?? departmentId);
          const specialityLabel =
            specialityId === '__all__' ? 'All Specialities' : (specialityOptions.find((s) => s.id === specialityId)?.name ?? specialityId);
          const doctorLabel =
            doctorId === '__all__' ? 'All Doctors' : (doctorOptions.find((d) => d.id === doctorId)?.name ?? doctorId);
          const statusLabel = status === '__all__' ? 'All Status' : status === '1' ? 'Paid' : 'Due Pay';
          const sessionLabel = sessionType === '__all__' ? 'All Session' : sessionType === 'morning' ? 'Morning' : 'Evening';
          return (
            <>
              <div>Range: {formatReportRangeLabel(fromDateTime, toDateTime)}</div>
              <div>
                Institution: {institutionLabel} | Branch: {branchLabel} | Department: {departmentLabel}
              </div>
              <div>
                Speciality: {specialityLabel} | Doctor: {doctorLabel} | Status: {statusLabel} | Session: {sessionLabel}
              </div>
            </>
          );
        },
      }}
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
              options={withAllBranchesOptions(locationOptions)}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              clearable
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
        'WHT',
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
          'whtAmount',
          'netAmount',
          'paymentStatus',
          'paidBy',
          'paidDate',
          'handedBy'
        ] as (keyof ConsultantPaymentsReportExportRow)[]
      }
      exportTitle="Consultant Payments Report"
      exportFileName="consultant-payments-report"
      tableClassName="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0"
      getRowId={(row) => row.id}
      showPrintButton={true}
      totalColumnIds={['consultationCharge', 'discountAmount', 'whtAmount', 'netAmount']}
      formatTotalValue={(columnId, sum) => {
        if (
          columnId === 'consultationCharge' ||
          columnId === 'discountAmount' ||
          columnId === 'whtAmount' ||
          columnId === 'netAmount'
        ) {
          return <span className="tabular-nums font-medium">{formatLKR(sum)}</span>;
        }
        return sum.toLocaleString(undefined, {
          maximumFractionDigits: 2,
          minimumFractionDigits: 0
        });
      }}
      initialEmptyMessage="No consultant payments found. Select filters and click Search."
      emptyMessage="No consultant payments found for the selected filters."
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
