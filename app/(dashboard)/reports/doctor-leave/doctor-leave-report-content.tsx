'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import {
  getDoctorLeaveReportData,
  exportDoctorLeaveReportData,
  DoctorLeaveReportExportRow
} from '@/app/actions/reports/doctor-leave-report.action';
import { DoctorLeaveReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading'

type DoctorLeaveReportRow = {
  id: string;
  fromDate: Date;
  toDate: Date;
  status: number;
  remarks: string | null;
  doctor: { id: string; name: string; code: string };
  sessions?: unknown[];
  createdUser?: { id: string; name: string } | null;
  updatedUser?: { id: string; name: string } | null;
  createdAt: Date;
  updatedAt: Date;
};

type DoctorLeaveReportContentProps = {
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  specialityOptions: Array<{ id: string; name: string }>;
  doctorOptions: Array<{ id: string; name: string }>;
};

function DoctorLeaveReportContentInner({
  institutionOptions,
  locationOptions,
  departmentOptions,
  specialityOptions,
  doctorOptions
}: DoctorLeaveReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    specialityId: searchParams.get('specialityId') ?? undefined,
    doctorId: searchParams.get('doctorId') ?? undefined
  });

  return (
    <ReportTemplate<DoctorLeaveReportRow>
      title="Doctor Leave Report"
      description="View doctor leave records with date range and filter by institution, branch, department, speciality, and doctor"
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
          doctorId: params.get('doctorId') ?? undefined
        };
        return getDoctorLeaveReportData(query);
      }}
      exportData={async () => exportDoctorLeaveReportData(buildQuery())}
      columns={DoctorLeaveReportColumns}
      exportColumns={[
        'Doctor Code',
        'Doctor Name',
        'From Date',
        'To Date',
        'Status',
        'Remarks',
        'Session Count',
        'Created By',
        'Created At',
        'Updated By',
        'Updated At'
      ]}
      exportKeys={
        [
          'doctorCode',
          'doctorName',
          'fromDate',
          'toDate',
          'status',
          'remarks',
          'sessionCount',
          'createdBy',
          'createdAt',
          'updatedBy',
          'updatedAt'
        ] as (keyof DoctorLeaveReportExportRow)[]
      }
      exportTitle="Doctor Leave Report"
      exportFileName="doctor-leave-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No doctor leave records found. Please select a date & time range and apply filters."
    />
  );
}

export default function DoctorLeaveReportContent(props: DoctorLeaveReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <DoctorLeaveReportContentInner {...props} />
    </Suspense>
  );
}
