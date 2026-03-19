'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import Loading from '@/app/(dashboard)/loading';
import {
  getChannelScheduleWithChargesReportData,
  exportChannelScheduleWithChargesReportData
} from '@/app/actions/reports/channel-schedule-with-charges.report.action';
import { ChannelScheduleWithChargesColumns } from './columns';
import type {
  ChannelScheduleWithChargesReportContentProps,
  ChannelScheduleWithChargesReportExportRow,
  ChannelScheduleWithChargesReportQuery,
  ChannelScheduleWithChargesReportRow
} from '@/types/reports/channel-schedule-with-charges';

function ChannelScheduleWithChargesReportContentInner(
  props: ChannelScheduleWithChargesReportContentProps
) {
  const searchParams = useSearchParams();

  const reportTypeOptions = [
    { id: 'specific_date', name: 'Specific Date' },
    { id: 'weekday', name: 'Weekday' }
  ];

  const buildQuery = (): ChannelScheduleWithChargesReportQuery => ({
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    specialityId: searchParams.get('specialityId') ?? undefined,
    doctorId: searchParams.get('doctorId') ?? undefined,
    reportType: searchParams.get('reportType') ?? undefined
  });

  return (
    <ReportTemplate<ChannelScheduleWithChargesReportRow, ChannelScheduleWithChargesReportExportRow>
      title="Channel schedule with charges"
      description="View doctor sessions with charge breakdown, filtered by institution, branch, department, speciality, doctor, and report type."
      filterButtonLabel="Search"
      filterContent={({ values, setValue }) => (
        <>
          {/* <div className="flex flex-wrap gap-3"> */}
            <Selector
              label="Institution"
              options={props.institutionOptions}
              value={values.institutionId ?? '__all__'}
              onChange={(v) => setValue('institutionId', v)}
              className={{ trigger: 'self-end!' }}
            />
            <Selector
              label="Branch (Site)"
              options={props.locationOptions}
              value={values.locationId ?? '__all__'}
              onChange={(v) => setValue('locationId', v)}
              className={{ trigger: 'self-end!' }}
            />
            <Combobox
              label="Department"
              options={props.departmentOptions}
              value={values.departmentId ?? '__all__'}
              onChange={(v) => setValue('departmentId', v)}
            />
            <Combobox
              label="Specialities"
              options={props.specialityOptions}
              value={values.specialityId ?? '__all__'}
              onChange={(v) => setValue('specialityId', v)}
            />
            <Combobox
              label="Doctors"
              options={props.doctorOptions}
              value={values.doctorId ?? '__all__'}
              onChange={(v) => setValue('doctorId', v)}
            />
            <Selector
              label="Report Type"
              options={reportTypeOptions}
              value={values.reportType ?? '__all__'}
              onChange={(v) => setValue('reportType', v)}
              className={{ trigger: 'self-end!' }}
            />
          {/* </div> */}
        </>
      )}
      fetchData={async (params) => {
        const query = buildQuery();

        // `buildQuery()` is based on `searchParams` so we can just patch values from `params`
        // for correctness when the user clicks Apply.
        query.institutionId = params.get('institutionId') ?? undefined;
        query.locationId = params.get('locationId') ?? undefined;
        query.departmentId = params.get('departmentId') ?? undefined;
        query.specialityId = params.get('specialityId') ?? undefined;
        query.doctorId = params.get('doctorId') ?? undefined;
        query.reportType = params.get('reportType') ?? undefined;

        return getChannelScheduleWithChargesReportData(query);
      }}
      exportData={async () => exportChannelScheduleWithChargesReportData(buildQuery())}
      columns={ChannelScheduleWithChargesColumns}
      exportColumns={[
        'location(location)',
        'Doctor Name',
        'Session Name',
        'Room',
        'Start Time',
        'End Time',
        'Date Type',
        'Apply Only To(Ignores Date Type)',
        'Doctor Fee (Local)',
        'Hospital Fee (Local)',
        'Agency Fee (Local)',
        'Scan Fee (Local)',
        'On-Call Fee (Local)',
        'Credit Card Commission (Local)',
        'Session Value (Local)',
        'Doctor Fee (Foreign)',
        'Hospital Fee (Foreign)',
        'Agency Fee (Foreign)',
        'Scan Fee (Foreign)',
        'On-Call Fee (Foreign)',
        'Credit Card Commission Fee (Foreign)',
        'Session Value (Foreign)',
        'Starting Patient No',
        'Maximum Patient No',
        'Previous Session',
        'Refundable',
        'Advance /Booking Days',
        'Status'
      ]}
      exportKeys={
        [
          'locationName',
          'doctorName',
          'sessionName',
          'roomName',
          'startTime',
          'endTime',
          'dateType',
          'applyOnlyTo',
          'doctorFeeLocal',
          'hospitalFeeLocal',
          'agencyFeeLocal',
          'scanFeeLocal',
          'onCallFeeLocal',
          'creditCardCommissionLocal',
          'sessionValueLocal',
          'doctorFeeForeign',
          'hospitalFeeForeign',
          'agencyFeeForeign',
          'scanFeeForeign',
          'onCallFeeForeign',
          'creditCardCommissionForeign',
          'sessionValueForeign',
          'startingPatientNo',
          'maximumPatientNo',
          'previousSession',
          'refundable',
          'advanceBookingDays',
          'status'
        ] as (keyof ChannelScheduleWithChargesReportExportRow)[]
      }
      exportTitle="Channel schedule with charges"
      exportFileName="channel-schedule-with-charges"
      getRowId={(row) => row.id ?? ''}
      showPrintButton={true}
      emptyMessage="No channel schedule records found. Apply filters and click Search."
      skipFetchWhenNoParams={true}
    />
  );
}

export default function ChannelScheduleWithChargesReportContent(
  props: ChannelScheduleWithChargesReportContentProps
) {
  return (
    <Suspense fallback={<Loading />}>
      <ChannelScheduleWithChargesReportContentInner {...props} />
    </Suspense>
  );
}

