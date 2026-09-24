'use client';

import React, { Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { ReportAgentSelect } from '@/components/common/agent-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getAgentDetailReportData,
  exportAgentDetailReportData,
} from '@/app/actions/reports/agent-detail.action';
import { Agency } from '@/types/agency';
import { ExportAgentDetailData } from '@/types/report';
import { toBrandedPdfSummaryItems } from '@/components/common/report-print';
import { AgentDetailReportColumns } from './columns';
import { AgentDetailPrintLayout } from './agent-detail-print-layout';
import { downloadAgentDetailReportPdf } from './agent-detail-pdf';
import { downloadAgentDetailReportExcel } from './agent-detail-excel';
import Loading from '@/app/(dashboard)/loading';
import { formatLKR } from '@/lib/format-money';

type AgentDetailReportContentProps = {
  currentUserName: string;
  initialAgencyOptions: Array<{ id: string; name: string }>;
  initialStatusOptions: Array<{ id: string; name: string }>;
};

function filterOptionLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

function AgentDetailReportContentInner({
  currentUserName,
  initialAgencyOptions,
  initialStatusOptions,
}: AgentDetailReportContentProps) {
  const searchParams = useSearchParams();

  const buildQuery = () => ({
    agencyId:
      searchParams.get('agencyId') && searchParams.get('agencyId') !== '__all__'
        ? (searchParams.get('agencyId') ?? undefined)
        : undefined,
    status:
      searchParams.get('status') && searchParams.get('status') !== '__all__'
        ? (searchParams.get('status') ?? undefined)
        : undefined,
  });

  const buildSummaryItems = useCallback(
    (values: Record<string, string | undefined>) => [
      {
        label: 'Agency',
        value: filterOptionLabel(values.agencyId, 'All Agency', initialAgencyOptions),
      },
      {
        label: 'Status',
        value: filterOptionLabel(values.status, 'All Status', initialStatusOptions),
      },
    ],
    [initialAgencyOptions, initialStatusOptions]
  );

  const handlePdfDownload = useCallback(
    async (args: {
      title: string;
      data: ExportAgentDetailData[];
      columns: string[];
      keys: (keyof ExportAgentDetailData)[];
      fileName?: string;
    }) => {
      await downloadAgentDetailReportPdf({
        reportName: 'Agent Detail Report',
        summaryItems: toBrandedPdfSummaryItems(
          buildSummaryItems({
            agencyId: searchParams.get('agencyId') ?? '',
            status: searchParams.get('status') ?? '',
          })
        ),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
      });
    },
    [buildSummaryItems, searchParams]
  );

  const handleExcelDownload = useCallback(
    async (args: {
      title: string;
      data: ExportAgentDetailData[];
      columns: string[];
      keys: (keyof ExportAgentDetailData)[];
      fileName?: string;
    }) => {
      await downloadAgentDetailReportExcel({
        reportName: 'Agent Detail Report',
        summaryItems: toBrandedPdfSummaryItems(
          buildSummaryItems({
            agencyId: searchParams.get('agencyId') ?? '',
            status: searchParams.get('status') ?? '',
          })
        ),
        generatedAt: new Date().toLocaleString(),
        rows: args.data,
        fileName: args.fileName,
        sheetName: (args.title || 'Agent Detail').slice(0, 31),
      });
    },
    [buildSummaryItems, searchParams]
  );

  return (
    <ReportTemplate<Agency, ExportAgentDetailData>
      title="Agent Detail Report"
      description="View agent information with filters"
      filterButtonLabel="Search"
      printPageSize="A4 portrait"
      exportOrientation="portrait"
      containerClassName="container mx-auto py-3 space-y-4 agent-detail-report-root"
      renderPrintContent={(rows) => <AgentDetailPrintLayout rows={rows} />}
      customDownloadPdf={handlePdfDownload}
      customDownloadExcel={handleExcelDownload}
      totalColumnIds={[
        'allowedCreditLimit',
        'maxCreditLimit',
        'standardCreditLimit',
        'balance',
      ]}
      formatTotalValue={(_columnId, sum) => (
        <span className="tabular-nums">{formatLKR(sum)}</span>
      )}
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => (
          <>
            <div>
              Agency:{' '}
              {filterOptionLabel(values.agencyId, 'All Agency', initialAgencyOptions)} | Status:{' '}
              {filterOptionLabel(values.status, 'All Status', initialStatusOptions)}
            </div>
          </>
        ),
        formatPrintSummaryItems: (values) => buildSummaryItems(values),
      }}
      filterContent={({ values, setValue }) => (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-shrink-0 min-h-[68px] flex flex-col justify-end w-[260px]">
              <label className="text-sm text-black font-semibold mb-2 block">Status</label>
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
              <label className="text-sm text-black font-semibold mb-2 block">Agency</label>
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
        return getAgentDetailReportData({
          agencyId:
            params.get('agencyId') && params.get('agencyId') !== '__all__'
              ? (params.get('agencyId') ?? undefined)
              : undefined,
          status:
            params.get('status') && params.get('status') !== '__all__'
              ? (params.get('status') ?? undefined)
              : undefined,
        });
      }}
      exportData={async () => {
        const query = buildQuery();
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
        'Balance',
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
        'balance',
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

export default function AgentDetailReportContent(props: AgentDetailReportContentProps) {
  return (
    <Suspense fallback={<Loading />}>
      <AgentDetailReportContentInner {...props} />
    </Suspense>
  );
}
