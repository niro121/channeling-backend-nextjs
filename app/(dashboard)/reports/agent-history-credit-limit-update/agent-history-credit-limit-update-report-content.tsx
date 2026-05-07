'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReportUserSelect } from '@/components/common/user-select';
import { ReportAgentSelect } from '@/components/common/agent-select';
import {
  getAgentHistoryCreditLimitUpdateReportData,
  exportAgentHistoryCreditLimitUpdateReportData,
} from '@/app/actions/reports/agent-history-credit-limit-update.report.action';
import type {
  AgentHistoryCreditLimitUpdateReportExportRow,
  AgentHistoryCreditLimitUpdateReportQuery,
  AgentHistoryCreditLimitUpdateReportRow,
} from '@/types/reports/agent-history-credit-limit-update';
import { AgentHistoryCreditLimitUpdateColumns } from './columns';
import Loading from '@/app/(dashboard)/loading';

type Props = {
  agentOptions: Array<{ id: string; name: string }>;
  userOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};

function ContentInner({ agentOptions, userOptions, currentUserName }: Props) {
  const searchParams = useSearchParams();

  const buildQuery = (): AgentHistoryCreditLimitUpdateReportQuery => ({
    agencyId: searchParams.get('agencyId') ?? '__all__',
    limitType: searchParams.get('limitType') ?? '__all__',
    changedByUserId: searchParams.get('changedByUserId') ?? '__all__',
  });

  return (
    <ReportTemplate<AgentHistoryCreditLimitUpdateReportRow, AgentHistoryCreditLimitUpdateReportExportRow>
      title="Agent History(Credit Limit Update)"
      description="Tracks changes to agent soft/hard credit limits (from activity log)."
      filterButtonLabel="Search"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const agencyId = values.agencyId ?? '__all__';
          const limitType = values.limitType ?? '__all__';
          const changedByUserId = values.changedByUserId ?? '__all__';

          const agentLabel =
            agencyId === '__all__'
              ? 'All Agents'
              : agentOptions.find((a) => a.id === agencyId)?.name ?? agencyId;
          const userLabel =
            changedByUserId === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === changedByUserId)?.name ?? changedByUserId;
          const limitTypeLabel =
            limitType === 'soft' ? 'Soft' : limitType === 'hard' ? 'Hard' : 'All';

          return (
            <>
              <div>
                Agent: {agentLabel} | Limit type: {limitTypeLabel} | Changed by: {userLabel}
              </div>
            </>
          );
        },
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-shrink-0">
            <label className="text-sm font-semibold mb-2 block">Agent</label>
            <div className="w-[260px] [&_button]:w-full">
              <ReportAgentSelect
                label="All Agents"
                agentOptions={agentOptions}
                value={values.agencyId ?? '__all__'}
                onChange={(v) => setValue('agencyId', v)}
              />
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className="text-sm font-semibold mb-2 block">Limit type</label>
            <Select
              value={values.limitType ?? '__all__'}
              onValueChange={(v) => setValue('limitType', v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="soft">Soft</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ReportUserSelect
            userOptions={userOptions}
            value={values.changedByUserId ?? '__all__'}
            onChange={(v) => setValue('changedByUserId', v)}
            label="Changed by"
            widthClassName="w-[240px]"
          />
        </div>
      )}
      fetchData={async (params) => {
        const query: AgentHistoryCreditLimitUpdateReportQuery = {
          agencyId: params.get('agencyId') ?? '__all__',
          limitType: params.get('limitType') ?? '__all__',
          changedByUserId: params.get('changedByUserId') ?? '__all__',
        };
        return getAgentHistoryCreditLimitUpdateReportData(query);
      }}
      exportData={async () => exportAgentHistoryCreditLimitUpdateReportData(buildQuery())}
      columns={AgentHistoryCreditLimitUpdateColumns}
      exportColumns={[
        'No.',
        'Agent',
        'Agent Code',
        'Limit Type',
        'Hard Limit Field',
        'Before Value',
        'Updated Value',
        'Delta',
        'Changed by',
        'Date & Time',
      ]}
      exportKeys={
        [
          'no',
          'agent',
          'agentCode',
          'limitType',
          'hardLimitField',
          'beforeValue',
          'updatedValue',
          'delta',
          'changedBy',
          'dateTime',
        ] as (keyof AgentHistoryCreditLimitUpdateReportExportRow)[]
      }
      exportTitle="Agent History(Credit Limit Update)"
      exportFileName="agent-history-credit-limit-update"
      getRowId={(row) => row.id}
      emptyMessage="No credit limit changes found. Select filters and click Search."
      initialEmptyMessage="No credit limit changes found. Select filters and click Search."
      skipFetchWhenNoParams={true}
    />
  );
}

export default function AgentHistoryCreditLimitUpdateReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}

