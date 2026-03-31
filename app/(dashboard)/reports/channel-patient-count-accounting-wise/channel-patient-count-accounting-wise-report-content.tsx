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
import { getChannelPatientCountAccountingWiseData } from '@/app/actions/reports/channel-patient-count-accounting-wise.report.action';
import type {
  ChannelPatientCountAccountingWiseContentProps,
  ChannelPatientCountAccountingWiseRow,
} from '@/types/reports/channel-patient-count-accounting-wise';
import {
  CHANNEL_PATIENT_COUNT_DATE_TYPE_OPTIONS,
  CHANNEL_PATIENT_COUNT_FEE_MODE_OPTIONS,
} from '@/types/reports/channel-patient-count-accounting-wise';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import { withAllBranchesOptions } from '@/lib/report-branch-options';

function defaultDateTimeRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00`, to: `${y}-${m}-${d}T23:59` };
}

const money = (n: number) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Revenue table: background for Hos Total columns (hospital net). */
const hosTotalThClass = 'text-right font-semibold bg-primary/12 dark:bg-primary/20';
const hosTotalTdClass = 'text-right tabular-nums font-semibold bg-primary/10 dark:bg-primary/15';
const hosTotalTdNettClass =
  'text-right tabular-nums font-semibold text-muted-foreground bg-primary/10 dark:bg-primary/15';
const hosTotalTdTotalsClass =
  'text-right tabular-nums font-semibold bg-primary/15 dark:bg-primary/25';
const hosTotalTdTotalsNettClass =
  'text-right tabular-nums font-semibold text-muted-foreground bg-primary/15 dark:bg-primary/25';

export default function ChannelPatientCountAccountingWiseReportContent({
  locationOptions,
  currentUserName,
}: ChannelPatientCountAccountingWiseContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ChannelPatientCountAccountingWiseRow[]>([]);
  const [totals, setTotals] = useState<ChannelPatientCountAccountingWiseRow | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    dateTypeLabel: string;
    from: string;
    to: string;
    branchLabel: string;
    feeModeLabel: string;
    generatedBy: string;
    generatedAt: string;
  } | null>(null);

  const [dateType, setDateType] = useState<'transaction_date' | 'session_date'>('transaction_date');
  const [fromDateTime, setFromDateTime] = useState(defaultDateTimeRange().from);
  const [toDateTime, setToDateTime] = useState(defaultDateTimeRange().to);
  const [locationId, setLocationId] = useState('__all__');
  const [feeMode, setFeeMode] = useState<'all' | 'hospital_fee_only' | 'professional_fee_only'>('hospital_fee_only');

  const branchOptions = withAllBranchesOptions(locationOptions);
  /** Location options are server-rendered; always allow search once "All Branches" is available. */
  const optionListsLoading = false;

  const onSearch = async () => {
    if (optionListsLoading) {
      toast({ variant: 'destructive', title: 'Please wait', description: 'Filter options are still loading.' });
      return;
    }
    setLoading(true);
    try {
      const res = await getChannelPatientCountAccountingWiseData({
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
          feeMode === 'hospital_fee_only' ? 'Hospital Fee Only' : feeMode === 'professional_fee_only' ? 'Professional Fee Only' : 'All Fees',
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
      <div className="rounded-md border border-primary/30 bg-primary/5 shadow-sm px-3 py-2.5">
        <div className="mb-2 flex items-center gap-2 border-l-2 border-primary pl-2">
          <p className="text-[11px] font-semibold tracking-wide text-primary">Report Generation Details</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-0.5 sm:col-span-2">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Filters</p>
            <p className="text-[11px] leading-tight font-medium">
              Date Type: {reportMeta.dateTypeLabel} | Range: {formatReportRangeLabel(reportMeta.from, reportMeta.to)}
            </p>
            <p className="text-[11px] leading-tight font-medium">
              Branch: {reportMeta.branchLabel} | Fee Mode: {reportMeta.feeModeLabel}
            </p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Generated by</p>
            <p className="text-[11px] font-semibold leading-tight">{reportMeta.generatedBy}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Generated at</p>
            <p className="text-[11px] font-semibold leading-tight">{reportMeta.generatedAt}</p>
          </div>
        </div>
      </div>
    ) : null;

  const handlePrint = () => window.print();
  const handleDownloadCsv = () => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download CSV.' });
      return;
    }
    const lines: string[] = [];
    lines.push('Channel Counts');
    lines.push([
      'Booking Type',
      'Paid Bill Count - Paid',
      'Paid Bill Count - Pending',
      'Paid Bill Count - Net',
      'Cancel Bill Count - Paid',
      'Cancel Bill Count - Pending',
      'Cancel Bill Count - Net',
      'Refund Bill Count - Hos Refund',
      'Refund Bill Count - Pro Refund',
      'Total Count - Paid',
      'Total Count - Pending',
      'Total Count - Net',
    ].join(','));
    for (const r of rows) {
      lines.push([
        r.bookingType,
        String(r.paidBillPaid),
        String(r.paidBillPending),
        String(r.paidBillNet),
        String(r.cancelBillPaid),
        String(r.cancelBillPending),
        String(r.cancelBillNet),
        String(r.refundBillHos),
        String(r.refundBillPro),
        String(r.totalCountPaid),
        String(r.totalCountPending),
        String(r.totalCountNet),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    if (totals) {
      lines.push([
        totals.bookingType,
        String(totals.paidBillPaid),
        String(totals.paidBillPending),
        String(totals.paidBillNet),
        String(totals.cancelBillPaid),
        String(totals.cancelBillPending),
        String(totals.cancelBillNet),
        String(totals.refundBillHos),
        String(totals.refundBillPro),
        String(totals.totalCountPaid),
        String(totals.totalCountPending),
        String(totals.totalCountNet),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    lines.push('');
    lines.push('Revenue Breakdown');
    lines.push([
      'Booking Type',
      'Paid Revenue - Hos Fee',
      'Paid Revenue - Hos Dis',
      'Paid Revenue - Pro Fee',
      'Paid Revenue - Pro Dis',
      'Paid Revenue - Hos Total',
      'Cancel Revenue - Hos Fee',
      'Cancel Revenue - Hos Dis',
      'Cancel Revenue - Pro Fee',
      'Cancel Revenue - Pro Dis',
      'Cancel Revenue - Hos Total',
      'Refund Revenue - Hos Refund',
      'Refund Revenue - Pro Refund',
      'Nett Revenue - Hos Fee',
      'Nett Revenue - Hos Dis',
      'Nett Revenue - Pro Fee',
      'Nett Revenue - Pro Dis',
      'Nett Revenue - Hos Total',
      'Pending Revenue - Hos Fee',
      'Pending Revenue - Pro Fee',
    ].join(','));
    for (const r of rows) {
      lines.push([
        r.bookingType,
        money(r.paidRevenueHosFee),
        money(r.paidRevenueHosDis),
        money(r.paidRevenueProFee),
        money(r.paidRevenueProDis),
        money(r.paidRevenueTotal),
        money(r.cancelRevenueHosFee),
        money(r.cancelRevenueHosDis),
        money(r.cancelRevenueProFee),
        money(r.cancelRevenueProDis),
        money(r.cancelRevenueTotal),
        money(r.refundRevenueHosRefund),
        money(r.refundRevenueProRefund),
        money(r.nettRevenueHosFee),
        money(r.nettRevenueHosDis),
        money(r.nettRevenueProFee),
        money(r.nettRevenueProDis),
        money(r.nettRevenueTotal),
        money(r.pendingRevenueHosFee),
        money(r.pendingRevenueProFee),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }
    if (totals) {
      lines.push([
        totals.bookingType,
        money(totals.paidRevenueHosFee),
        money(totals.paidRevenueHosDis),
        money(totals.paidRevenueProFee),
        money(totals.paidRevenueProDis),
        money(totals.paidRevenueTotal),
        money(totals.cancelRevenueHosFee),
        money(totals.cancelRevenueHosDis),
        money(totals.cancelRevenueProFee),
        money(totals.cancelRevenueProDis),
        money(totals.cancelRevenueTotal),
        money(totals.refundRevenueHosRefund),
        money(totals.refundRevenueProRefund),
        money(totals.nettRevenueHosFee),
        money(totals.nettRevenueHosDis),
        money(totals.nettRevenueProFee),
        money(totals.nettRevenueProDis),
        money(totals.nettRevenueTotal),
        money(totals.pendingRevenueHosFee),
        money(totals.pendingRevenueProFee),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `channel-patient-count-accounting-wise-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full py-2 space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Channel Patient Count (Accounting Wise)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Booking counts and fee totals grouped by booking channel type.
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
                options={CHANNEL_PATIENT_COUNT_DATE_TYPE_OPTIONS.map((x) => ({ id: x.id, name: x.name }))}
                value={dateType}
                showDefaultOption={false}
                onChange={(v) => setDateType((v as 'transaction_date' | 'session_date') ?? 'transaction_date')}
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
                options={CHANNEL_PATIENT_COUNT_FEE_MODE_OPTIONS.map((x) => ({ id: x.id, name: x.name }))}
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
            <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Search to view report details.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2">
              <p className="text-[11px] text-muted-foreground">No data available. Apply filters and click Search.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {renderReportMetaCard()}
              <div className="rounded-md border overflow-x-auto">
                <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-muted-foreground">
                      <TableHead rowSpan={2} className="text-center font-semibold">#</TableHead>
                      <TableHead rowSpan={2} className="font-semibold">Booking Type</TableHead>
                      <TableHead colSpan={3} className="text-center font-semibold">Paid Bill Count</TableHead>
                      <TableHead colSpan={3} className="text-center font-semibold">Cancel Bill Count</TableHead>
                      <TableHead colSpan={2} className="text-center font-semibold">Refund Bill Count</TableHead>
                      <TableHead colSpan={3} className="text-center font-semibold">Total Count</TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/30 text-muted-foreground">
                      <TableHead className="text-center font-medium">Paid</TableHead>
                      <TableHead className="text-center font-medium">Pending</TableHead>
                      <TableHead className="text-center font-medium">Net</TableHead>
                      <TableHead className="text-center font-medium">Paid</TableHead>
                      <TableHead className="text-center font-medium">Pending</TableHead>
                      <TableHead className="text-center font-medium">Net</TableHead>
                      <TableHead className="text-center font-medium">Hos Refund</TableHead>
                      <TableHead className="text-center font-medium">Pro Refund</TableHead>
                      <TableHead className="text-center font-medium">Paid</TableHead>
                      <TableHead className="text-center font-medium">Pending</TableHead>
                      <TableHead className="text-center font-medium">Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={r.key} className="border-b border-border/50">
                        <TableCell className="text-center tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{r.bookingType}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.paidBillPaid}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.paidBillPending}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{r.paidBillNet}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.cancelBillPaid}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.cancelBillPending}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{r.cancelBillNet}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.refundBillHos}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.refundBillPro}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.totalCountPaid}</TableCell>
                        <TableCell className="text-center tabular-nums">{r.totalCountPending}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{r.totalCountNet}</TableCell>
                      </TableRow>
                    ))}
                    {totals && (
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell className="text-center tabular-nums"></TableCell>
                        <TableCell>{totals.bookingType}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.paidBillPaid}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.paidBillPending}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{totals.paidBillNet}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.cancelBillPaid}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.cancelBillPending}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{totals.cancelBillNet}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.refundBillHos}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.refundBillPro}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.totalCountPaid}</TableCell>
                        <TableCell className="text-center tabular-nums">{totals.totalCountPending}</TableCell>
                        <TableCell className="text-center tabular-nums text-muted-foreground">{totals.totalCountNet}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <div className="px-3 py-2 border-b bg-muted/40 text-sm font-semibold text-foreground">
                  Revenue Breakdown
                </div>
                <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-muted-foreground">
                      <TableHead rowSpan={2} className="text-center font-semibold">#</TableHead>
                      <TableHead rowSpan={2} className="font-semibold">Booking Type</TableHead>
                      <TableHead colSpan={5} className="text-center font-semibold">Paid Revenue</TableHead>
                      <TableHead colSpan={5} className="text-center font-semibold">Cancel Revenue</TableHead>
                      <TableHead colSpan={2} className="text-center font-semibold">Refund Revenue</TableHead>
                      <TableHead colSpan={5} className="text-center font-semibold">Nett Revenue</TableHead>
                      <TableHead colSpan={2} className="text-center font-semibold">Pending Revenue</TableHead>
                    </TableRow>
                    <TableRow className="bg-muted/30 text-muted-foreground">
                      <TableHead className="text-right font-medium">Hos Fee</TableHead>
                      <TableHead className="text-right font-medium">Hos Dis</TableHead>
                      <TableHead className="text-right font-medium">Pro Fee</TableHead>
                      <TableHead className="text-right font-medium">Pro Dis</TableHead>
                      <TableHead className={hosTotalThClass}>Hos Total</TableHead>
                      <TableHead className="text-right font-medium">Hos Fee</TableHead>
                      <TableHead className="text-right font-medium">Hos Dis</TableHead>
                      <TableHead className="text-right font-medium">Pro Fee</TableHead>
                      <TableHead className="text-right font-medium">Pro Dis</TableHead>
                      <TableHead className={hosTotalThClass}>Hos Total</TableHead>
                      <TableHead className="text-right font-medium">Hos Refund</TableHead>
                      <TableHead className="text-right font-medium">Pro Refund</TableHead>
                      <TableHead className="text-right font-medium">Hos Fee</TableHead>
                      <TableHead className="text-right font-medium">Hos Dis</TableHead>
                      <TableHead className="text-right font-medium">Pro Fee</TableHead>
                      <TableHead className="text-right font-medium">Pro Dis</TableHead>
                      <TableHead className={hosTotalThClass}>Hos Total</TableHead>
                      <TableHead className="text-right font-medium">Hos Fee</TableHead>
                      <TableHead className="text-right font-medium">Pro Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, idx) => (
                      <TableRow key={`${r.key}-rev`} className="border-b border-border/50">
                        <TableCell className="text-center tabular-nums">{idx + 1}</TableCell>
                        <TableCell>{r.bookingType}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.paidRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.paidRevenueHosDis)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.paidRevenueProFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.paidRevenueProDis)}</TableCell>
                        <TableCell className={hosTotalTdClass}>{money(r.paidRevenueTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.cancelRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.cancelRevenueHosDis)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.cancelRevenueProFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.cancelRevenueProDis)}</TableCell>
                        <TableCell className={hosTotalTdClass}>{money(r.cancelRevenueTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.refundRevenueHosRefund)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.refundRevenueProRefund)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(r.nettRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(r.nettRevenueHosDis)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(r.nettRevenueProFee)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(r.nettRevenueProDis)}</TableCell>
                        <TableCell className={hosTotalTdNettClass}>{money(r.nettRevenueTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.pendingRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(r.pendingRevenueProFee)}</TableCell>
                      </TableRow>
                    ))}
                    {totals && (
                      <TableRow className="font-semibold bg-muted/50">
                        <TableCell className="text-center tabular-nums"></TableCell>
                        <TableCell>{totals.bookingType}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.paidRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.paidRevenueHosDis)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.paidRevenueProFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.paidRevenueProDis)}</TableCell>
                        <TableCell className={hosTotalTdTotalsClass}>{money(totals.paidRevenueTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.cancelRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.cancelRevenueHosDis)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.cancelRevenueProFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.cancelRevenueProDis)}</TableCell>
                        <TableCell className={hosTotalTdTotalsClass}>{money(totals.cancelRevenueTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.refundRevenueHosRefund)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.refundRevenueProRefund)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(totals.nettRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(totals.nettRevenueHosDis)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(totals.nettRevenueProFee)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{money(totals.nettRevenueProDis)}</TableCell>
                        <TableCell className={hosTotalTdTotalsNettClass}>{money(totals.nettRevenueTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.pendingRevenueHosFee)}</TableCell>
                        <TableCell className="text-right tabular-nums">{money(totals.pendingRevenueProFee)}</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

