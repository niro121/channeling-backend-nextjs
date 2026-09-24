'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import {
  getDoctorArrivalsReportData,
  exportDoctorArrivalsReportData
} from '@/app/actions/reports/doctor.arrivals.report.action';
import { DoctorArrivalsReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';
import type {
  DoctorArrivalsReportContentProps,
  DoctorArrivalsReportExportRow,
  DoctorArrivalsReportRow
} from '@/types/reports/doctor.arrivals';

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

/** Default from = today 00:00, to = today 23:59 in YYYY-MM-DDTHH:mm for datetime-local (same as cashier summary). */
function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${d}T00:00`,
    to: `${y}-${m}-${d}T23:59`,
  };
}

function DoctorArrivalsReportContentInner({
  currentUserName,
  institutionOptions,
  locationOptions,
  departmentOptions,
  specialityOptions,
  doctorOptions
}: DoctorArrivalsReportContentProps) {
  const searchParams = useSearchParams();

  const initialFilterValues = React.useMemo(() => {
    const { from, to } = getDefaultDateTimeRange();
    return { fromDateTime: from, toDateTime: to };
  }, []);

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
    <>
      <style>{`
        @media print {
          /* Use full printable width — kill container max-width / auto side margins */
          .doctor-arrivals-report-root,
          .doctor-arrivals-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .doctor-arrivals-report-root .rpt-template-card,
          .doctor-arrivals-report-root .rpt-print-root,
          .doctor-arrivals-report-root .rpt-print-body,
          .doctor-arrivals-report-root .rpt-print-header,
          .doctor-arrivals-report-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }

          .doctor-arrivals-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .doctor-arrivals-report-root .rpt-print-root th,
          .doctor-arrivals-report-root .rpt-print-root td {
            font-size: 6.5pt !important;
            padding: 0.8mm 0.6mm !important;
            line-height: 1.15 !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            overflow: hidden !important;
            text-overflow: clip !important;
            max-width: none !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            vertical-align: top !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-arrivals-report-root .rpt-print-root thead th {
            font-size: 6pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-arrivals-report-root .rpt-print-root th:first-child,
          .doctor-arrivals-report-root .rpt-print-root td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .doctor-arrivals-report-root .rpt-print-root th:last-child,
          .doctor-arrivals-report-root .rpt-print-root td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .doctor-arrivals-report-root .rpt-print-root svg {
            display: none !important;
          }
          .doctor-arrivals-report-root .rpt-print-root [class*="truncate"],
          .doctor-arrivals-report-root .rpt-print-root .whitespace-nowrap,
          .doctor-arrivals-report-root .rpt-print-root .max-w-28,
          .doctor-arrivals-report-root .rpt-print-root .max-w-40,
          .doctor-arrivals-report-root .rpt-print-root [class*="max-w-"] {
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: normal !important;
            max-width: none !important;
          }
          .doctor-arrivals-report-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <ReportTemplate<DoctorArrivalsReportRow, DoctorArrivalsReportExportRow>
      title="Doctor Arrivals Report"
      description="View doctor arrival and departure by session with filters for date & time, institution, branch, department, speciality, and doctor"
      filterButtonLabel="Search"
      printPageSize="A4 portrait"
      printPageMargins="7mm 5mm 12mm"
      containerClassName="container mx-auto py-3 space-y-4 doctor-arrivals-report-root"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const from = values.fromDateTime ?? '';
          const to = values.toDateTime ?? '';
          const branchOpts = withAllBranchesOptions(locationOptions);
          const doctor = filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions);
          const spec = filterOptionLabel(values.specialityId, 'All Specialities', specialityOptions);
          const inst = filterOptionLabel(values.institutionId, 'All Institutions', institutionOptions);
          const loc = filterOptionLabel(values.locationId, 'All Branches', branchOpts);
          const dept = filterOptionLabel(values.departmentId, 'All Departments', departmentOptions);
          return (
            <>
              <div>
                Date & time range: {from || '—'} to {to || '—'}
              </div>
              <div>
                Doctor: {doctor} | Speciality: {spec} | Institution: {inst} | Branch: {loc} | Department:{' '}
                {dept}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => {
          const branchOpts = withAllBranchesOptions(locationOptions);
          return [
            {
              label: 'Period',
              value: `${values.fromDateTime || '—'} to ${values.toDateTime || '—'}`,
              fullWidth: true,
            },
            {
              label: 'Doctor',
              value: filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions),
            },
            {
              label: 'Speciality',
              value: filterOptionLabel(values.specialityId, 'All Specialities', specialityOptions),
            },
            {
              label: 'Institution',
              value: filterOptionLabel(values.institutionId, 'All Institutions', institutionOptions),
            },
            {
              label: 'Branch',
              value: filterOptionLabel(values.locationId, 'All Branches', branchOpts),
            },
            {
              label: 'Department',
              value: filterOptionLabel(values.departmentId, 'All Departments', departmentOptions),
            },
          ];
        },
      }}
      filterContent={({ values, setValue }) => (
        <>
          <div className="basis-full shrink-0">
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
        return getDoctorArrivalsReportData(query);
      }}
      exportData={async () => exportDoctorArrivalsReportData(buildQuery())}
      columns={DoctorArrivalsReportColumns}
      exportColumns={[
        'Doctor Code',
        'Doctor Name',
        'Room Allocated By',
        'Session Date',
        'Session Start Time',
        'Session Status',
        'Doctor Arrival Time',
        'Doctor Departure Time',
        'Room Released By',
        'Room Number'
      ]}
      exportKeys={
        [
          'doctorCode',
          'doctorName',
          'roomAllocatedBy',
          'sessionDate',
          'sessionStartTime',
          'sessionStatus',
          'doctorArrivalTime',
          'doctorDepartureTime',
          'roomReleasedBy',
          'roomNumber'
        ] as (keyof DoctorArrivalsReportExportRow)[]
      }
      exportTitle="Doctor Arrivals Report"
      exportFileName="doctor-arrivals-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No sessions found. Apply at least one filter and click Search."
      skipFetchWhenNoParams={true}
      initialFilterValues={initialFilterValues}
      groupBy={(row) => row.doctor?.id ?? ''}
      renderGroupHeader={(_, rows) => {
        const first = rows[0] as DoctorArrivalsReportRow;
        const code = first?.doctor?.code ?? '-';
        const name = first?.doctor?.name ?? '-';
        return `${code} – ${name}`;
      }}
    />
    </>
  );
}

export default function DoctorArrivalsReportContent(props: DoctorArrivalsReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <DoctorArrivalsReportContentInner {...props} />
    </Suspense>
  );
}
