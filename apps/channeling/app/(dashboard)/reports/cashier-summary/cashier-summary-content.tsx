'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReportUserMultiSelect } from '@/components/common/user-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { SearchIcon, Printer, Download, X } from 'lucide-react';
import { getCashierSummaryReportData } from '@/app/actions/reports/cashier-summary.action';
import { formatReceiptAmount } from '@/lib/format-money';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import { ReportGenerationDetailsCard } from '@/components/common/report-generation-details';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import type {
  CashierSummaryReportSection,
  CashierSummaryReportLineItem,
  CashierSummaryPaymentAmounts,
  CashierSummaryIncludedShift,
} from '@/types/report';

type CashierSummaryContentProps = {
  initialUserOptions: Array<{ id: string; name: string }>;
  initialLocationOptions: Array<{ id: string; name: string }>;
  currentUserName: string;
  initialFilters?: {
    userId: string;
    userIds?: string[];
    locationId?: string;
    dateFrom: string;
    dateTo: string;
    format: 'summary' | 'detail';
  };
  autoSearchOnLoad?: boolean;
};

/** Format amount for display. Handles both cents and rupees (same as receipt amounts). */
function formatAmount(n: number | undefined | null): string {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0.00';
  return formatReceiptAmount(num);
}

const PAYMENT_COLUMNS: { key: keyof CashierSummaryPaymentAmounts; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'creditCard', label: 'Credit Card' },
  { key: 'slip', label: 'Slip' },
  { key: 'cheque', label: 'Cheque' },
  { key: 'agent', label: 'Agent' },
  { key: 'agentCredit', label: 'Credit' },
  { key: 'eWallet', label: 'E-wallet' },
];

/** All agent-related bill sections: first column is agency name, not patient. */
const AGENCY_BILL_SECTION_KEYS = new Set([
  'agentBilled',
  'agentRefunded',
  'agentCanceled',
  'agentDeposit',
  'agentDepositCanceled',
]);

/** Amount columns: modest min width (~999,999 scale); nowrap so wider values grow the column. */
const AMOUNT_HEAD =
  'text-right tabular-nums lining-nums min-w-[5rem] !px-2 py-1 text-[11px] font-medium whitespace-nowrap align-bottom';
const AMOUNT_CELL =
  'text-right tabular-nums lining-nums font-mono text-[11px] leading-snug min-w-[5rem] !px-2 py-0.5 whitespace-nowrap align-middle';

/** Slip + Credit (credit customer) → Credit Summary; all other methods → Cash Summary (see report footer). */
const CASH_SUMMARY_KEYS: (keyof CashierSummaryPaymentAmounts)[] = [
  'cash',
  'creditCard',
  'cheque',
  'agent',
  'eWallet',
];

function sumAmounts(t: CashierSummaryPaymentAmounts, keys: (keyof CashierSummaryPaymentAmounts)[]): number {
  return keys.reduce((acc, k) => acc + Number(t[k] ?? 0), 0);
}

/** Footer: Credit Summary = Slip + Credit; Cash Summary = everything else. */
function CashierCreditCashSummaryFooter({ totals }: { totals: CashierSummaryPaymentAmounts }) {
  const slip = Number(totals.slip);
  const creditCustomer = Number(totals.agentCredit);
  const creditSectionTotal = slip + creditCustomer;
  const cashSectionTotal = sumAmounts(totals, CASH_SUMMARY_KEYS);
  const grandCombined = creditSectionTotal + cashSectionTotal;

  const cashRows: { key: keyof CashierSummaryPaymentAmounts; label: string }[] = [
    { key: 'cash', label: 'Cash Total' },
    { key: 'creditCard', label: 'Credit Card Total' },
    { key: 'cheque', label: 'Cheque Total' },
    { key: 'agent', label: 'Agent Total' },
    { key: 'eWallet', label: 'E-wallet Total' },
  ];

  const rowClass = 'border-t border-border/80';
  const cellLabel = 'px-3 py-1.5 text-[13px] text-left align-middle';
  const cellAmt = 'px-3 py-1.5 text-right tabular-nums text-[13px] align-middle';

  return (
    <div className="max-w-md">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        Cashier summary (credit vs cash)
      </h3>
      <div className="rounded-md border border-border overflow-hidden shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/90">
              <th colSpan={2} className="text-left font-semibold px-3 py-2 text-xs">
                Credit Summary
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className={rowClass}>
              <td className={cellLabel}>Slip Total</td>
              <td className={cellAmt}>{formatAmount(slip)}</td>
            </tr>
            <tr className={rowClass}>
              <td className={cellLabel}>Credit Total</td>
              <td className={cellAmt}>{formatAmount(creditCustomer)}</td>
            </tr>
            <tr className={`${rowClass} bg-muted/50 font-medium`}>
              <td className={cellLabel}>Total</td>
              <td className={cellAmt}>{formatAmount(creditSectionTotal)}</td>
            </tr>
          </tbody>
          <thead>
            <tr className="bg-muted/90 border-t-2 border-border">
              <th colSpan={2} className="text-left font-semibold px-3 py-2 text-xs">
                Cash Summary
              </th>
            </tr>
          </thead>
          <tbody>
            {cashRows.map(({ key, label }) => (
              <tr key={key} className={rowClass}>
                <td className={cellLabel}>{label}</td>
                <td className={cellAmt}>{formatAmount(totals[key])}</td>
              </tr>
            ))}
            <tr className={`${rowClass} bg-muted/50 font-medium`}>
              <td className={cellLabel}>Total</td>
              <td className={cellAmt}>{formatAmount(cashSectionTotal)}</td>
            </tr>
          </tbody>
          <tbody>
            <tr className="border-t-2 border-border bg-muted/80 font-semibold">
              <td className="px-3 py-2.5 text-[13px] text-left">Grand Total</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-[13px]">{formatAmount(grandCombined)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Default from = today 00:00, to = today 23:59 (end of day / midnight) in YYYY-MM-DDTHH:mm for datetime-local */
function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    from: `${y}-${m}-${d}T00:00`,
    to: `${y}-${m}-${d}T23:59`,
  };
}

export default function CashierSummaryContent({
  initialUserOptions,
  initialLocationOptions,
  currentUserName,
  initialFilters,
  autoSearchOnLoad = false,
}: CashierSummaryContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fromDateTime, setFromDateTime] = useState<string>(() => initialFilters?.dateFrom ?? getDefaultDateTimeRange().from);
  const [toDateTime, setToDateTime] = useState<string>(() => initialFilters?.dateTo ?? getDefaultDateTimeRange().to);
  /** Empty = all users; one or more = filter to those cashiers. */
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() => {
    const multi = (initialFilters?.userIds ?? []).filter((id) => id && id !== '__all__');
    if (multi.length > 0) return multi;
    const single = initialFilters?.userId;
    if (single && single !== '__all__') return [single];
    return [];
  });
  const [locationId, setLocationId] = useState<string>(() =>
    initialFilters?.locationId && initialFilters.locationId !== '__all__'
      ? initialFilters.locationId
      : '__all__'
  );
  const [format, setFormat] = useState<'summary' | 'detail'>(initialFilters?.format ?? 'summary');
  const [sections, setSections] = useState<CashierSummaryReportSection[]>([]);
  const [grandTotals, setGrandTotals] = useState<CashierSummaryPaymentAmounts | null>(null);
  const [reportMeta, setReportMeta] = useState<{
    userLabel: string;
    locationLabel: string;
    from: string;
    to: string;
    format: 'summary' | 'detail';
    includedShifts: CashierSummaryIncludedShift[];
    reportName: string;
    generatedBy: string;
    generatedAt: string;
  } | null>(null);

  const formatShiftSummaryLabel = (shift: CashierSummaryIncludedShift): string => {
    const start = new Date(shift.startedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
    const end = shift.endedAt
      ? new Date(shift.endedAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
      : 'Ongoing';
    const userName = shift.userName?.trim() || 'Unknown user';
    return `${userName} (${start} - ${end})`;
  };

  const renderReportMetaCard = (meta: {
    userLabel: string;
    locationLabel: string;
    from: string;
    to: string;
    format: 'summary' | 'detail';
    reportName: string;
    generatedBy: string;
    generatedAt: string;
    includedShifts: CashierSummaryIncludedShift[];
  }) => (
    <ReportGenerationDetailsCard
      items={[
        { label: 'Report', value: <span className="font-semibold">{meta.reportName}</span> },
        {
          label: 'Filters',
          value: (
            <>
              User: {meta.userLabel} | Branch: {meta.locationLabel} | Range:{' '}
              {formatReportRangeLabel(meta.from, meta.to)} | Format:{' '}
              {meta.format === 'detail' ? 'Detail' : 'Summary'}
            </>
          ),
          smColSpan: 2,
        },
        { label: 'Generated by', value: <span className="font-semibold">{meta.generatedBy}</span> },
        { label: 'Generated at', value: <span className="font-semibold">{meta.generatedAt}</span>, smColSpan: 2, lgColSpan: 1 },
        {
          label: 'Included shifts',
          value:
            meta.includedShifts.length > 0
              ? meta.includedShifts.map((shift) => formatShiftSummaryLabel(shift)).join(' | ')
              : 'No shift-tagged receipts in selected range',
          smColSpan: 2,
          lgColSpan: 1,
        },
      ]}
    />
  );

  const userOptions = initialUserOptions;
  const locationOptions = React.useMemo(
    () => withAllBranchesOptions(initialLocationOptions),
    [initialLocationOptions]
  );

  const selectedUserLabel = React.useMemo(() => {
    if (selectedUserIds.length === 0) return 'All';
    return selectedUserIds
      .map((id) => userOptions.find((u) => u.id === id)?.name ?? id)
      .join(', ');
  }, [selectedUserIds, userOptions]);

  const selectedLocationLabel = React.useMemo(() => {
    return locationOptions.find((l) => l.id === locationId)?.name ?? 'All Branches';
  }, [locationId, locationOptions]);

  const fetchReportData = async () => {
    if (!fromDateTime || !toDateTime) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both from and to date & time',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getCashierSummaryReportData({
        userId: selectedUserIds.length === 1 ? selectedUserIds[0] : undefined,
        userIds: selectedUserIds.length > 1 ? selectedUserIds : undefined,
        locationId,
        dateFrom: fromDateTime,
        dateTo: toDateTime,
        format,
      });

      if (result.success) {
        setSections(result.sections);
        setGrandTotals(result.grandTotals);
        setReportMeta({
          userLabel: selectedUserLabel,
          locationLabel: selectedLocationLabel,
          from: fromDateTime,
          to: toDateTime,
          format,
          includedShifts: result.includedShifts ?? [],
          reportName: 'Userwise Cashier Detail - Channel',
          generatedBy: currentUserName,
          generatedAt: new Date().toLocaleString(),
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data',
        });
        setSections([]);
        setGrandTotals(null);
        setReportMeta(null);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch report data';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: msg,
      });
      setSections([]);
      setGrandTotals(null);
      setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchReportData();
  };

  useEffect(() => {
    if (!autoSearchOnLoad) return;
    void fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    if (sections.length === 0 && !grandTotals) {
      toast({
        variant: 'destructive',
        title: 'No data',
        description: 'Run a search first to download CSV.',
      });
      return;
    }

    const lines: string[] = [];

    for (const section of sections) {
      const nameColumnLabel = AGENCY_BILL_SECTION_KEYS.has(section.key) ? 'Agency' : 'Patient';
      const header =
        'Section,Tx Created,Shift,Session Date/Time,Bill ID,Receipt ID,' +
        nameColumnLabel +
        ',Consultant,Name,Type,' +
        PAYMENT_COLUMNS.map((c) => c.label).join(',');
      lines.push(section.title);
      lines.push(header);

      for (const row of section.rows) {
        const txCreated =
          row.txCreated instanceof Date
            ? row.txCreated.toLocaleString()
            : String(row.txCreated ?? '');
        const cells = [
          section.title,
          txCreated,
          row.shiftLabel ?? '',
          row.sessionDateTime ?? '',
          row.billId ?? '',
          row.receiptId,
          row.patient ?? '',
          row.consultant ?? '',
          row.name ?? '',
          row.type ?? '',
          ...PAYMENT_COLUMNS.map((col) => {
            const n = Number(row[col.key]);
            return String(Number.isFinite(n) ? n / 100 : 0);
          }),
        ];
        lines.push(cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
      }

      const totalCells = [
        section.title,
        '',
        '',
        '',
        'Total',
        '',
        '',
        '',
        '',
        ...PAYMENT_COLUMNS.map((col) => {
            const n = Number(section.totals[col.key]);
            return String(Number.isFinite(n) ? n / 100 : 0);
          }),
      ];
      lines.push(totalCells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','));
      lines.push('');
    }

    if (grandTotals) {
      lines.push('Grand Total (all payment columns)');
      lines.push(
        [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          ...PAYMENT_COLUMNS.map((col) => {
            const n = Number(grandTotals[col.key]);
            return String(Number.isFinite(n) ? n / 100 : 0);
          }),
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(',')
      );
      const crSlip = Number(grandTotals.slip);
      const crCust = Number(grandTotals.agentCredit);
      const crTotal = crSlip + crCust;
      const cashTotal = sumAmounts(grandTotals, CASH_SUMMARY_KEYS);
      lines.push('');
      lines.push('"Credit Summary","","","","","","","","",""');
      lines.push(`"Slip Total","","","","","","","","","${String(crSlip / 100)}"`);
      lines.push(`"Credit Total","","","","","","","","","${String(crCust / 100)}"`);
      lines.push(`"Total (Credit Summary)","","","","","","","","","${String(crTotal / 100)}"`);
      lines.push('"Cash Summary","","","","","","","","",""');
      for (const col of PAYMENT_COLUMNS.filter((c) => CASH_SUMMARY_KEYS.includes(c.key))) {
        const n = Number(grandTotals[col.key]);
        lines.push(`"${col.label} Total","","","","","","","","","${String(Number.isFinite(n) ? n / 100 : 0)}"`);
      }
      lines.push(`"Total (Cash Summary)","","","","","","","","","${String(cashTotal / 100)}"`);
      lines.push(`"Grand Total (Credit + Cash)","","","","","","","","","${String((crTotal + cashTotal) / 100)}"`);
    }

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cashier-summary-${reportMeta?.from?.replace(/[:T]/g, '-') ?? ''}-to-${reportMeta?.to?.replace(/[:T]/g, '-') ?? 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasData = sections.some((s) => s.rows.length > 0 || PAYMENT_COLUMNS.some((col) => s.totals[col.key] !== 0));

  return (
    <div className="w-full py-2 space-y-3 print:py-2">
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Userwise Cashier Detail - Channel</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                User-wise cashier summary by date range with optional branch filter. Summary shows only refunds in detail; Detail shows all transactions.
              </CardDescription>
            </div>
            <div className="flex gap-2 no-print">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCSV} className="gap-2">
                <Download />
                Download CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 no-print">
            <div className="flex-shrink-0">
              <DateTimeRangePicker
                label="Date & time range"
                from={fromDateTime}
                to={toDateTime}
                onChange={({ from, to }) => {
                  setFromDateTime(from ?? '');
                  setToDateTime(to ?? '');
                }}
              />
            </div>
            <div className="flex-shrink-0">
              <label className="text-sm font-semibold mb-2 block">Branch</label>
              <div className="flex items-center gap-1">
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger className="h-8 w-[200px] px-2 py-1 text-sm shadow-none focus:ring-1 focus:ring-offset-0 [&>span]:block [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {locationId !== '__all__' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Clear branch"
                    onClick={() => setLocationId('__all__')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
            <ReportUserMultiSelect
              userOptions={userOptions}
              value={selectedUserIds}
              onChange={setSelectedUserIds}
              label="Select User"
              placeholder="All Users"
              widthClassName="w-[280px]"
              maxCount={3}
            />
            <div className="flex-shrink-0">
              <label className="text-sm font-semibold mb-2 block">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'summary' | 'detail')}>
                <SelectTrigger className="h-8 w-[140px] px-2 py-1 text-sm shadow-none focus:ring-1 focus:ring-offset-0 [&>span]:block [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detail">Detail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0">
              <Button
              size="sm"
                onClick={handleSearch}
                disabled={loading || !fromDateTime || !toDateTime}
                className="h-10 shrink-0 gap-2"
              >
                <SearchIcon className='h-4 w-4' />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!reportMeta && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <div className="max-w-2xl">
              <p className="text-sm font-medium text-muted-foreground">Search to view report details</p>
              <p className="text-sm text-muted-foreground mt-1">
                Select the date/time range, branch, user, and format, then click <span className="font-medium text-foreground">Search</span> to generate the Userwise Cashier report.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportMeta && (
        <Card className="bg-muted/20 print:shadow-none print:border-0">
          <CardHeader className="py-2">
            <CardTitle className="text-base">Userwise Cashier Summary</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              <span className="font-medium text-foreground">User:</span> {reportMeta.userLabel}
              {'  '}|{'  '}
              <span className="font-medium text-foreground">Branch:</span> {reportMeta.locationLabel}
              {'  '}|{'  '}
              <span className="font-medium text-foreground">Range:</span> {formatReportRangeLabel(reportMeta.from, reportMeta.to)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 py-2">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : !hasData ? (
              <div className="text-center py-8 text-muted-foreground">
                No data for the selected filters. Try a different date range, branch, or user.
              </div>
            ) : (
              <>
                {sections.map((section) => (
                  <SectionBlock
                    key={section.key}
                    section={section}
                    showRows={format === 'detail' || section.key === 'channelRefund'}
                  />
                ))}

                {grandTotals && (
                  <div className="border-t pt-4 mt-2">
                    <CashierCreditCashSummaryFooter totals={grandTotals} />
                  </div>
                )}
              </>
            )}
            {!loading && (
              <div className="border-t pt-4 mt-2 print:pt-3">{renderReportMetaCard(reportMeta)}</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  showRows,
}: {
  section: CashierSummaryReportSection;
  showRows: boolean;
}) {
  const isIncomeExpense = section.key === 'incomeExpense';
  const isAgencyBillSection = AGENCY_BILL_SECTION_KEYS.has(section.key);
  const hasAnyTotal = PAYMENT_COLUMNS.some((col) => section.totals[col.key] !== 0);

  return (
    <div className="space-y-1.5">
      <h3 className="font-semibold text-xs">{section.title}</h3>
      {showRows && section.rows.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-10 py-1 text-[11px] font-medium text-left">No.</TableHead>
                <TableHead className="min-w-[190px] py-1 text-[11px] font-medium text-left">Tx Created / Shift</TableHead>
                <TableHead className="min-w-[84px] py-1 text-[11px] font-medium text-left">Session Date/Time</TableHead>
                <TableHead className="py-1 text-[11px] font-medium text-left">Receipt ID / Bill ID</TableHead>
                {isIncomeExpense ? (
                  <>
                    <TableHead className="py-1 text-[11px] font-medium text-left">Name</TableHead>
                    <TableHead className="py-1 text-[11px] font-medium text-left">Type</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="py-1 text-[11px] font-medium text-left">
                      {isAgencyBillSection ? 'Agency' : 'Patient'}
                    </TableHead>
                    <TableHead className="py-1 text-[11px] font-medium text-left">Consultant</TableHead>
                  </>
                )}
                {PAYMENT_COLUMNS.map((c) => (
                  <TableHead key={c.key} className={AMOUNT_HEAD}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.rows.map((row, idx) => (
                <TableRow key={`${section.key}-${idx}`} className="border-b border-border/50">
                  <TableCell className="py-0.5 text-[11px] text-center tabular-nums">{idx + 1}</TableCell>
                  <TableCell className="py-0.5 text-[11px] align-top text-left">
                    <div className="whitespace-nowrap">
                      {row.txCreated instanceof Date
                        ? row.txCreated.toLocaleString()
                        : String(row.txCreated ?? '')}
                    </div>
                    <div className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                      {row.shiftLabel ?? '—'}
                    </div>
                  </TableCell>
                  <TableCell className="py-0.5 text-[11px] text-left">{row.sessionDateTime ?? '—'}</TableCell>
                  <TableCell className="py-0.5 text-[11px] text-left">
                    <div>{row.receiptId}</div>
                    <div className="text-[9px] text-muted-foreground leading-tight">{row.billId ?? '—'}</div>
                  </TableCell>
                  {isIncomeExpense ? (
                    <>
                      <TableCell className="py-0.5 text-[11px] text-left">{row.name ?? '—'}</TableCell>
                      <TableCell className="py-0.5 text-[11px] text-left">{row.type ?? '—'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="py-0.5 text-[11px] text-left">{row.patient ?? '—'}</TableCell>
                      <TableCell className="py-0.5 text-[11px] text-left">{row.consultant ?? '—'}</TableCell>
                    </>
                  )}
                  {PAYMENT_COLUMNS.map((col) => (
                    <TableCell key={col.key} className={AMOUNT_CELL}>
                      {formatAmount(row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/50">
                <TableCell colSpan={6} className="text-left text-[11px] py-0.5">
                  Total
                </TableCell>
                {PAYMENT_COLUMNS.map((col) => (
                  <TableCell key={col.key} className={`${AMOUNT_CELL} font-semibold`}>
                    {formatAmount(section.totals[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : hasAnyTotal ? (
        <div className="rounded-md border overflow-x-auto">
          <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-14 py-1 text-[11px] font-medium text-left">Total</TableHead>
                {PAYMENT_COLUMNS.map((c) => (
                  <TableHead key={c.key} className={AMOUNT_HEAD}>
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-medium">
                <TableCell className="py-0.5 text-[11px] text-left">Total</TableCell>
                {PAYMENT_COLUMNS.map((col) => (
                  <TableCell key={col.key} className={AMOUNT_CELL}>
                    {formatAmount(section.totals[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            No transactions found for this section in the selected filters.
          </p>
        </div>
      )}
    </div>
  );
}
