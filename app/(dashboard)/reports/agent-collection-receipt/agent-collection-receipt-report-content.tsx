'use client';

import React, { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ReportTemplate } from '@/app/(dashboard)/report-template';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { ReportAgentSelect } from '@/components/common/agent-select';
import Loading from '@/app/(dashboard)/loading';
import { TableCell, TableRow } from '@/components/ui/table';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  AgentCollectionReceiptPaymentType,
  AgentCollectionReceiptReportExportRow,
  AgentCollectionReceiptReportQuery,
  AgentCollectionReceiptReportRow
} from '@/types/reports/agent-collection-receipt';
import {
  exportAgentCollectionReceiptReportData,
  getAgentCollectionReceiptReportData
} from '@/app/actions/reports/agent-collection-receipt.report.action';
import { AgentCollectionReceiptColumns } from './columns';

type Props = {
  currentUserName: string;
  locationOptions: Array<{ id: string; name: string }>;
  agencyOptions: Array<{ id: string; name: string }>;
};

const PAYMENT_TYPE_OPTIONS: Array<{ id: AgentCollectionReceiptPaymentType; name: string }> = [
  { id: '__all__', name: 'Select Type' },
  { id: 'cash', name: 'CASH' },
  { id: 'credit_card', name: 'CREDIT CARD' },
  { id: 'slip', name: 'SLIP' },
  { id: 'cheque', name: 'CHEQUE' },
  { id: 'e_wallet', name: 'E-WALLET' }
];

function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00`, to: `${y}-${m}-${d}T23:59` };
}

function ContentInner({ currentUserName, locationOptions, agencyOptions }: Props) {
  const searchParams = useSearchParams();
  const defaultRange = getDefaultDateTimeRange();

  const buildQuery = (): AgentCollectionReceiptReportQuery => ({
    dateFrom: searchParams.get('dateFrom') ?? defaultRange.from,
    dateTo: searchParams.get('dateTo') ?? defaultRange.to,
    locationId: searchParams.get('locationId') ?? '__all__',
    agencyId: searchParams.get('agencyId') ?? '__all__',
    paymentType: (searchParams.get('paymentType') as AgentCollectionReceiptPaymentType) ?? '__all__'
  });

  const allLocations = useMemo(
    () => [{ id: '__all__', name: 'All Branches' }, ...locationOptions.filter((x) => x.id !== '__all__')],
    [locationOptions]
  );

  return (
    <ReportTemplate<AgentCollectionReceiptReportRow, AgentCollectionReceiptReportExportRow>
      title="Agent Collection Receipt Report"
      description="Shows agent deposits, withdrawals, and their cancellations (ledger receipts)."
      filterButtonLabel="Search"
      showBackButton={false}
      containerClassName="w-full py-2 space-y-3"
      generationDetails={{
        generatedBy: currentUserName,
        formatFilters: (values) => {
          const df = values.dateFrom ?? '';
          const dt = values.dateTo ?? '';
          const locId = values.locationId ?? '__all__';
          const agencyId = values.agencyId ?? '__all__';
          const pt = (values.paymentType ?? '__all__') as AgentCollectionReceiptPaymentType;
          const locLabel = locId === '__all__' ? 'All Branches' : (allLocations.find((l) => l.id === locId)?.name ?? locId);
          const agencyLabel = agencyId === '__all__' ? 'All Agents' : (agencyOptions.find((a) => a.id === agencyId)?.name ?? agencyId);
          const ptLabel = PAYMENT_TYPE_OPTIONS.find((p) => p.id === pt)?.name ?? pt;
          return (
            <>
              <div>Range: {df} to {dt}</div>
              <div>Branch: {locLabel} | Agent: {agencyLabel} | Type: {ptLabel}</div>
            </>
          );
        }
      }}
      filterContent={({ values, setValue }) => (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-shrink-0">
            <DateTimeRangePicker
              label="Date & time range"
              from={values.dateFrom}
              to={values.dateTo}
              onChange={({ from, to }) => {
                setValue('dateFrom', from);
                setValue('dateTo', to);
              }}
            />
          </div>

          <div className="w-[240px]">
            <label className="text-sm font-semibold mb-2 block">Branch</label>
            <Combobox
              label="Branch"
              options={allLocations}
              value={values.locationId ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('locationId', v ?? '__all__')}
            />
          </div>

          <ReportAgentSelect
            agentOptions={agencyOptions}
            value={values.agencyId ?? '__all__'}
            onChange={(v) => setValue('agencyId', v ?? '__all__')}
            includeAllAgents={true}
            label="Select Agent"
          />

          <div className="w-[200px]">
            <label className="text-sm font-semibold mb-2 block">Select Type</label>
            <Combobox
              label="Select Type"
              options={PAYMENT_TYPE_OPTIONS}
              value={(values.paymentType as AgentCollectionReceiptPaymentType) ?? '__all__'}
              defaultValue="__all__"
              clearable
              onChange={(v) => setValue('paymentType', (v as string) ?? '__all__')}
            />
          </div>
        </div>
      )}
      fetchData={async (params) => {
        const query: AgentCollectionReceiptReportQuery = {
          dateFrom: params.get('dateFrom') ?? defaultRange.from,
          dateTo: params.get('dateTo') ?? defaultRange.to,
          locationId: params.get('locationId') ?? '__all__',
          agencyId: params.get('agencyId') ?? '__all__',
          paymentType: (params.get('paymentType') as AgentCollectionReceiptPaymentType) ?? '__all__'
        };
        return getAgentCollectionReceiptReportData(query);
      }}
      exportData={async () => exportAgentCollectionReceiptReportData(buildQuery())}
      columns={AgentCollectionReceiptColumns}
      exportColumns={[
        'Date',
        'Created User',
        'Receipt No',
        'Remark',
        'Agent Name',
        'Agent Code',
        'Cancel Remark',
        'Receipt Amount',
        'Cash',
        'Credit Card',
        'Cheque',
        'Slip',
        'Slip Ref',
        'Bank Name'
      ]}
      exportKeys={
        [
          'date',
          'createdUser',
          'receiptNo',
          'remarks',
          'agencyName',
          'agencyCode',
          'cancelReason',
          'receiptAmount',
          'cash',
          'creditCard',
          'cheque',
          'slip',
          'slipRef',
          'bankName'
        ] as (keyof AgentCollectionReceiptReportExportRow)[]
      }
      exportTitle="Agent Collection Receipt Report"
      exportFileName="agent-collection-receipt-report"
      getRowId={(row) => row.id}
      footerRow={(rows) => {
        const totals = rows.reduce(
          (acc, r) => {
            acc.receipt += Number(r.receiptAmount) || 0;
            acc.cash += Number(r.cashAmount) || 0;
            acc.card += Number(r.cardAmount) || 0;
            acc.cheque += Number(r.chequeAmount) || 0;
            acc.slip += Number(r.slipAmount) || 0;
            return acc;
          },
          { receipt: 0, cash: 0, card: 0, cheque: 0, slip: 0 }
        );
        return (
          <TableRow className="font-medium bg-muted/50">
            <TableCell colSpan={8} className="text-left">
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatReceiptAmount(totals.receipt)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatReceiptAmount(totals.cash)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatReceiptAmount(totals.card)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatReceiptAmount(totals.cheque)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatReceiptAmount(totals.slip)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        );
      }}
      skipFetchWhenNoParams={true}
      initialFilterValues={{
        dateFrom: defaultRange.from,
        dateTo: defaultRange.to,
        locationId: '__all__',
        agencyId: '__all__',
        paymentType: '__all__',
      }}
      initialEmptyMessage="No agent collection receipts found. Select filters and click Search."
      emptyMessage="No agent collection receipts found for the selected filters."
    />
  );
}

export default function AgentCollectionReceiptReportContent(props: Props) {
  return (
    <Suspense fallback={<Loading />}>
      <ContentInner {...props} />
    </Suspense>
  );
}

