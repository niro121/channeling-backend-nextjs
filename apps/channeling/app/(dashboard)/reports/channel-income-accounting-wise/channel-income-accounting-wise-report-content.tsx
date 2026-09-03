'use client';

import React, { useState } from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { Download, Printer, SearchIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/hooks/use-toast';
import { getChannelIncomeAccountingWiseData } from '@/app/actions/reports/channel-income-accounting-wise.report.action';
import type {
  ChannelIncomeAccountingWiseContentProps,
  ChannelIncomeAccountingWiseRow,
} from '@/types/reports/channel-income-accounting-wise';
import { CHANNEL_INCOME_DATE_TYPE_OPTIONS, CHANNEL_INCOME_FEE_MODE_OPTIONS } from '@/types/reports/channel-income-accounting-wise';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import { ReportGenerationDetailsCard } from '@/components/common/report-generation-details';
import { ReportEmptyStateCard } from '@/components/common/report-empty-state';

function defaultDateTimeRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00`, to: `${y}-${m}-${d}T23:59` };
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ChannelIncomeAccountingWiseReportContent({
  locationOptions,
  currentUserName,
}: ChannelIncomeAccountingWiseContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ChannelIncomeAccountingWiseRow[]>([]);
  const [totals, setTotals] = useState<ChannelIncomeAccountingWiseRow | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    dateTypeLabel: string;
    from: string;
    to: string;
    branchLabel: string;
    feeModeLabel: string;
    generatedBy: string;
    generatedAt: string;
  } | null>(null);

  const [dateType, setDateType] = useState<'transaction_date' | 'session_date'>('session_date');
  const [fromDateTime, setFromDateTime] = useState(defaultDateTimeRange().from);
  const [toDateTime, setToDateTime] = useState(defaultDateTimeRange().to);
  const [locationId, setLocationId] = useState('__all__');
  const [feeMode, setFeeMode] = useState<'all' | 'hospital_fee_only' | 'professional_fee_only'>('hospital_fee_only');

  const branchOptions = withAllBranchesOptions(locationOptions);
  const optionListsLoading = false;

  const onSearch = async () => {
    if (optionListsLoading) {
      toast({ variant: 'destructive', title: 'Please wait', description: 'Filter options are still loading.' });
      return;
    }
    setLoading(true);
    try {
      const res = await getChannelIncomeAccountingWiseData({
        dateType,
        fromDateTime,
        toDateTime,
        locationId: locationId !== '__all__' ? locationId : undefined,
        feeMode,
      });
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Error', description: res.message || 'Failed to load report' });
        setRows([]);
        setTotals(null);
        setReportMeta(null);
        return;
      }
      setRows(res.data ?? []);
      setTotals(res.totals ?? null);
      setReportMeta({
        dateTypeLabel: dateType === 'transaction_date' ? 'Transaction Date' : 'Session Date',
        from: fromDateTime,
        to: toDateTime,
        branchLabel: branchOptions.find((o) => o.id === locationId)?.name ?? 'All Branches',
        feeModeLabel:
          feeMode === 'hospital_fee_only'
            ? 'Hospital Fee Only'
            : feeMode === 'professional_fee_only'
              ? 'Professional Fee Only'
              : 'All',
        generatedBy: currentUserName,
        generatedAt: new Date().toLocaleString(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load report';
      toast({ variant: 'destructive', title: 'Error', description: msg });
      setRows([]);
      setTotals(null);
      setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const renderReportMetaCard = () =>
    reportMeta ? (
      <ReportGenerationDetailsCard
        items={[
          {
            label: 'Filters',
            value: (
              <>
                <div>
                  Date Type: {reportMeta.dateTypeLabel} | Range:{' '}
                  {formatReportRangeLabel(reportMeta.from, reportMeta.to)}
                </div>
                <div>
                  Branch: {reportMeta.branchLabel} | Fee Type: {reportMeta.feeModeLabel}
                </div>
              </>
            ),
            smColSpan: 2,
          },
          { label: 'Generated by', value: <span className="font-semibold">{reportMeta.generatedBy}</span> },
          { label: 'Generated at', value: <span className="font-semibold">{reportMeta.generatedAt}</span> },
        ]}
      />
    ) : null;

  const handlePrint = () => window.print();

  const handleDownloadCsv = () => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download CSV.' });
      return;
    }
    const lines: string[] = [];
    lines.push('Channel Income Report (Accounting Wise)');
    lines.push(['Booking Type', 'Total Channel', 'Discount', 'Cancel', 'Refund', 'Nett Amount'].join(','));
    for (const r of rows) {
      lines.push(
        [
          r.bookingType,
          money(r.totalChannel),
          money(r.discount),
          money(r.cancel),
          money(r.refund),
          money(r.nettAmount),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    }
    if (totals) {
      lines.push(
        [
          totals.bookingType,
          money(totals.totalChannel),
          money(totals.discount),
          money(totals.cancel),
          money(totals.refund),
          money(totals.nettAmount),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      );
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channel-income-accounting-wise-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full py-2 space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Channel Income Report (Accounting Wise)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Income totals grouped by booking channel type (excluding API/PCR).
              </CardDescription>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv} className="gap-2">
                <Download />
                Download CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 items-start mb-4 pb-3 border-b no-print">
            <div className="flex flex-wrap items-end gap-3">
              <Selector
                label="Date Type"
                options={CHANNEL_INCOME_DATE_TYPE_OPTIONS.map((x) => ({ id: x.id, name: x.name }))}
                value={dateType}
                showDefaultOption={false}
                onChange={(v) => setDateType((v as 'transaction_date' | 'session_date') ?? 'session_date')}
              />
              <DateTimeRangePicker
                label="Date & Time Range"
                from={fromDateTime}
                to={toDateTime}
                onChange={({ from, to }) => {
                  setFromDateTime(from ?? '');
                  setToDateTime(to ?? '');
                }}
              />
              <Selector
                label="Fee Type"
                options={CHANNEL_INCOME_FEE_MODE_OPTIONS.map((x) => ({ id: x.id, name: x.name }))}
                value={feeMode}
                showDefaultOption={false}
                onChange={(v) => setFeeMode((v as 'all' | 'hospital_fee_only' | 'professional_fee_only') ?? 'hospital_fee_only')}
              />
              <Combobox
                label="All Branches"
                options={branchOptions}
                value={locationId}
                defaultValue="__all__"
                clearable
                onChange={(v) => setLocationId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Button onClick={onSearch} disabled={loading || optionListsLoading} className="gap-2">
                <SearchIcon className="h-4 w-4" />
                Search
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !reportMeta ? (
            <ReportEmptyStateCard
              title="Run a search to view results"
              description="Select filters and click Search."
            />
          ) : rows.length === 0 ? (
            <ReportEmptyStateCard
              title="No results"
              description="No data available. Apply filters and click Search."
            />
          ) : (
            <div className="space-y-3">
              {renderReportMetaCard()}
              <div className="rounded-md border overflow-x-auto">
                <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-muted-foreground">
                      <TableHead className="text-center font-semibold w-10">#</TableHead>
                      <TableHead className="font-semibold">Booking Type</TableHead>
                      <TableHead className="text-right font-semibold">Total Channel</TableHead>
                      <TableHead className="text-right font-semibold">Discount</TableHead>
                      <TableHead className="text-right font-semibold">Cancel</TableHead>
                      <TableHead className="text-right font-semibold">Refund</TableHead>
                      <TableHead className="text-right font-semibold">Nett Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.key} className="border-b border-border/50">
                        <TableCell className="text-center tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{r.bookingType}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.totalChannel)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.discount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.cancel)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.refund)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{money(r.nettAmount)}</TableCell>
                      </TableRow>
                    ))}
                    {totals && (
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell />
                        <TableCell>{totals.bookingType}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.totalChannel)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.discount)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.cancel)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.refund)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.nettAmount)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {renderReportMetaCard()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

