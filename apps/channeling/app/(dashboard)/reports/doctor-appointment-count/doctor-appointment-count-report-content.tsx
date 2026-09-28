'use client';

import React, { useState } from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/common/date-range-picker';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { FileSpreadsheet, FileText, Loader2, Printer, SearchIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/hooks/use-toast';
import {
  getDoctorAppointmentCountReportData,
} from '@/app/actions/reports/doctor-appointment-count.report.action';
import type {
  DoctorAppointmentCountReportContentProps,
  DoctorAppointmentCountReportRow,
  DoctorAppointmentCountReportTotals,
} from '@/types/reports/doctor-appointment-count';
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

const BOOKING_TYPE_OPTIONS = [
  { id: 'scan', name: 'Scan' },
];

const GROUP_BY_OPTIONS = [
  { id: 'speciality', name: 'Group By Speciality' },
];

const SESSION_OPTIONS = [
  { id: 'morning', name: 'Morning' },
  { id: 'evening', name: 'Evening' },
];

function defaultRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}`, to: `${y}-${m}-${d}` };
}

const money = (n: number) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function DoctorAppointmentCountReportContent({
  locationOptions,
  specialityOptions,
  doctorOptions,
  currentUserName,
}: DoctorAppointmentCountReportContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [rows, setRows] = useState<DoctorAppointmentCountReportRow[]>([]);
  const [totals, setTotals] = useState<DoctorAppointmentCountReportTotals | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    from: string;
    to: string;
    branchLabel: string;
    specialityLabel: string;
    doctorLabel: string;
    bookingTypeLabel: string;
    groupByLabel: string;
    sessionLabel: string;
    generatedBy: string;
    generatedAt: string;
  } | null>(null);

  const [fromDateTime, setFromDateTime] = useState(defaultRange().from);
  const [toDateTime, setToDateTime] = useState(defaultRange().to);
  const [locationId, setLocationId] = useState('__all__');
  const [specialityId, setSpecialityId] = useState('__all__');
  const [doctorId, setDoctorId] = useState('__all__');
  const [bookingType, setBookingType] = useState('__all__');
  const [groupBy, setGroupBy] = useState('__none__');
  const [sessionType, setSessionType] = useState('__all__');

  const branchOptions = withAllBranchesOptions(locationOptions);
  const specialityFilteredOptions = specialityOptions.filter((o) => o.id !== '__all__');
  const doctorFilteredOptions = doctorOptions.filter((o) => o.id !== '__all__');
  const optionListsLoading =
    specialityFilteredOptions.length === 0 || doctorFilteredOptions.length === 0;

  const buildQuery = () => ({
    fromDateTime,
    toDateTime,
    locationId: locationId !== '__all__' ? locationId : undefined,
    specialityId: specialityId !== '__all__' ? specialityId : undefined,
    doctorId: doctorId !== '__all__' ? doctorId : undefined,
    bookingType: bookingType !== '__all__' ? bookingType : undefined,
    groupBy: groupBy !== '__none__' ? groupBy : undefined,
    sessionType: sessionType !== '__all__' ? sessionType : undefined,
  });

  const onSearch = async () => {
    if (optionListsLoading) {
      toast({
        variant: 'destructive',
        title: 'Please wait',
        description: 'Filter options are still loading.',
      });
      return;
    }
    setLoading(true);
    try {
      const res = await getDoctorAppointmentCountReportData(buildQuery());
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Error', description: res.message || 'Failed to load report' });
        setRows([]);
        setTotals(null);
        setReportMeta(null);
        return;
      }
      setRows(res.data);
      setTotals(res.totals);
      setReportMeta({
        from: fromDateTime,
        to: toDateTime,
        branchLabel: branchOptions.find((o) => o.id === locationId)?.name ?? 'All Branches',
        specialityLabel: specialityFilteredOptions.find((o) => o.id === specialityId)?.name ?? 'All Specialities',
        doctorLabel: doctorFilteredOptions.find((o) => o.id === doctorId)?.name ?? 'All Doctors',
        bookingTypeLabel: bookingType === 'scan' ? 'Scan' : 'All Bookings',
        groupByLabel: groupBy === 'speciality' ? 'Group By Speciality' : 'No Group',
        sessionLabel: sessionType === 'morning' ? 'Morning' : sessionType === 'evening' ? 'Evening' : 'All Sessions',
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
                  Range: {formatReportRangeLabel(reportMeta.from, reportMeta.to)} | Branch: {reportMeta.branchLabel} | Speciality: {reportMeta.specialityLabel} | Doctor: {reportMeta.doctorLabel}
                </div>
                <div>
                  Booking: {reportMeta.bookingTypeLabel} | Group By: {reportMeta.groupByLabel} | Session: {reportMeta.sessionLabel}
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
    { label: 'Branch', value: meta.branchLabel },
    { label: 'Speciality', value: meta.specialityLabel },
    { label: 'Doctor', value: meta.doctorLabel },
    { label: 'Booking', value: meta.bookingTypeLabel },
    { label: 'Group By', value: meta.groupByLabel },
    { label: 'Session', value: meta.sessionLabel },
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
      consultant: string;
      speciality: string;
      notPaid: string;
      paid: string;
      cancel: string;
      hosRefund: string;
      proRefund: string;
      hosValid: string;
      proValid: string;
      nettValid: string;
      hos: string;
      pro: string;
      total: string;
    };
    const toPdfRow = (
      r: DoctorAppointmentCountReportRow | DoctorAppointmentCountReportTotals,
      label?: string
    ): PdfRow => ({
      consultant: label ?? ('consultant' in r ? r.consultant : 'Total'),
      speciality: 'speciality' in r ? r.speciality : '',
      notPaid: String(r.notPaid),
      paid: String(r.paid),
      cancel: String(r.cancel),
      hosRefund: String(r.hosRefund),
      proRefund: String(r.proRefund),
      hosValid: String(r.hosValid),
      proValid: String(r.proValid),
      nettValid: String(r.nettValid),
      hos: money(r.hos),
      pro: money(r.pro),
      total: money(r.total),
    });
    const data: PdfRow[] = [
      ...rows.map((r) => toPdfRow(r)),
      ...(totals ? [toPdfRow(totals, 'Total')] : []),
    ];
    const columns = [
      'Consultant',
      'Speciality',
      'Not Paid',
      'Paid',
      'Cancel',
      'Hos Refund',
      'Pro Refund',
      'Hos Valid',
      'Pro Valid',
      'Nett Valid',
      'Hos',
      'Pro',
      'Total ( Rs. )',
    ] as const;
    const keys: (keyof PdfRow)[] = [
      'consultant',
      'speciality',
      'notPaid',
      'paid',
      'cancel',
      'hosRefund',
      'proRefund',
      'hosValid',
      'proValid',
      'nettValid',
      'hos',
      'pro',
      'total',
    ];
    await downloadBrandedReportPdf({
      reportName: 'Doctor Appointment Count Report ( By Session Date )',
      summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(reportMeta)),
      generatedAt: reportMeta.generatedAt,
      data,
      columns: [...columns],
      keys,
      fileName: `${formatExportFileName('doctor-appointment-count')}.pdf`,
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
        consultant: string;
        speciality: string;
        notPaid: string;
        paid: string;
        cancel: string;
        hosRefund: string;
        proRefund: string;
        hosValid: string;
        proValid: string;
        nettValid: string;
        hos: string;
        pro: string;
        total: string;
      };
      const toRow = (
        r: DoctorAppointmentCountReportRow | DoctorAppointmentCountReportTotals,
        label?: string
      ): ExcelRow => ({
        consultant: label ?? ('consultant' in r ? r.consultant : 'Total'),
        speciality: 'speciality' in r ? r.speciality : '',
        notPaid: String(r.notPaid),
        paid: String(r.paid),
        cancel: String(r.cancel),
        hosRefund: String(r.hosRefund),
        proRefund: String(r.proRefund),
        hosValid: String(r.hosValid),
        proValid: String(r.proValid),
        nettValid: String(r.nettValid),
        hos: money(r.hos),
        pro: money(r.pro),
        total: money(r.total),
      });
      const data: ExcelRow[] = [
        ...rows.map((r) => toRow(r)),
        ...(totals ? [toRow(totals, 'Total')] : []),
      ];
      await downloadBrandedReportExcel({
        reportName: 'Doctor Appointment Count Report ( By Session Date )',
        summaryItems: toBrandedPdfSummaryItems(buildSummaryItems(reportMeta)),
        generatedAt: reportMeta.generatedAt,
        data,
        columns: [
          'Consultant',
          'Speciality',
          'Not Paid',
          'Paid',
          'Cancel',
          'Hos Refund',
          'Pro Refund',
          'Hos Valid',
          'Pro Valid',
          'Nett Valid',
          'Hos',
          'Pro',
          'Total ( Rs. )',
        ],
        keys: [
          'consultant',
          'speciality',
          'notPaid',
          'paid',
          'cancel',
          'hosRefund',
          'proRefund',
          'hosValid',
          'proValid',
          'nettValid',
          'hos',
          'pro',
          'total',
        ],
        fileName: `${formatExportFileName('doctor-appointment-count')}.xlsx`,
        sheetName: 'Appointment Count',
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
    <div className="w-full py-2 space-y-3 doctor-appointment-count-print-root">
      <style>{`
        @media print {
          /* Full page width — print only (screen / PDF / Excel unchanged) */
          .doctor-appointment-count-print-root {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root,
          .doctor-appointment-count-print-root .rpt-print-body,
          .doctor-appointment-count-print-root .rpt-print-header,
          .doctor-appointment-count-print-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .doctor-appointment-count-print-root > div {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .doctor-appointment-count-print-root .overflow-x-auto,
          .doctor-appointment-count-print-root .overflow-auto,
          .doctor-appointment-count-print-root .overflow-hidden,
          .doctor-appointment-count-print-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /* Body — match compact branded PDF layout */
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          /* Consultant | Speciality | 8 counts | Hos | Pro | Total */
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(1),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(1) { width: 16% !important; }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(2),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(2) { width: 12% !important; }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(n+3):nth-child(-n+10),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(n+3):nth-child(-n+10) { width: 5% !important; }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(11),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(11),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(12),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(12) { width: 8% !important; }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(13),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(13) { width: 16% !important; }

          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th,
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td {
            font-size: 5.5pt !important;
            padding: 0.7mm 0.5mm !important;
            line-height: 1.2 !important;
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            overflow: hidden !important;
            text-overflow: clip !important;
            max-width: none !important;
            border: 0.5pt solid #000 !important;
            color: #000 !important;
            vertical-align: middle !important;
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(n+3):nth-child(-n+10),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(n+3):nth-child(-n+10) {
            text-align: center !important;
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(n+11),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(n+11) {
            text-align: right !important;
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:first-child,
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:first-child {
            border-left: 0.7pt solid #000 !important;
            text-align: left !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:nth-child(2),
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:nth-child(2) {
            text-align: left !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table th:last-child,
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root table.dac-print-table tr.rpt-print-total td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .doctor-appointment-count-print-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <Card className="print:shadow-none print:border-0 print:bg-white">
        <CardHeader className="pb-2 print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Doctor Appointment Count Report ( By Session Date )</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Receipt-count based appointment summary by booking session date.
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
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold">Date Range</label>
              <DateRangePicker
                from={fromDateTime}
                to={toDateTime}
                onChange={({ from, to }) => {
                  setFromDateTime(from ?? '');
                  setToDateTime(to ?? '');
                }}
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Combobox
                label="All Branches"
                options={branchOptions}
                value={locationId}
                defaultValue="__all__"
                clearable
                onChange={(v) => setLocationId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Combobox
                label="All Specialities"
                options={specialityFilteredOptions}
                value={specialityId}
                defaultValue="__all__"
                onChange={(v) => setSpecialityId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Combobox
                label="All Doctors"
                options={doctorFilteredOptions}
                value={doctorId}
                defaultValue="__all__"
                onChange={(v) => setDoctorId(v ?? '__all__')}
                loading={optionListsLoading}
              />
              <Selector label="All Bookings" options={BOOKING_TYPE_OPTIONS} value={bookingType} onChange={setBookingType} />
              <Selector label="No Group" options={GROUP_BY_OPTIONS} value={groupBy} defaultValue="__none__" onChange={setGroupBy} />
              <Selector label="All Sessions" options={SESSION_OPTIONS} value={sessionType} onChange={setSessionType} />
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
              reportName="Doctor Appointment Count Report ( By Session Date )"
              pageSize="A4 portrait"
              pageMargins="7mm 5mm 18mm"
              generatedAt={reportMeta.generatedAt}
              summaryItems={buildSummaryItems(reportMeta)}
            >
              <div className="space-y-3">
                <div className="print:hidden">{renderReportMetaCard()}</div>
                <div className="rounded-md border overflow-x-auto">
                  <Table className="dac-print-table text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="text-left">Consultant</TableHead>
                        <TableHead className="text-left">Speciality</TableHead>
                        <TableHead className="text-center">Not Paid</TableHead>
                        <TableHead className="text-center">Paid</TableHead>
                        <TableHead className="text-center">Cancel</TableHead>
                        <TableHead className="text-center">Hos Refund</TableHead>
                        <TableHead className="text-center">Pro Refund</TableHead>
                        <TableHead className="text-center">Hos Valid</TableHead>
                        <TableHead className="text-center">Pro Valid</TableHead>
                        <TableHead className="text-center">Nett Valid</TableHead>
                        <TableHead className="text-right">Hos</TableHead>
                        <TableHead className="text-right">Pro</TableHead>
                        <TableHead className="text-right">Total ( Rs. )</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.rowId} className="border-b border-border/50">
                          <TableCell>{r.consultant}</TableCell>
                          <TableCell>{r.speciality}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.notPaid}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.paid}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.cancel}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.hosRefund}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.proRefund}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.hosValid}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.proValid}</TableCell>
                          <TableCell className="text-center tabular-nums">{r.nettValid}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.hos)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.pro)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      {totals && (
                        <TableRow className="rpt-print-total font-semibold bg-muted/50">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.notPaid}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.paid}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.cancel}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.hosRefund}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.proRefund}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.hosValid}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.proValid}</TableCell>
                          <TableCell className="text-center tabular-nums">{totals.nettValid}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(totals.hos)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(totals.pro)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(totals.total)}</TableCell>
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
