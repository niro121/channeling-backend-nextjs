'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
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
import { formatReportRangeLabel } from '@/lib/format-report-range-label';

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

/** Default from = today 00:00, to = today 23:59 in YYYY-MM-DDTHH:mm for datetime-local (same as channel booking details). */
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

function DoctorLeaveReportContentInner({
  currentUserName,
  institutionOptions,
  locationOptions,
  departmentOptions,
  specialityOptions,
  doctorOptions
}: DoctorLeaveReportContentProps) {
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
          /* Full printable width — same as PDF with 5mm side margins */
          .doctor-leave-report-root,
          .doctor-leave-report-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .doctor-leave-report-root .rpt-template-card,
          .doctor-leave-report-root .rpt-print-root,
          .doctor-leave-report-root .rpt-print-body,
          .doctor-leave-report-root .rpt-print-header,
          .doctor-leave-report-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .doctor-leave-report-root .overflow-x-auto,
          .doctor-leave-report-root .overflow-auto,
          .doctor-leave-report-root .overflow-hidden,
          .doctor-leave-report-root .rounded-lg,
          .doctor-leave-report-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /* Body table — match compact branded PDF (5.5pt / 5pt, fixed proportions) */
          .doctor-leave-report-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          /* Code | Name | Branch | Date | Session | Remark | Updater | Creator */
          .doctor-leave-report-root .rpt-print-root table th:nth-child(1),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(1) { width: 9% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(2),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(2) { width: 14% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(3),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(3) { width: 11% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(4),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(4) { width: 8% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(5),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(5) { width: 16% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(6),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(6) { width: 12% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(7),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(7) { width: 15% !important; }
          .doctor-leave-report-root .rpt-print-root table th:nth-child(8),
          .doctor-leave-report-root .rpt-print-root table td:nth-child(8) { width: 15% !important; }

          .doctor-leave-report-root .rpt-print-root th,
          .doctor-leave-report-root .rpt-print-root td {
            font-size: 5.5pt !important;
            padding: 0.7mm 0.5mm !important;
            line-height: 1.2 !important;
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
          .doctor-leave-report-root .rpt-print-root thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-leave-report-root .rpt-print-root th:first-child,
          .doctor-leave-report-root .rpt-print-root td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .doctor-leave-report-root .rpt-print-root th:last-child,
          .doctor-leave-report-root .rpt-print-root td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .doctor-leave-report-root .rpt-print-root svg {
            display: none !important;
          }
          .doctor-leave-report-root .rpt-print-root [class*="truncate"],
          .doctor-leave-report-root .rpt-print-root .whitespace-nowrap,
          .doctor-leave-report-root .rpt-print-root [class*="max-w-"] {
            overflow: visible !important;
            text-overflow: clip !important;
            white-space: normal !important;
            max-width: none !important;
            width: auto !important;
          }
          .doctor-leave-report-root .rpt-print-root .text-muted-foreground {
            color: #333 !important;
          }
          .doctor-leave-report-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <ReportTemplate<DoctorLeaveReportRow, DoctorLeaveReportExportRow>
      title="Doctor Leave Report"
      description="View doctor leave records with date range and filter by institution, branch, department, speciality, and doctor"
      filterButtonLabel="Search"
      printPageSize="A4 portrait"
      printPageMargins="7mm 5mm 18mm"
      pdfPageMarginMm={5}
      containerClassName="container mx-auto py-3 space-y-4 doctor-leave-report-root"
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
        },
        formatPrintSummaryItems: (values) => {
          const branchOpts = withAllBranchesOptions(locationOptions);
          const from = values.fromDateTime ?? '';
          const to = values.toDateTime ?? '';
          return [
            {
              label: 'Period',
              value:
                from && to ? formatReportRangeLabel(from, to) : `${from || '—'} to ${to || '—'}`,
              fullWidth: true,
            },
            {
              label: 'Doctor',
              value: filterOptionLabel(values.doctorId, 'All Doctors', doctorOptions),
            },
            {
              label: 'Speciality',
              value: filterOptionLabel(
                values.specialityId,
                'All Specialities',
                specialityOptions
              ),
            },
            {
              label: 'Institution',
              value: filterOptionLabel(
                values.institutionId,
                'All Institutions',
                institutionOptions
              ),
            },
            {
              label: 'Branch',
              value: filterOptionLabel(values.locationId, 'All Branches', branchOpts),
            },
            {
              label: 'Department',
              value: filterOptionLabel(
                values.departmentId,
                'All Departments',
                departmentOptions
              ),
            },
          ];
        },
      }}
      filterContent={({ values, setValue }) => (
        <>
          {/* Force the date filter onto its own row; other filters + Search/Clear stay on the next row (within FilterWrapper). */}
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
        'Branch',
        'Leave Date',
        'Leave Session',
        'Leave Remark',
        'Leave Updater',
        'Leave Creator',
      ]}
      exportKeys={
        [
          'doctorCode',
          'doctorName',
          'branch',
          'leaveDate',
          'leaveSessions',
          'leaveRemark',
          'leaveUpdator',
          'leaveCreator',
        ] as (keyof DoctorLeaveReportExportRow)[]
      }
      exportTitle="Doctor Leave Report"
      exportFileName="doctor-leave-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No doctor leave records found. Apply filters and click Search."
      skipFetchWhenNoParams={true}
      initialFilterValues={initialFilterValues}
      groupBy={(row) => row.doctor?.id ?? ''}
      renderGroupHeader={(_, rows) => {
        const first = rows[0] as DoctorLeaveReportRow;
        const code = first?.doctor?.code ?? '-';
        const name = first?.doctor?.name ?? '-';
        return `${code} – ${name}`;
      }}
    />
    </>
  );
}

export default function DoctorLeaveReportContent(props: DoctorLeaveReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <DoctorLeaveReportContentInner {...props} />
    </Suspense>
  );
}
