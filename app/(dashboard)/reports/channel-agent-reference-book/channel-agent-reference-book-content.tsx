'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/common/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getChannelAgentReferenceBookReportData, exportChannelAgentReferenceBookReportData } from '@/app/actions/reports/report.action';
import { AgencyBook } from '@/types/agencybook';
import { ExportChannelAgentReferenceBookData } from '@/types/report';
import { ChannelAgentReferenceBookReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';

export type ChannelAgentReferenceBookReportContentProps = {
  initialAgencyOptions: Array<{ id: string; name: string }>;
};

function ChannelAgentReferenceBookReportContentInner({
  initialAgencyOptions
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
                Date Range
              </label>
              <DateRangePicker
                from={values.fromDate}
                to={values.toDate}
                onChange={({ from, to }) => {
                  setValue('fromDate', from);
                  setValue('toDate', to);
                }}
              />
            </div>
            <div className="flex-shrink-0" style={{ minWidth: '240px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Agent
              </label>
              <Combobox
                label="Agent"
                options={initialAgencyOptions}
                value={values.agencyId ?? '__all__'}
                defaultValue="__all__"
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
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end" style={{ minWidth: '220px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Created By
              </label>
              <Input
                id="createdBy"
                placeholder="User name or code"
                value={values.createdBy ?? ''}
                onChange={(e) => setValue('createdBy', e.target.value || undefined)}
              />
            </div>
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end" style={{ minWidth: '220px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Updated By
              </label>
              <Input
                id="updatedBy"
                placeholder="User name or code"
                value={values.updatedBy ?? ''}
                onChange={(e) => setValue('updatedBy', e.target.value || undefined)}
              />
            </div>
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
          createdBy: params.get('createdBy')?.trim() ? params.get('createdBy')?.trim() : undefined,
          updatedBy: params.get('updatedBy')?.trim() ? params.get('updatedBy')?.trim() : undefined,
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
          createdBy: query.createdBy?.trim() ? query.createdBy.trim() : undefined,
          updatedBy: query.updatedBy?.trim() ? query.updatedBy.trim() : undefined,
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
