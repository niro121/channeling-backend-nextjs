'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { ReportAgentSelect } from '@/components/common/agent-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  getAgentDetailReportData,
  exportAgentDetailReportData
} from '@/app/actions/reports/agent-detail.action';
import { Agency } from '@/types/agency';
import { ExportAgentDetailData } from '@/types/report';
import { AgentDetailReportColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';
import { formatLKR } from '@/lib/format-money';

type AgentDetailReportContentProps = {
  initialAgencyOptions: Array<{ id: string; name: string }>;
  initialStatusOptions: Array<{ id: string; name: string }>;
};

function AgentDetailReportContentInner({
  initialAgencyOptions,
  initialStatusOptions
}: AgentDetailReportContentProps) {
  const searchParams = useSearchParams();
  
  const buildQuery = () => ({
    fromDate: searchParams.get('fromDate') ?? '',
    toDate: searchParams.get('toDate') ?? '',
    agencyId:
      searchParams.get('agencyId') && searchParams.get('agencyId') !== '__all__'
        ? searchParams.get('agencyId') ?? undefined
        : undefined,
    status:
      searchParams.get('status') && searchParams.get('status') !== '__all__'
        ? searchParams.get('status') ?? undefined
        : undefined
  });

  return (
    <ReportTemplate<Agency, ExportAgentDetailData>
      title="Agent Detail Report"
      description="View agent information with filters"
      filterButtonLabel="Search"
      totalColumnIds={['allowedCreditLimit', 'maxCreditLimit', 'standardCreditLimit', 'balance']}
      formatTotalValue={(_columnId, sum) => <span className="tabular-nums">{formatLKR(sum)}</span>}
      filterContent={({ values, setValue }) => (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end w-[260px] [&_button]:w-full">
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
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end w-[260px]">
              <label className="text-sm text-black font-semibold mb-2 block">
                Status
              </label>
              <Select
                value={values.status ?? '__all__'}
                onValueChange={(value) => setValue('status', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {initialStatusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end w-[260px]">
              <label className="text-sm text-black font-semibold mb-2 block">
                Agency
              </label>
              <ReportAgentSelect
                label="Agency"
                agentOptions={initialAgencyOptions.filter((o) => o.id !== '__all__')}
                value={values.agencyId ?? '__all__'}
                onChange={(v) => setValue('agencyId', v)}
              />
            </div>
          </div>
        </>
      )}
      fetchData={async (params) => {
        const fromDate = params.get('fromDate') ?? '';
        const toDate = params.get('toDate') ?? '';

        if (!fromDate || !toDate) {
          return {
            success: false,
            data: [],
            totalRecords: 0,
            message: 'Please select both from date and to date'
          };
    }

        return getAgentDetailReportData({
      fromDate,
      toDate,
          agencyId:
            params.get('agencyId') && params.get('agencyId') !== '__all__'
              ? params.get('agencyId') ?? undefined
              : undefined,
          status:
            params.get('status') && params.get('status') !== '__all__'
              ? params.get('status') ?? undefined
              : undefined
    });
      }}
      exportData={async () => {
        const query = buildQuery();
        if (!query.fromDate || !query.toDate) {
          return { success: false, message: 'Please select both from date and to date' };
        }
        return exportAgentDetailReportData(query);
      }}
      columns={AgentDetailReportColumns}
      exportColumns={[
    'Created',
    'Agent Code',
    'Agent Name',
    'Status',
    'Address',
    'Phone',
    'Fax',
    'E-Mail',
    'Contact Person',
    'Contact Phone',
    'Contact Person E-mail',
    'Allowed Credit Limit',
    'Allowed Maximum Credit Limit',
    'Standard Credit Limit',
    'Balance'
      ]}
      exportKeys={[
    'created',
    'agentCode',
    'agentName',
    'status',
    'address',
    'phone',
    'fax',
    'email',
    'contactPerson',
    'contactPhone',
    'contactPersonEmail',
    'allowedCreditLimit',
    'maxCreditLimit',
    'standardCreditLimit',
    'balance'
      ]}
      exportTitle="Agent Detail Report"
      exportFileName="agent-detail-report"
      getRowId={(row) => row.id ?? ''}
      showPrintButton={true}
      emptyMessage="No data available. Please apply filters and search."
      skipFetchWhenNoParams={true}
    />
                      );
}

export default function AgentDetailReportContent(
  props: AgentDetailReportContentProps
) {
                        return (
    <Suspense fallback={<Loading />}>
      <AgentDetailReportContentInner {...props} />
    </Suspense>
  );
}
