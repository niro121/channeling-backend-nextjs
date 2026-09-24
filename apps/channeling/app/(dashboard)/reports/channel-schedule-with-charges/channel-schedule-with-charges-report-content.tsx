'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import { toBrandedPdfSummaryItems } from '@/components/common/report-print';
import Loading from '@/app/(dashboard)/loading';
import {
  getChannelScheduleWithChargesReportData,
  exportChannelScheduleWithChargesReportData
} from '@/app/actions/reports/channel-schedule-with-charges.report.action';
import { ChannelScheduleWithChargesColumns } from './columns';
import { ChannelScheduleWithChargesPrintLayout } from './channel-schedule-with-charges-print-layout';
import { downloadChannelScheduleWithChargesReportPdf } from './channel-schedule-with-charges-pdf';
import { downloadChannelScheduleWithChargesReportExcel } from './channel-schedule-with-charges-excel';
import {
  CHANNEL_SCHEDULE_EXPORT_COLUMNS,
  CHANNEL_SCHEDULE_EXPORT_KEYS,
} from './channel-schedule-with-charges-export-config';
import type {
  ChannelScheduleWithChargesReportContentProps,
  ChannelScheduleWithChargesReportExportRow,
  ChannelScheduleWithChargesReportQuery,
  ChannelScheduleWithChargesReportRow
} from '@/types/reports/channel-schedule-with-charges';

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

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

  const buildSummaryItems = React.useCallback(
    (values: Record<string, string | undefined>) => {
      const branchOpts = withAllBranchesOptions(props.locationOptions);
      const rtId = values.reportType ?? '__all__';
      return [
        {
          label: 'Institution',
          value: filterOptionLabel(
            values.institutionId,
            'All Institutions',
            props.institutionOptions
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
            props.departmentOptions
          ),
        },
        {
          label: 'Doctor',
          value: filterOptionLabel(values.doctorId, 'All Doctors', props.doctorOptions),
        },
        {
          label: 'Speciality',
          value: filterOptionLabel(
            values.specialityId,
            'All Specialities',
            props.specialityOptions
          ),
        },
        {
          label: 'Type',
          value:
            rtId === '__all__' || rtId === ''
              ? 'All report types'
              : reportTypeOptions.find((o) => o.id === rtId)?.name ?? rtId,
        },
      ];
    },
    [props, reportTypeOptions]
  );

  const handlePdfDownload = React.useCallback(
    async (args: {
      title: string;
      data: ChannelScheduleWithChargesReportExportRow[];
      columns: string[];
      keys: (keyof ChannelScheduleWithChargesReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadChannelScheduleWithChargesReportPdf({
        reportName: 'Channel schedule with charges',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(buildQuery())),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
      });
    },
    [buildSummaryItems]
  );

  const handleExcelDownload = React.useCallback(
    async (args: {
      title: string;
      data: ChannelScheduleWithChargesReportExportRow[];
      columns: string[];
      keys: (keyof ChannelScheduleWithChargesReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadChannelScheduleWithChargesReportExcel({
        reportName: 'Channel schedule with charges',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(buildQuery())),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
        sheetName: (args.title || 'Schedule Charges').slice(0, 31),
      });
    },
    [buildSummaryItems]
  );

  return (
    <ReportTemplate<ChannelScheduleWithChargesReportRow, ChannelScheduleWithChargesReportExportRow>
      title="Channel schedule with charges"
      description="View doctor sessions with charge breakdown, filtered by institution, branch, department, speciality, doctor, and report type."
      filterButtonLabel="Search"
      printPageSize="A4 portrait"
      containerClassName="container mx-auto py-3 space-y-4 channel-schedule-charges-report-root"
      renderPrintContent={(rows) => <ChannelScheduleWithChargesPrintLayout rows={rows} />}
      customDownloadPdf={handlePdfDownload}
      customDownloadExcel={handleExcelDownload}
      generationDetails={{
        generatedBy: props.currentUserName,
        formatFilters: (values) => {
          const branchOpts = withAllBranchesOptions(props.locationOptions);
          const inst = filterOptionLabel(
            values.institutionId,
            'All Institutions',
            props.institutionOptions
          );
          const loc = filterOptionLabel(
            values.locationId,
            'All Branches',
            branchOpts
          );
          const dept = filterOptionLabel(
            values.departmentId,
            'All Departments',
            props.departmentOptions
          );
          const doctor = filterOptionLabel(
            values.doctorId,
            'All Doctors',
            props.doctorOptions
          );
          const spec = filterOptionLabel(
            values.specialityId,
            'All Specialities',
            props.specialityOptions
          );
          const rtId = values.reportType ?? '__all__';
          const reportType =
            rtId === '__all__' || rtId === ''
              ? 'All report types'
              : reportTypeOptions.find((o) => o.id === rtId)?.name ?? rtId;
          return (
            <>
              <div>
                Institution: {inst} | Branch: {loc} | Department: {dept}
              </div>
              <div>
                Doctor: {doctor} | Speciality: {spec} | Report type: {reportType}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
      }}
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
            <Combobox
              label="Branch (Site)"
              options={withAllBranchesOptions(props.locationOptions)}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('locationId', v)}
            />
            <Combobox
              label="Department"
              options={props.departmentOptions}
              value={values.departmentId ?? '__all__'}
              onChange={(v) => setValue('departmentId', v)}
            />
            <Combobox
              label="Doctors"
              options={props.doctorOptions}
              value={values.doctorId ?? '__all__'}
              onChange={(v) => setValue('doctorId', v)}
            />
            <Combobox
              label="Specialities"
              options={props.specialityOptions}
              value={values.specialityId ?? '__all__'}
              onChange={(v) => setValue('specialityId', v)}
            />
            <Selector
              label="All Report Types"
              options={reportTypeOptions}
              value={values.reportType ?? '__all__'}
              onChange={(v) => setValue('reportType', v)}
              className={{ trigger: 'self-end!' }}
            />
            {/* Keeps the URL non-empty when every dropdown is "All", so Search is not treated as "not yet run". */}
            <input type="hidden" name="searched" value="1" readOnly data-filter-include="" />
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
      exportColumns={CHANNEL_SCHEDULE_EXPORT_COLUMNS}
      exportKeys={
        CHANNEL_SCHEDULE_EXPORT_KEYS as (keyof ChannelScheduleWithChargesReportExportRow)[]
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

