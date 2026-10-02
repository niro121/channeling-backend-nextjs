'use client';

import React, { useState } from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { FileSpreadsheet, FileText, Loader2, Printer, SearchIcon } from 'lucide-react';
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
import { formatExportFileName } from '@/lib/utils';
import { ReportGenerationDetailsCard } from '@/components/common/report-generation-details';
import {
  ReportPrintLayout,
  downloadBrandedReportExcel,
  downloadBrandedReportPdf,
  toBrandedPdfSummaryItems,
} from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
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
  const [loadingExcel, setLoadingExcel] = useState(false);
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

  const buildSummaryItems = (meta: NonNullable<typeof reportMeta>): ReportPrintSummaryItem[] => [
    { label: 'Period', value: formatReportRangeLabel(meta.from, meta.to) },
    { label: 'Date Type', value: meta.dateTypeLabel },
    { label: 'Branch', value: meta.branchLabel },
    { label: 'Fee Type', value: meta.feeModeLabel },
    { label: 'Generated By', value: meta.generatedBy },
    { label: 'Generated At', value: meta.generatedAt },
  ];

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download PDF.' });
      return;
    }
    if (!reportMeta) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download PDF.' });
      return;
    }
    type PdfRow = {
      no: string;
      bookingType: string;
      totalChannel: string;
      discount: string;
      cancel: string;
      refund: string;
      nettAmount: string;
    };
    const data: PdfRow[] = [
      ...rows.map((r, idx) => ({
        no: String(idx + 1),
        bookingType: r.bookingType,
        totalChannel: money(r.totalChannel),
        discount: money(r.discount),
        cancel: money(r.cancel),
        refund: money(r.refund),
        nettAmount: money(r.nettAmount),
      })),
      ...(totals
        ? [
            {
              no: '',
              bookingType: totals.bookingType,
              totalChannel: money(totals.totalChannel),
              discount: money(totals.discount),
              cancel: money(totals.cancel),
              refund: money(totals.refund),
              nettAmount: money(totals.nettAmount),
            },
          ]
        : []),
    ];
    await downloadBrandedReportPdf({
      reportName: 'Channel Income Report (Accounting Wise)',
      summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(reportMeta)),
      generatedAt: reportMeta.generatedAt,
      data,
      columns: ['#', 'Booking Type', 'Total Channel', 'Discount', 'Cancel', 'Refund', 'Nett Amount'],
      keys: ['no', 'bookingType', 'totalChannel', 'discount', 'cancel', 'refund', 'nettAmount'],
      fileName: `${formatExportFileName('channel-income-accounting-wise')}.pdf`,
      orientation: 'portrait',
      compactTable: true,
    });
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0 || !reportMeta) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download Excel.' });
      return;
    }
    setLoadingExcel(true);
    try {
      type ExcelRow = {
        no: string;
        bookingType: string;
        totalChannel: string;
        discount: string;
        cancel: string;
        refund: string;
        nettAmount: string;
      };
      const data: ExcelRow[] = [
        ...rows.map((r, idx) => ({
          no: String(idx + 1),
          bookingType: r.bookingType,
          totalChannel: money(r.totalChannel),
          discount: money(r.discount),
          cancel: money(r.cancel),
          refund: money(r.refund),
          nettAmount: money(r.nettAmount),
        })),
        ...(totals
          ? [
              {
                no: '',
                bookingType: totals.bookingType,
                totalChannel: money(totals.totalChannel),
                discount: money(totals.discount),
                cancel: money(totals.cancel),
                refund: money(totals.refund),
                nettAmount: money(totals.nettAmount),
              },
            ]
          : []),
      ];
      await downloadBrandedReportExcel({
        reportName: 'Channel Income Report (Accounting Wise)',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(reportMeta)),
        generatedAt: reportMeta.generatedAt,
        data,
        columns: ['#', 'Booking Type', 'Total Channel', 'Discount', 'Cancel', 'Refund', 'Nett Amount'],
        keys: ['no', 'bookingType', 'totalChannel', 'discount', 'cancel', 'refund', 'nettAmount'],
        fileName: `${formatExportFileName('channel-income-accounting-wise')}.xlsx`,
        sheetName: 'Channel Income',
        orientation: 'portrait',
        compactTable: true,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Excel export failed',
        description: error instanceof Error ? error.message : 'Unable to generate Excel.',
      });
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <div className="w-full py-2 space-y-3 channel-income-print-root">
      <style>{`
        @media print {
          .channel-income-print-root {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .channel-income-print-root .rpt-print-root,
          .channel-income-print-root .rpt-print-body,
          .channel-income-print-root .rpt-print-header,
          .channel-income-print-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .channel-income-print-root > div {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          /* Table wrappers only — do not strip the shared print header / summary box */
          .channel-income-print-root .rpt-print-body .overflow-x-auto,
          .channel-income-print-root .rpt-print-body .overflow-auto,
          .channel-income-print-root .rpt-print-body .overflow-hidden,
          .channel-income-print-root .rpt-print-body .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /* Body matches branded PDF compact table */
          .channel-income-print-root .rpt-print-root table.cin-print-table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .channel-income-print-root .rpt-print-root table.cin-print-table th,
          .channel-income-print-root .rpt-print-root table.cin-print-table td {
            width: auto !important;
            font-size: 5.5pt !important;
            font-weight: 400 !important;
            padding: 0.7mm !important;
            line-height: 1.15 !important;
            text-align: left !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
            overflow: hidden !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .channel-income-print-root .rpt-print-root table.cin-print-table thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .channel-income-print-root .rpt-print-root table.cin-print-table th:first-child,
          .channel-income-print-root .rpt-print-root table.cin-print-table td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .channel-income-print-root .rpt-print-root table.cin-print-table th:last-child,
          .channel-income-print-root .rpt-print-root table.cin-print-table td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .channel-income-print-root .rpt-print-root table.cin-print-table tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .channel-income-print-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <Card className="print:shadow-none print:border-0 print:bg-white">
        <CardHeader className="pb-2 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Channel Income Report (Accounting Wise)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Income totals grouped by booking channel type (excluding API/PCR).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="gap-2">
                <FileText />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleDownloadExcel();
                }}
                disabled={loadingExcel}
                className="gap-2"
              >
                {loadingExcel ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 items-start mb-4 pb-3 border-b print:hidden">
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
            <div className="print:hidden">
              <ReportEmptyStateCard
                title="Run a search to view results"
                description="Select filters and click Search."
              />
            </div>
          ) : rows.length === 0 ? (
            <div className="print:hidden">
              <ReportEmptyStateCard
                title="No results"
                description="No data available. Apply filters and click Search."
              />
            </div>
          ) : (
            <ReportPrintLayout
              reportName="Channel Income Report (Accounting Wise)"
              pageSize="A4 portrait"
              pageMargins="7mm 5mm 18mm"
              generatedAt={reportMeta.generatedAt}
              summaryItems={buildSummaryItems(reportMeta)}
            >
              <div className="space-y-3">
                <div className="print:hidden">{renderReportMetaCard()}</div>
                <div className="rounded-md border overflow-x-auto">
                  <Table className="cin-print-table text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
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
                        <TableRow className="rpt-print-total font-semibold bg-muted/50">
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
                <div className="print:hidden">{renderReportMetaCard()}</div>
              </div>
            </ReportPrintLayout>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

