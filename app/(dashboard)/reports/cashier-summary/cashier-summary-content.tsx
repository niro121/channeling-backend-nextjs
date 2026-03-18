'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { SearchIcon, Printer, Download } from 'lucide-react';
import { getCashierSummaryReportData } from '@/app/actions/reports/cashier-summary.action';
import { formatReceiptAmount } from '@/lib/format-money';
import type {
  CashierSummaryReportSection,
  CashierSummaryReportLineItem,
  CashierSummaryPaymentAmounts,
} from '@/types/report';

type CashierSummaryContentProps = {
  initialUserOptions: Array<{ id: string; name: string }>;
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
  { key: 'agentCredit', label: 'Agent Credit' },
];

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
}: CashierSummaryContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fromDateTime, setFromDateTime] = useState<string>(() => getDefaultDateTimeRange().from);
  const [toDateTime, setToDateTime] = useState<string>(() => getDefaultDateTimeRange().to);
  const [userId, setUserId] = useState<string>('__all__');
  const [format, setFormat] = useState<'summary' | 'detail'>('summary');
  const [sections, setSections] = useState<CashierSummaryReportSection[]>([]);
  const [grandTotals, setGrandTotals] = useState<CashierSummaryPaymentAmounts | null>(null);
  const [reportMeta, setReportMeta] = useState<{ userLabel: string; from: string; to: string } | null>(null);

  /** Format from/to for display (date + time if present) */
  const formatRangeLabel = (fromStr: string, toStr: string) => {
    try {
      const hasTime = fromStr.includes('T') || toStr.includes('T');
      if (hasTime) {
        const f = new Date(fromStr);
        const t = new Date(toStr);
        return `${f.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })} – ${t.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}`;
      }
      return `${fromStr} 00:00:00 – ${toStr} 23:59:59`;
    } catch {
      return `${fromStr} – ${toStr}`;
    }
  };

  const userOptions = [{ id: '__all__', name: 'All Users' }, ...initialUserOptions];

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
        userId,
        dateFrom: fromDateTime,
        dateTo: toDateTime,
        format,
      });

      if (result.success) {
        setSections(result.sections);
        setGrandTotals(result.grandTotals);
        const selectedUser = userOptions.find((u) => u.id === userId);
        setReportMeta({
          userLabel: selectedUser?.name ?? 'All',
          from: fromDateTime,
          to: toDateTime,
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
    const header =
      'Section,Tx Created,Session Date/Time,Bill ID,Receipt ID,Patient,Consultant,Name,Type,' +
      PAYMENT_COLUMNS.map((c) => c.label).join(',');

    for (const section of sections) {
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
      lines.push('Grand Total');
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
    <div className="container mx-auto py-4 space-y-4 print:py-2">
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">Userwise Cashier Detail - Channel</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                User-wise cashier summary by date range. Summary shows only refunds in detail; Detail shows all transactions.
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
              <label className="text-sm font-semibold mb-2 block">Select User</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0">
              <label className="text-sm font-semibold mb-2 block">Format</label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'summary' | 'detail')}>
                <SelectTrigger className="w-[140px]">
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

      {reportMeta && (
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="py-2">
            <CardTitle className="text-base">
              Userwise Cashier Summary of {reportMeta.userLabel} :: {formatRangeLabel(reportMeta.from, reportMeta.to)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 py-2">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : !hasData ? (
              <div className="text-center py-8 text-muted-foreground">
                No data for the selected filters. Try a different date range or user.
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
                  <div className="border-t pt-2 mt-2">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b">
                            <TableHead className="text-right font-medium py-1.5 text-xs w-14">Total</TableHead>
                            {PAYMENT_COLUMNS.map((c) => (
                              <TableHead key={c.key} className="text-right font-medium py-1.5 text-xs tabular-nums">
                                {c.label}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow className="font-medium">
                            <TableCell className="text-right py-1.5 text-xs font-semibold">Total</TableCell>
                            {PAYMENT_COLUMNS.map((c) => (
                              <TableCell key={c.key} className="text-right py-1.5 text-xs tabular-nums">
                                {formatAmount(grandTotals[c.key])}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
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
  const hasAnyTotal = PAYMENT_COLUMNS.some((col) => section.totals[col.key] !== 0);

  return (
    <div className="space-y-1.5">
      <h3 className="font-semibold text-xs">{section.title}</h3>
      {showRows && section.rows.length > 0 ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="min-w-[100px] py-1.5 text-xs font-medium">Tx Created</TableHead>
                <TableHead className="min-w-[100px] py-1.5 text-xs font-medium">Session Date/Time</TableHead>
                <TableHead className="py-1.5 text-xs font-medium">Bill ID</TableHead>
                <TableHead className="py-1.5 text-xs font-medium">Receipt ID</TableHead>
                {isIncomeExpense ? (
                  <>
                    <TableHead className="py-1.5 text-xs font-medium">Name</TableHead>
                    <TableHead className="py-1.5 text-xs font-medium">Type</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="py-1.5 text-xs font-medium">Patient</TableHead>
                    <TableHead className="py-1.5 text-xs font-medium">Consultant</TableHead>
                  </>
                )}
                {PAYMENT_COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-right py-1.5 text-xs font-medium tabular-nums">
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.rows.map((row, idx) => (
                <TableRow key={`${section.key}-${idx}`} className="border-b border-border/50">
                  <TableCell className="whitespace-nowrap py-1 text-xs">
                    {row.txCreated instanceof Date
                      ? row.txCreated.toLocaleString()
                      : String(row.txCreated ?? '')}
                  </TableCell>
                  <TableCell className="py-1 text-xs">{row.sessionDateTime ?? '—'}</TableCell>
                  <TableCell className="py-1 text-xs">{row.billId ?? '—'}</TableCell>
                  <TableCell className="py-1 text-xs">{row.receiptId}</TableCell>
                  {isIncomeExpense ? (
                    <>
                      <TableCell className="py-1 text-xs">{row.name ?? '—'}</TableCell>
                      <TableCell className="py-1 text-xs">{row.type ?? '—'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="py-1 text-xs">{row.patient ?? '—'}</TableCell>
                      <TableCell className="py-1 text-xs">{row.consultant ?? '—'}</TableCell>
                    </>
                  )}
                  {PAYMENT_COLUMNS.map((col) => (
                    <TableCell key={col.key} className="text-right tabular-nums text-xs py-1">
                      {formatAmount(row[col.key])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow className="font-medium bg-muted/50">
                <TableCell colSpan={6} className="text-right text-xs py-1">
                  Total
                </TableCell>
                {PAYMENT_COLUMNS.map((col) => (
                  <TableCell key={col.key} className="text-right tabular-nums text-xs py-1">
                    {formatAmount(section.totals[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : hasAnyTotal ? (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b">
                <TableHead className="w-14 py-1.5 text-xs font-medium">Total</TableHead>
                {PAYMENT_COLUMNS.map((c) => (
                  <TableHead key={c.key} className="text-right py-1.5 text-xs font-medium tabular-nums">
                    {c.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="font-medium">
                <TableCell className="py-1.5 text-xs">Total</TableCell>
                {PAYMENT_COLUMNS.map((col) => (
                  <TableCell key={col.key} className="text-right tabular-nums text-xs py-1.5">
                    {formatAmount(section.totals[col.key])}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No data</p>
      )}
    </div>
  );
}
