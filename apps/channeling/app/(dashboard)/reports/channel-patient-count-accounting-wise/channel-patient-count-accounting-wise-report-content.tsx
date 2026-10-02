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
  const [loadingExcel, setLoadingExcel] = useState(false);
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
                  Branch: {reportMeta.branchLabel} | Fee Mode: {reportMeta.feeModeLabel}
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
    { label: 'Fee Mode', value: meta.feeModeLabel },
    { label: 'Generated By', value: meta.generatedBy },
    { label: 'Generated At', value: meta.generatedAt },
  ];

  const handlePrint = () => window.print();

  const buildBrandedExportSections = () => {
    const countRows = [
      ...rows.map((r, idx) => [
        String(idx + 1),
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
      ]),
      ...(totals
        ? [
            [
              '',
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
            ],
          ]
        : []),
    ];

    const revenueRows = [
      ...rows.map((r, idx) => [
        String(idx + 1),
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
      ]),
      ...(totals
        ? [
            [
              '',
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
            ],
          ]
        : []),
    ];

    return [
      {
        title: 'Bill Counts',
        columns: [
          '#',
          'Booking Type',
          'Paid-Paid',
          'Paid-Pending',
          'Paid-Net',
          'Cancel-Paid',
          'Cancel-Pending',
          'Cancel-Net',
          'Refund-Hos',
          'Refund-Pro',
          'Total-Paid',
          'Total-Pending',
          'Total-Net',
        ],
        body: countRows,
      },
      {
        title: 'Revenue Breakdown',
        columns: [
          '#',
          'Booking Type',
          'Paid Hos Fee',
          'Paid Hos Dis',
          'Paid Pro Fee',
          'Paid Pro Dis',
          'Paid Hos Total',
          'Cancel Hos Fee',
          'Cancel Hos Dis',
          'Cancel Pro Fee',
          'Cancel Pro Dis',
          'Cancel Hos Total',
          'Refund Hos',
          'Refund Pro',
          'Nett Hos Fee',
          'Nett Hos Dis',
          'Nett Pro Fee',
          'Nett Pro Dis',
          'Nett Hos Total',
          'Pending Hos',
          'Pending Pro',
        ],
        body: revenueRows,
      },
    ];
  };

  const handleDownloadPdf = async () => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download PDF.' });
      return;
    }
    if (!reportMeta) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download PDF.' });
      return;
    }

    await downloadBrandedReportPdf({
      reportName: 'Channel Patient Count (Accounting Wise)',
      summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(reportMeta)),
      generatedAt: reportMeta.generatedAt,
      fileName: `${formatExportFileName('channel-patient-count-accounting-wise')}.pdf`,
      orientation: 'portrait',
      compactTable: true,
      sections: buildBrandedExportSections(),
    });
  };

  const handleDownloadExcel = async () => {
    if (rows.length === 0 || !reportMeta) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download Excel.' });
      return;
    }
    setLoadingExcel(true);
    try {
      await downloadBrandedReportExcel({
        reportName: 'Channel Patient Count (Accounting Wise)',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(reportMeta)),
        generatedAt: reportMeta.generatedAt,
        fileName: `${formatExportFileName('channel-patient-count-accounting-wise')}.xlsx`,
        sheetName: 'Patient Count',
        orientation: 'portrait',
        compactTable: true,
        sections: buildBrandedExportSections(),
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
    <div className="w-full py-2 space-y-3 channel-patient-count-print-root">
      <style>{`
        @media print {
          /* Full page — print only */
          .channel-patient-count-print-root {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .channel-patient-count-print-root .rpt-print-root,
          .channel-patient-count-print-root .rpt-print-body,
          .channel-patient-count-print-root .rpt-print-header,
          .channel-patient-count-print-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .channel-patient-count-print-root > div {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          /* Table wrappers only — do not strip the shared print header / summary box */
          .channel-patient-count-print-root .rpt-print-body .overflow-x-auto,
          .channel-patient-count-print-root .rpt-print-body .overflow-auto,
          .channel-patient-count-print-root .rpt-print-body .overflow-hidden,
          .channel-patient-count-print-root .rpt-print-body .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .channel-patient-count-print-root .cpc-section-title {
            display: block !important;
            margin: 2mm 0 1mm !important;
            font-size: 8pt !important;
            font-weight: 700 !important;
            color: #000 !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }

          .channel-patient-count-print-root .rpt-print-root table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .channel-patient-count-print-root .rpt-print-root th,
          .channel-patient-count-print-root .rpt-print-root td {
            font-size: 5.5pt !important;
            padding: 0.7mm 0.4mm !important;
            line-height: 1.15 !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            overflow: hidden !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            background: #fff !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .channel-patient-count-print-root .rpt-print-root thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
          }
          .channel-patient-count-print-root .rpt-print-root th:first-child,
          .channel-patient-count-print-root .rpt-print-root td:first-child {
            border-left: 0.7pt solid #000 !important;
          }
          .channel-patient-count-print-root .rpt-print-root th:last-child,
          .channel-patient-count-print-root .rpt-print-root td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .channel-patient-count-print-root .rpt-print-root .text-muted-foreground {
            color: #000 !important;
          }
          .channel-patient-count-print-root .rpt-print-root tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .channel-patient-count-print-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /* Bill Counts — headers wrap; counts stay one line */
          .channel-patient-count-print-root .cpc-count-table th,
          .channel-patient-count-print-root .cpc-count-table td {
            overflow: hidden !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          .channel-patient-count-print-root .cpc-count-table th:nth-child(1),
          .channel-patient-count-print-root .cpc-count-table td:nth-child(1) {
            width: 4% !important;
            text-align: center !important;
          }
          .channel-patient-count-print-root .cpc-count-table th:nth-child(2),
          .channel-patient-count-print-root .cpc-count-table td:nth-child(2) {
            width: 16% !important;
            text-align: left !important;
          }
          .channel-patient-count-print-root .cpc-count-table th:nth-child(n+3),
          .channel-patient-count-print-root .cpc-count-table td:nth-child(n+3) {
            width: 7.27% !important;
            text-align: center !important;
            font-variant-numeric: tabular-nums !important;
          }

          /*
            Revenue: 21 columns. Headers wrap so the full name shows.
            Amounts use a smaller size and may wrap so digits are not cut off.
          */
          .channel-patient-count-print-root .cpc-rev-table th,
          .channel-patient-count-print-root .cpc-rev-table td {
            font-size: 4.5pt !important;
            padding: 0.5mm 0.25mm !important;
            line-height: 1.1 !important;
            overflow: hidden !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: anywhere !important;
          }
          .channel-patient-count-print-root .cpc-rev-table thead th {
            font-size: 4pt !important;
            line-height: 1.05 !important;
            font-weight: 700 !important;
          }
          .channel-patient-count-print-root .cpc-rev-table th:nth-child(1),
          .channel-patient-count-print-root .cpc-rev-table td:nth-child(1) {
            width: 3% !important;
            text-align: center !important;
          }
          .channel-patient-count-print-root .cpc-rev-table th:nth-child(2),
          .channel-patient-count-print-root .cpc-rev-table td:nth-child(2) {
            width: 10% !important;
            text-align: left !important;
            overflow-wrap: break-word !important;
          }
          .channel-patient-count-print-root .cpc-rev-table th:nth-child(n+3),
          .channel-patient-count-print-root .cpc-rev-table td:nth-child(n+3) {
            width: 4.58% !important;
            text-align: right !important;
            font-variant-numeric: tabular-nums !important;
          }
        }
      `}</style>
      <Card className="print:shadow-none print:border-0 print:bg-white">
        <CardHeader className="pb-2 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Channel Patient Count (Accounting Wise)</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Booking counts and fee totals grouped by booking channel type.
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
              reportName="Channel Patient Count (Accounting Wise)"
              pageSize="A4 portrait"
              pageMargins="7mm 5mm 18mm"
              generatedAt={reportMeta.generatedAt}
              summaryItems={buildSummaryItems(reportMeta)}
            >
              <div className="space-y-3">
                <div className="print:hidden">{renderReportMetaCard()}</div>
                <div className="cpc-section-title hidden">Bill Counts</div>
                <div className="rounded-md border overflow-x-auto">
                  <Table className="cpc-count-table text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                    <TableHeader>
                      <TableRow className="hidden print:table-row">
                        <TableHead>#</TableHead>
                        <TableHead>Booking Type</TableHead>
                        <TableHead>Paid-Paid</TableHead>
                        <TableHead>Paid-Pending</TableHead>
                        <TableHead>Paid-Net</TableHead>
                        <TableHead>Cancel-Paid</TableHead>
                        <TableHead>Cancel-Pending</TableHead>
                        <TableHead>Cancel-Net</TableHead>
                        <TableHead>Refund-Hos</TableHead>
                        <TableHead>Refund-Pro</TableHead>
                        <TableHead>Total-Paid</TableHead>
                        <TableHead>Total-Pending</TableHead>
                        <TableHead>Total-Net</TableHead>
                      </TableRow>
                      <TableRow className="bg-muted/40 text-muted-foreground print:hidden">
                        <TableHead rowSpan={2} className="text-center font-semibold">#</TableHead>
                        <TableHead rowSpan={2} className="font-semibold">Booking Type</TableHead>
                        <TableHead colSpan={3} className="text-center font-semibold">Paid Bill Count</TableHead>
                        <TableHead colSpan={3} className="text-center font-semibold">Cancel Bill Count</TableHead>
                        <TableHead colSpan={2} className="text-center font-semibold">Refund Bill Count</TableHead>
                        <TableHead colSpan={3} className="text-center font-semibold">Total Count</TableHead>
                      </TableRow>
                      <TableRow className="bg-muted/30 text-muted-foreground print:hidden">
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
                        <TableRow className="rpt-print-total font-semibold bg-muted/50">
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
                  <div className="cpc-section-title px-3 py-2 border-b bg-muted/40 text-sm font-semibold text-foreground">
                    Revenue Breakdown
                  </div>
                  <Table className="cpc-rev-table text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                    <TableHeader>
                      <TableRow className="hidden print:table-row">
                        <TableHead>#</TableHead>
                        <TableHead>Booking Type</TableHead>
                        <TableHead>Paid Hos Fee</TableHead>
                        <TableHead>Paid Hos Dis</TableHead>
                        <TableHead>Paid Pro Fee</TableHead>
                        <TableHead>Paid Pro Dis</TableHead>
                        <TableHead>Paid Hos Total</TableHead>
                        <TableHead>Cancel Hos Fee</TableHead>
                        <TableHead>Cancel Hos Dis</TableHead>
                        <TableHead>Cancel Pro Fee</TableHead>
                        <TableHead>Cancel Pro Dis</TableHead>
                        <TableHead>Cancel Hos Total</TableHead>
                        <TableHead>Refund Hos</TableHead>
                        <TableHead>Refund Pro</TableHead>
                        <TableHead>Nett Hos Fee</TableHead>
                        <TableHead>Nett Hos Dis</TableHead>
                        <TableHead>Nett Pro Fee</TableHead>
                        <TableHead>Nett Pro Dis</TableHead>
                        <TableHead>Nett Hos Total</TableHead>
                        <TableHead>Pending Hos</TableHead>
                        <TableHead>Pending Pro</TableHead>
                      </TableRow>
                      <TableRow className="bg-muted/40 text-muted-foreground print:hidden">
                        <TableHead rowSpan={2} className="text-center font-semibold">#</TableHead>
                        <TableHead rowSpan={2} className="font-semibold">Booking Type</TableHead>
                        <TableHead colSpan={5} className="text-center font-semibold">Paid Revenue</TableHead>
                        <TableHead colSpan={5} className="text-center font-semibold">Cancel Revenue</TableHead>
                        <TableHead colSpan={2} className="text-center font-semibold">Refund Revenue</TableHead>
                        <TableHead colSpan={5} className="text-center font-semibold">Nett Revenue</TableHead>
                        <TableHead colSpan={2} className="text-center font-semibold">Pending Revenue</TableHead>
                      </TableRow>
                      <TableRow className="bg-muted/30 text-muted-foreground print:hidden">
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
                        <TableRow className="rpt-print-total font-semibold bg-muted/50">
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
            </ReportPrintLayout>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

