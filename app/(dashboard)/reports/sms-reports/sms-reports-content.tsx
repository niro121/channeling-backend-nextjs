'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { Input } from '@/components/ui/input';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import Loading from '@/app/(dashboard)/loading';
import { getSmsReportData, exportSmsReportData } from '@/app/actions/reports/sms.report.action';
import { SmsReportsColumns } from './columns';
import {
  SmsReportExportRow,
  SmsReportQuery,
  SmsReportRow,
  SmsReportsContentProps,
} from '@/types/reports/sms.report';

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

function SmsReportsContentInner({ currentUserName, locationOptions }: SmsReportsContentProps) {
  const searchParams = useSearchParams();
  const defaultRange = React.useMemo(() => getDefaultDateTimeRange(), []);
  const branchOptions = React.useMemo(() => withAllBranchesOptions(locationOptions, 'Branch'), [locationOptions]);
  const statusOptions = [
    { id: 'all', name: 'All Status' },
    { id: 'sent', name: 'Sent' },
    { id: 'failed', name: 'Failed' },
  ];

  const buildQuery = (): SmsReportQuery => ({
    fromDateTime: searchParams.get('fromDateTime') ?? defaultRange.from,
    toDateTime: searchParams.get('toDateTime') ?? defaultRange.to,
    status: (searchParams.get('status') as SmsReportQuery['status']) ?? 'all',
    locationId: searchParams.get('locationId') ?? undefined,
    phoneNo: searchParams.get('phoneNo') ?? undefined,
  });

  return (
    <ReportTemplate<SmsReportRow, SmsReportExportRow>
      title="SMS Reports"
      description="View SMS logs by date & time range, branch, status, and phone number"
      filterButtonLabel="Search"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const locId = values.locationId ?? '__all__';
          const branchDisplay =
            locId === '__all__' || !locId
              ? 'All Branches'
              : branchOptions.find((o) => o.id === locId)?.name ?? locId;
          return (
            <>
              <div>
                Date & time range: {values.fromDateTime ?? defaultRange.from} to {values.toDateTime ?? defaultRange.to}
              </div>
              <div>
                Branch: {branchDisplay} | Status:{' '}
                {values.status === 'sent' ? 'Sent' : values.status === 'failed' ? 'Failed' : 'All Status'}
                {values.phoneNo?.trim() ? ` | Phone: ${values.phoneNo.trim()}` : ''}
              </div>
            </>
          );
        },
      }}
      initialFilterValues={{
        fromDateTime: defaultRange.from,
        toDateTime: defaultRange.to,
        status: 'all',
        locationId: '__all__',
        phoneNo: '',
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex min-w-0 flex-1 flex-nowrap items-end gap-3 overflow-x-auto pb-0.5">
          {/* min-width must fit singleRow From+To (labels + 2× datetime-local); a smaller cap caused To to overflow into Branch */}
          <div className="shrink-0 min-w-[min(100%,28rem)]">
            <DateTimeRangePicker
              label="Date & Time Range"
              from={values.fromDateTime}
              to={values.toDateTime}
              singleRow
              onChange={({ from, to }) => {
                setValue('fromDateTime', from);
                setValue('toDateTime', to);
              }}
            />
          </div>
          <div className="w-[200px] shrink-0">
            <Combobox
              label="Branch"
              options={branchOptions}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('locationId', v ?? '__all__')}
            />
          </div>
          <Selector
            label="Status"
            options={statusOptions}
            value={values.status ?? 'all'}
            onChange={(v) => setValue('status', v)}
            className={{
              trigger: 'self-end!',
            }}
          />
          <div className="w-44 shrink-0 self-end">
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">Phone No</label>
            <Input
              id="phoneNo"
              placeholder="Search phone"
              value={values.phoneNo ?? ''}
              onChange={(e) => setValue('phoneNo', e.target.value)}
              className="h-10"
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: SmsReportQuery = {
          fromDateTime: params.get('fromDateTime') ?? defaultRange.from,
          toDateTime: params.get('toDateTime') ?? defaultRange.to,
          status: (params.get('status') as SmsReportQuery['status']) ?? 'all',
          locationId: params.get('locationId') ?? undefined,
          phoneNo: params.get('phoneNo') ?? undefined,
        };
        return getSmsReportData(query);
      }}
      exportData={async () => exportSmsReportData(buildQuery())}
      columns={SmsReportsColumns}
      exportColumns={['Date / Time', 'Status', 'Source', 'Phone', 'Message', 'Count']}
      exportKeys={['dateTime', 'status', 'source', 'phone', 'message', 'count'] as (keyof SmsReportExportRow)[]}
      exportTitle="SMS Reports"
      exportFileName="sms-reports"
      getRowId={(row) => row.id}
      showPrintButton={true}
      emptyMessage="No SMS records found for the selected filters."
      totalColumnIds={['count']}
      formatTotalValue={(_, sum) => <span className="font-semibold">{sum.toLocaleString()}</span>}
      getTotalNumericValue={(row, columnId) => (columnId === 'count' ? row.count ?? 0 : 0)}
    />
  );
}

export default function SmsReportsContent(props: SmsReportsContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <SmsReportsContentInner {...props} />
    </Suspense>
  );
}
