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
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { toBrandedPdfSummaryItems } from '@/components/common/report-print';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
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
import { AgentHistoryCreditLimitUpdatePrintLayout } from './agent-history-credit-limit-update-print-layout';
import { downloadAgentHistoryCreditLimitUpdateReportPdf } from './agent-history-credit-limit-update-pdf';
import { downloadAgentHistoryCreditLimitUpdateReportExcel } from './agent-history-credit-limit-update-excel';
import Loading from '@/app/(dashboard)/loading';

type Props = {
  agentOptions: Array<{ id: string; name: string }>;
  userOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
};

/** Default from = today 00:00, to = today 23:59 in YYYY-MM-DDTHH:mm. */
function getDefaultDateTimeRange(): { fromDateTime: string; toDateTime: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { fromDateTime: `${y}-${m}-${d}T00:00`, toDateTime: `${y}-${m}-${d}T23:59` };
}

function limitTypeFilterLabel(limitType: string): string {
  if (limitType === 'soft') return 'Soft';
  if (limitType === 'hard') return 'Hard';
  if (limitType === 'credit') return 'Credit';
  return 'All';
}

function periodFilterLabel(fromDateTime?: string, toDateTime?: string): string {
  const from = (fromDateTime ?? '').trim();
  const to = (toDateTime ?? '').trim();
  if (from && to) return formatReportRangeLabel(from, to);
  if (!from && !to) return 'All dates';
  return `${from || '—'} to ${to || '—'}`;
}

function ContentInner({ agentOptions, userOptions, currentUserName }: Props) {
  const searchParams = useSearchParams();
  const defaultRange = getDefaultDateTimeRange();

  const buildQuery = (): AgentHistoryCreditLimitUpdateReportQuery => ({
    agencyId: searchParams.get('agencyId') ?? '__all__',
    limitType: searchParams.get('limitType') ?? '__all__',
    changedByUserId: searchParams.get('changedByUserId') ?? '__all__',
    fromDateTime: searchParams.get('fromDateTime') ?? defaultRange.fromDateTime,
    toDateTime: searchParams.get('toDateTime') ?? defaultRange.toDateTime,
  });

  const buildSummaryItems = React.useCallback(
    (values: Record<string, string | undefined>): ReportPrintSummaryItem[] => {
      const agencyId = values.agencyId ?? '__all__';
      const limitType = values.limitType ?? '__all__';
      const changedByUserId = values.changedByUserId ?? '__all__';
      return [
        {
          label: 'Period',
          value: periodFilterLabel(values.fromDateTime, values.toDateTime),
          fullWidth: true,
        },
        {
          label: 'Agent',
          value:
            agencyId === '__all__'
              ? 'All Agents'
              : agentOptions.find((a) => a.id === agencyId)?.name ?? agencyId,
        },
        {
          label: 'Limit Type',
          value: limitTypeFilterLabel(limitType),
        },
        {
          label: 'Changed By',
          value:
            changedByUserId === '__all__'
              ? 'All Users'
              : userOptions.find((u) => u.id === changedByUserId)?.name ?? changedByUserId,
        },
      ];
    },
    [agentOptions, userOptions]
  );

  const handlePdfDownload = React.useCallback(
    async (args: {
      title: string;
      data: AgentHistoryCreditLimitUpdateReportExportRow[];
      columns: string[];
      keys: (keyof AgentHistoryCreditLimitUpdateReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadAgentHistoryCreditLimitUpdateReportPdf({
        reportName: 'Agent History(Credit Limit Update)',
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
      data: AgentHistoryCreditLimitUpdateReportExportRow[];
      columns: string[];
      keys: (keyof AgentHistoryCreditLimitUpdateReportExportRow)[];
      fileName?: string;
    }) => {
      await downloadAgentHistoryCreditLimitUpdateReportExcel({
        reportName: 'Agent History(Credit Limit Update)',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(buildQuery())),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
        sheetName: 'Credit Limit History',
      });
    },
    [buildSummaryItems]
  );

  return (
    <ReportTemplate<AgentHistoryCreditLimitUpdateReportRow, AgentHistoryCreditLimitUpdateReportExportRow>
      title="Agent History(Credit Limit Update)"
      description="Tracks changes to agent soft, credit, and hard limits (from activity log)."
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

          return (
            <>
              <div>Range: {periodFilterLabel(values.fromDateTime, values.toDateTime)}</div>
              <div>
                Agent: {agentLabel} | Limit type: {limitTypeFilterLabel(limitType)} | Changed by: {userLabel}
              </div>
            </>
          );
        },
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
      }}
      initialFilterValues={{
        ...getDefaultDateTimeRange(),
        agencyId: '__all__',
        limitType: '__all__',
        changedByUserId: '__all__',
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-shrink-0">
            <DateTimeRangePicker
              label="Date & time range"
              from={values.fromDateTime}
              to={values.toDateTime}
              onChange={({ from, to }) => {
                setValue('fromDateTime', from ?? '');
                setValue('toDateTime', to ?? '');
              }}
            />
          </div>

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
                <SelectItem value="credit">Credit</SelectItem>
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
          fromDateTime: params.get('fromDateTime') ?? defaultRange.fromDateTime,
          toDateTime: params.get('toDateTime') ?? defaultRange.toDateTime,
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
      printPageSize="A4 portrait"
      containerClassName="container mx-auto py-3 space-y-4 agent-history-credit-limit-update-report-root"
      renderPrintContent={(rows) => (
        <AgentHistoryCreditLimitUpdatePrintLayout rows={rows} />
      )}
      customDownloadPdf={handlePdfDownload}
      customDownloadExcel={handleExcelDownload}
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
