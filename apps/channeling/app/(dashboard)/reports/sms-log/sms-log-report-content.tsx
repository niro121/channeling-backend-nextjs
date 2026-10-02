'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateAndTimeRangePicker } from '@/components/common/date-and-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import { Input } from '@/components/ui/input';
import {
  getSmsLogReportData,
  exportSmsLogReportData,
} from '@/app/actions/reports/sms.log.report.action';
import { SmsLogReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading'
import {SmsLogReportExportRow, SmsLogReportContentProps, SmsLogReportRow} from '@/types/reports/sms.log'

function SmsLogReportContentInner({
  institutionOptions,
  locationOptions,
  departmentOptions
}: SmsLogReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDateTime: searchParams.get('fromDateTime') ?? undefined,
    toDateTime: searchParams.get('toDateTime') ?? undefined,
    institutionId: searchParams.get('institutionId') ?? undefined,
    locationId: searchParams.get('locationId') ?? undefined,
    departmentId: searchParams.get('departmentId') ?? undefined,
    reportType: searchParams.get('reportType') ?? undefined,
    phoneNo: searchParams.get('phoneNo') ?? undefined
  });

  const reportTypeOptions = [
    { id: '__all__', name: 'Report Type' },
    { id: 'sent', name: 'Sent' },
    { id: 'fail', name: 'Fail' }
  ];

  return (
    <ReportTemplate<SmsLogReportRow, SmsLogReportExportRow>
      title="SMS Log Report"
      description="View SMS log records with date range and filter by institution, branch, department, report type, and phone number"
      filterButtonLabel="Search"
      initialEmptyMessage="No SMS logs found. Select filters and click Search."
      filterContent={({ values, setValue }) => (
        <>
          {/* Force Date & Time Range to occupy the full first row.
              FilterWrapper renders Search/Clear after children, so this guarantees
              all other filters + buttons sit on the second row. */}
          <div className="basis-full">
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
            options={withAllBranchesOptions(locationOptions, 'Branch')}
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
            label="Report Type"
            options={reportTypeOptions}
            value={values.reportType ?? '__all__'}
            defaultValue="__all__"
            onChange={(v) => setValue('reportType', v)}
          />
          {/* Align the following Search/Clear buttons with the Phone input (not the label),
              without changing shared FilterWrapper styles. */}
          <div className="w-60 self-end [&~button]:self-end">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Phone No</label>
            <Input
              id="phoneNo"
              placeholder="Enter phone number"
              value={values.phoneNo ?? ''}
              onChange={(e) => setValue('phoneNo', e.target.value)}
              className="h-10"
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
          reportType: params.get('reportType') ?? undefined,
          phoneNo: params.get('phoneNo') ?? undefined
        };
        const result = await getSmsLogReportData(query);
        if (!result.success) return result;

        const rows = result.data ?? [];
        if (rows.length === 0) {
          return result;
        }

        const totalSentCount = rows
          .filter((row) => row.status === 0)
          .reduce((sum, row) => sum + (row.count ?? 0), 0);

        const totalRow: SmsLogReportRow = {
          id: '__total__',
          name: 'Total Count',
          phone: '',
          template: '',
          createdAt: new Date(0),
          status: -1,
          count: totalSentCount
        };

        return {
          ...result,
          data: [...rows, totalRow]
        };
      }}
      exportData={async () => exportSmsLogReportData(buildQuery())}
      columns={SmsLogReportColumns}
      exportColumns={[
        'Name',
        'Phone',
        'Template',
        'Created Date',
        'Status',
        'Count'
      ]}
      exportKeys={
        [
          'name',
          'phone',
          'template',
          'createdDate',
          'status',
          'count'
        ] as (keyof SmsLogReportExportRow)[]
      }
      exportTitle="SMS Log Report"
      exportFileName="sms-log-report"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No SMS log records found. Apply filters and click Search."
      skipFetchWhenNoParams={true}
    />
  );
}

export default function SmsLogReportContent(props: SmsLogReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <SmsLogReportContentInner {...props} />
    </Suspense>
  );
}
