'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import {
  getDoctorLeaveReportData,
  exportDoctorLeaveReportData,
} from '@/app/actions/reports/doctor.leave.report.action';
import { DoctorLeaveReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading'
import {DoctorLeaveReportExportRow, DoctorLeaveReportContentProps, DoctorLeaveReportRow} from '@/types/reports/doctor.leave'

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

function DoctorLeaveReportContentInner({
  currentUserName,
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
    <ReportTemplate<DoctorLeaveReportRow, DoctorLeaveReportExportRow>
      title="Doctor Leave Report"
      description="View doctor leave records with date range and filter by institution, branch, department, speciality, and doctor"
      filterButtonLabel="Search"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const from = values.fromDateTime ?? '';
          const to = values.toDateTime ?? '';
          const branchOpts = withAllBranchesOptions(locationOptions);
          const doctor = filterOptionLabel(
            values.doctorId,
            'All Doctors',
            doctorOptions
          );
          const spec = filterOptionLabel(
            values.specialityId,
            'All Specialities',
            specialityOptions
          );
          const inst = filterOptionLabel(
            values.institutionId,
            'All Institutions',
            institutionOptions
          );
          const loc = filterOptionLabel(
            values.locationId,
            'All Branches',
            branchOpts
          );
          const dept = filterOptionLabel(
            values.departmentId,
            'All Departments',
            departmentOptions
          );
          return (
            <>
              <div>
                Date & time range: {from || '—'} to {to || '—'}
              </div>
              <div>
                Doctor: {doctor} | Speciality: {spec} | Institution: {inst} |
                Branch: {loc} | Department: {dept}
              </div>
            </>
          );
        }
      }}
      filterContent={({ values, setValue }) => (
        <>
          {/* Force the date filter onto its own row; other filters + Search/Clear stay on the next row (within FilterWrapper). */}
          <div className="basis-full shrink-0">
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
          {/* <div className='flex flex-wrap gap-3'> */}
            <Combobox
              label="Doctor"
              options={doctorOptions}
              value={values.doctorId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('doctorId', v)}
            />
            <Combobox
              label="Speciality"
              options={specialityOptions}
              value={values.specialityId ?? '__all__'}
              defaultValue="__all__"
              onChange={(v) => setValue('specialityId', v)}
            />
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
          {/* </div> */}
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
        'Leave Date',
        'Leave Sessions',
        'Leave Remark',
        'Leave Creator',
        'Leave Create At',
        'Leave Updater',
        'Leave Update At',
        'Status'
      ]}
      exportKeys={
        [
          'doctorCode',
          'doctorName',
          'leaveDate',
          'leaveSessions',
          'leaveRemark',
          'leaveCreator',
          'leaveCreatorAt',
          'leaveUpdator',
          'leaveUpdatorAt',
          'status'
        ] as (keyof DoctorLeaveReportExportRow)[]
      }
      exportTitle="Doctor Leave Report"
      exportFileName="doctor-leave-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No doctor leave records found. Apply filters and click Search."
      skipFetchWhenNoParams={true}
      groupBy={(row) => row.doctor?.id ?? ''}
      renderGroupHeader={(_, rows) => {
        const first = rows[0] as DoctorLeaveReportRow;
        const code = first?.doctor?.code ?? '-';
        const name = first?.doctor?.name ?? '-';
        return `${code} – ${name}`;
      }}
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
