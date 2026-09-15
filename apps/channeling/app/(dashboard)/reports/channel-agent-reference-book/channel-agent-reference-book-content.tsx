'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Input } from '@/components/ui/input';
import { ReportAgentSelect } from '@/components/common/agent-select';
import { ReportUserSelect } from '@/components/common/user-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getChannelAgentReferenceBookReportData, exportChannelAgentReferenceBookReportData } from '@/app/actions/reports/report.action';
import { AgencyBook } from '@/types/agencybook';
import { ExportChannelAgentReferenceBookData } from '@/types/report';
import { ChannelAgentReferenceBookReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';

export type ChannelAgentReferenceBookReportContentProps = {
  initialAgencyOptions: Array<{ id: string; name: string }>;
  initialUserOptions: Array<{ id: string; name: string }>;
};

/** Default from = today 00:00, to = today 23:59 in YYYY-MM-DDTHH:mm for datetime-local */
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

function ChannelAgentReferenceBookReportContentInner({
  initialAgencyOptions,
  initialUserOptions
}: ChannelAgentReferenceBookReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    fromDate: searchParams.get('fromDate') ?? undefined,
    toDate: searchParams.get('toDate') ?? undefined,
    agencyId: searchParams.get('agencyId') ?? undefined,
    bookNumber: searchParams.get('bookNumber') ?? undefined,
    createdBy: searchParams.get('createdBy') ?? undefined,
    updatedBy: searchParams.get('updatedBy') ?? undefined,
    status: searchParams.get('status') ?? undefined
  });

  return (
    <ReportTemplate<AgencyBook, ExportChannelAgentReferenceBookData>
      title="Channel Agent Reference Book"
      description="View channel agent reference book information with filters"
      filterButtonLabel="Search"
      filterContent={({ values, setValue }) => (
        <>
          <div className="basis-full flex flex-wrap items-end gap-3">
            <div className="flex-shrink-0">
              <label className="text-sm text-black font-semibold mb-2 block">
                Date & Time Range
              </label>
              <DateTimeRangePicker
                from={values.fromDate}
                to={values.toDate}
                onChange={({ from, to }) => {
                  setValue('fromDate', from);
                  setValue('toDate', to);
                }}
                label=""
              />
            </div>
            <div className="flex-shrink-0" style={{ minWidth: '240px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Agent
              </label>
              <ReportAgentSelect
                label="Agent"
                agentOptions={initialAgencyOptions.filter((o) => o.id !== '__all__')}
                value={values.agencyId ?? '__all__'}
                onChange={(v) => setValue('agencyId', v)}
              />
            </div>
            <div className="flex-shrink-0" style={{ minWidth: '220px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Book Number
              </label>
              <Input
                id="bookNumber"
                placeholder="Enter book number"
                value={values.bookNumber ?? ''}
                onChange={(e) => setValue('bookNumber', e.target.value || undefined)}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <ReportUserSelect
              userOptions={initialUserOptions}
              value={values.createdBy ?? '__all__'}
              onChange={(v) => setValue('createdBy', v ?? '__all__')}
              label="Created By"
              placeholder="Select user"
              widthClassName="w-[220px]"
              includeAllUsers={true}
            />
            <ReportUserSelect
              userOptions={initialUserOptions}
              value={values.updatedBy ?? '__all__'}
              onChange={(v) => setValue('updatedBy', v ?? '__all__')}
              label="Updated By"
              placeholder="Select user"
              widthClassName="w-[220px]"
              includeAllUsers={true}
            />
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end" style={{ minWidth: '180px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Status
              </label>
              <Select
                value={values.status ?? '__all__'}
                onValueChange={(v) => setValue('status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All</SelectItem>
                  <SelectItem value="1">Active</SelectItem>
                  <SelectItem value="0">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
      fetchData={async (params) => {
        const query = {
          fromDate: params.get('fromDate') ?? '',
          toDate: params.get('toDate') ?? '',
          agencyId: params.get('agencyId') && params.get('agencyId') !== '__all__' ? params.get('agencyId') ?? undefined : undefined,
          bookNumber: params.get('bookNumber')?.trim() ? params.get('bookNumber')?.trim() : undefined,
          createdBy: params.get('createdBy') && params.get('createdBy') !== '__all__' ? params.get('createdBy') ?? undefined : undefined,
          updatedBy: params.get('updatedBy') && params.get('updatedBy') !== '__all__' ? params.get('updatedBy') ?? undefined : undefined,
          status: params.get('status') && params.get('status') !== '__all__' ? params.get('status') ?? undefined : undefined
        };
        return getChannelAgentReferenceBookReportData(query);
      }}
      exportData={async () => {
        const query = buildQuery();
        return exportChannelAgentReferenceBookReportData({
          fromDate: query.fromDate ?? '',
          toDate: query.toDate ?? '',
          agencyId: query.agencyId && query.agencyId !== '__all__' ? query.agencyId : undefined,
          bookNumber: query.bookNumber?.trim() ? query.bookNumber.trim() : undefined,
          createdBy: query.createdBy && query.createdBy !== '__all__' ? query.createdBy : undefined,
          updatedBy: query.updatedBy && query.updatedBy !== '__all__' ? query.updatedBy : undefined,
          status: query.status && query.status !== '__all__' ? query.status : undefined
        });
      }}
      columns={ChannelAgentReferenceBookReportColumns}
      exportColumns={[
        'S.No',
        'Agent',
        'Book Number',
        'Utilized Page Count',
        'Starting Reference Number',
        'Ending Reference Number',
        'Created By',
        'Created Date',
        'Updated By',
        'Updated Date',
        'Active'
      ]}
      exportKeys={[
        'sNo',
        'agent',
        'bookNumber',
        'utilizedPageCount',
        'startingReferenceNumber',
        'endingReferenceNumber',
        'createdBy',
        'createdDate',
        'updatedBy',
        'updatedDate',
        'active'
      ]}
      exportTitle="Channel Agent Reference Book Report"
      exportFileName="channel-agent-reference-book-report"
      getRowId={(row) => row.id ?? ''}
      showPrintButton={true}
      emptyMessage="No channel agent reference books found. Apply filters and click Search."
      skipFetchWhenNoParams={true}
      initialFilterValues={{
        fromDate: getDefaultDateTimeRange().from,
        toDate: getDefaultDateTimeRange().to,
      }}
    />
  );
}

export default function ChannelAgentReferenceBookReportContent(props: ChannelAgentReferenceBookReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ChannelAgentReferenceBookReportContentInner {...props} />
    </Suspense>
  );
}
