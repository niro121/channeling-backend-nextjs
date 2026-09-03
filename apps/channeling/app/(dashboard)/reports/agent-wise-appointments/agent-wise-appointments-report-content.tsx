'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Selector } from '@/components/common/selector';
import { Combobox } from '@/components/common/combobox';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { BackButton } from '@/components/common/back-button';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';
import { SearchIcon } from 'lucide-react';
import { ReportAgentSelect } from '@/components/common/agent-select';
import { ReportGenerationDetailsCard } from '@/components/common/report-generation-details';
import {
  formatReportRangeLabel,
  formatReportRangeOrdinalClipToYear
} from '@/lib/format-report-range-label';
import { formatReceiptAmount } from '@/lib/format-money';
import { getAgentWiseAppointmentsReportData } from '@/app/actions/reports/agent-wise-appointments.report.action';
import type {
  AgentWiseAppointmentsDetailRow,
  AgentWiseAppointmentsMonthColumn,
  AgentWiseAppointmentsReportType,
  AgentWiseAppointmentsSummaryRow
} from '@/types/reports/agent-wise-appointments';

type Props = {
  currentUserName: string;
  institutionOptions: Array<{ id: string; name: string }>;
  locationOptions: Array<{ id: string; name: string }>;
  departmentOptions: Array<{ id: string; name: string }>;
  agencyOptions: Array<{ id: string; name: string }>;
};

/** Flat row shape for PDF / Excel export (dynamic month keys use `m_YYYY-MM`). */
type AgentWiseExportRow = Record<string, string | number>;

function getDefaultDateTimeRange(): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return { from: `${y}-${m}-${d}T00:00`, to: `${y}-${m}-${d}T23:59` };
}

const tableCompact =
  'text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:py-1 [&_td]:py-1 [&_th]:border-r [&_thead>tr:first-child_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0';

/** Matches doctor-leave report creator column layout. */
function CreatorDisplay({ creatorLabel }: { creatorLabel: string }) {
  const [creatorName, ...rest] = creatorLabel.split('\n');
  const creatorDate = rest.join('\n').trim();
  return (
    <div className="flex flex-col gap-0.5 text-xs">
      <span>{creatorName?.trim() || '—'}</span>
      {creatorDate ? (
        <span className="text-muted-foreground">{creatorDate}</span>
      ) : null}
    </div>
  );
}

function filterLabel(
  id: string | undefined,
  allLabel: string,
  options: Array<{ id: string; name: string }>
): string {
  if (id == null || id === '' || id === '__all__') return allLabel;
  return options.find((o) => o.id === id)?.name ?? id;
}

/** Month-only label under a year header (same anchor as report service). */
function monthSubLabelFromKey(key: string): string {
  const d = new Date(`${key}-15T12:00:00+05:30`);
  return d.toLocaleString('en-GB', {
    timeZone: 'Asia/Colombo',
    month: 'long'
  });
}

function groupMonthColumnsByYear(
  columns: AgentWiseAppointmentsMonthColumn[]
): Array<{ year: string; columns: AgentWiseAppointmentsMonthColumn[] }> {
  const groups: Array<{
    year: string;
    columns: AgentWiseAppointmentsMonthColumn[];
  }> = [];
  for (const c of columns) {
    const year = c.key.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last?.year === year) last.columns.push(c);
    else groups.push({ year, columns: [c] });
  }
  return groups;
}

export default function AgentWiseAppointmentsReportContent({
  currentUserName,
  institutionOptions,
  locationOptions,
  departmentOptions,
  agencyOptions
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const def = getDefaultDateTimeRange();
  const [fromDateTime, setFromDateTime] = useState(def.from);
  const [toDateTime, setToDateTime] = useState(def.to);
  const [institutionId, setInstitutionId] = useState<string>('__all__');
  const [locationId, setLocationId] = useState<string>('__all__');
  const [departmentId, setDepartmentId] = useState<string>('__all__');
  const [agencyId, setAgencyId] = useState<string>('__all__');
  const [reportType, setReportType] =
    useState<AgentWiseAppointmentsReportType>('summary');

  const [monthColumns, setMonthColumns] = useState<
    AgentWiseAppointmentsMonthColumn[]
  >([]);
  const [summaryRows, setSummaryRows] = useState<
    AgentWiseAppointmentsSummaryRow[]
  >([]);
  const [detailRows, setDetailRows] = useState<
    AgentWiseAppointmentsDetailRow[]
  >([]);
  const [summaryMonthTotals, setSummaryMonthTotals] = useState<
    Record<string, number>
  >({});
  const [summaryGrandTotal, setSummaryGrandTotal] = useState(0);
  const [detailTotals, setDetailTotals] = useState({
    hospitalFee: 0,
    doctorFee: 0,
    discount: 0,
    totalFee: 0
  });
  const [reportMeta, setReportMeta] = useState<{
    from: string;
    to: string;
    institutionLabel: string;
    branchLabel: string;
    departmentLabel: string;
    agentLabel: string;
    reportType: AgentWiseAppointmentsReportType;
    generatedAt: string;
    generatedBy: string;
  } | null>(null);

  const institutionFilterOptions = React.useMemo(
    () => [{ id: '__all__', name: 'All Institutions' }, ...institutionOptions],
    [institutionOptions]
  );

  const branchOpts = React.useMemo(
    () => withAllBranchesOptions(locationOptions),
    [locationOptions]
  );

  const runSearch = async () => {
    if (!fromDateTime || !toDateTime) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select from and to date & time.'
      });
      return;
    }
    const fromMs = new Date(fromDateTime).getTime();
    const toMs = new Date(toDateTime).getTime();
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: '"From" must be before or equal to "To".'
      });
      return;
    }

    setLoading(true);
    try {
      const res = await getAgentWiseAppointmentsReportData({
        fromDateTime,
        toDateTime,
        institutionId,
        locationId,
        departmentId,
        agencyId,
        reportType
      });
      if (!res.success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: res.message || 'Failed to load report'
        });
        setReportMeta(null);
        setMonthColumns([]);
        setSummaryRows([]);
        setDetailRows([]);
        setSummaryMonthTotals({});
        setSummaryGrandTotal(0);
        setDetailTotals({
          hospitalFee: 0,
          doctorFee: 0,
          discount: 0,
          totalFee: 0
        });
        return;
      }
      setMonthColumns(res.monthColumns);
      setSummaryRows(res.summaryRows);
      setDetailRows(res.detailRows);
      setSummaryMonthTotals(res.summaryMonthTotals);
      setSummaryGrandTotal(res.summaryGrandTotal);
      setDetailTotals(res.detailTotals);
      setReportMeta({
        from: fromDateTime,
        to: toDateTime,
        institutionLabel: filterLabel(
          institutionId,
          'All Institutions',
          institutionFilterOptions
        ),
        branchLabel: filterLabel(locationId, 'All Branches', branchOpts),
        departmentLabel: filterLabel(
          departmentId,
          'All Departments',
          departmentOptions
        ),
        agentLabel: filterLabel(agencyId, 'All Agents', agencyOptions),
        reportType,
        generatedAt: new Date().toLocaleString(),
        generatedBy: currentUserName
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load report';
      toast({ variant: 'destructive', title: 'Error', description: msg });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = useCallback(() => {
    const d = getDefaultDateTimeRange();
    setFromDateTime(d.from);
    setToDateTime(d.to);
    setInstitutionId('__all__');
    setLocationId('__all__');
    setDepartmentId('__all__');
    setAgencyId('__all__');
    setReportType('summary');
    setReportMeta(null);
    setMonthColumns([]);
    setSummaryRows([]);
    setDetailRows([]);
    setSummaryMonthTotals({});
    setSummaryGrandTotal(0);
    setDetailTotals({
      hospitalFee: 0,
      doctorFee: 0,
      discount: 0,
      totalFee: 0
    });
  }, []);

  const exportColumns = useMemo((): string[] => {
    if (reportType === 'summary') {
      return ['Agent Name', 'Agent Code', ...monthColumns.map((c) => c.label), 'Grand Total'];
    }
    return [
      '#',
      'Agent Name',
      'Agent Ref',
      'Consultant',
      'Appointment Date',
      'Appointment Time',
      'Appointment No',
      'Bill Number',
      'Status',
      'Patient Name',
      'Phone',
      'Creator',
      'Hospital Fee',
      'Doctor Fee',
      'Discount',
      'Total Fee',
    ];
  }, [reportType, monthColumns]);

  const exportKeys = useMemo((): (keyof AgentWiseExportRow)[] => {
    if (reportType === 'summary') {
      return [
        'agentNameWithCode',
        'agentCode',
        ...monthColumns.map((c) => `m_${c.key}` as keyof AgentWiseExportRow),
        'grandTotal',
      ];
    }
    return [
      'idx',
      'agentNameWithCode',
      'agentRef',
      'consultantNameWithCode',
      'appointmentDate',
      'appointmentTime',
      'appointmentNo',
      'billNumber',
      'status',
      'patientName',
      'patientPhone',
      'creator',
      'hospitalFee',
      'doctorFee',
      'discount',
      'totalFee',
    ];
  }, [reportType, monthColumns]);

  const exportTitle = useMemo(
    () =>
      `Agent Wise Appointments — ${reportType === 'detail' ? 'Detail' : 'Summary'}`,
    [reportType]
  );

  const exportServerData = useCallback(async () => {
    if (!reportMeta) {
      return {
        success: false,
        message: 'Search to generate the report before exporting.',
      };
    }
    if (reportType === 'summary') {
      if (summaryRows.length === 0) {
        return { success: false, message: 'No data available' };
      }
      const rows: AgentWiseExportRow[] = summaryRows.map((r) => {
        const row: AgentWiseExportRow = {
          agentNameWithCode: r.agentNameWithCode,
          agentCode: r.agentCode,
          grandTotal: r.grandTotal,
        };
        for (const c of monthColumns) {
          row[`m_${c.key}`] = r.monthCounts[c.key] ?? 0;
        }
        return row;
      });
      const total: AgentWiseExportRow = {
        agentNameWithCode: 'Total',
        agentCode: '',
        grandTotal: summaryGrandTotal,
      };
      for (const c of monthColumns) {
        total[`m_${c.key}`] = summaryMonthTotals[c.key] ?? 0;
      }
      rows.push(total);
      return { success: true, data: rows };
    }
    if (detailRows.length === 0) {
      return { success: false, message: 'No data available' };
    }
    const rows: AgentWiseExportRow[] = detailRows.map((r, i) => ({
      idx: i + 1,
      agentNameWithCode: r.agentNameWithCode,
      agentRef: r.agentRef,
      consultantNameWithCode: r.consultantNameWithCode,
      appointmentDate: r.appointmentDateLabel,
      appointmentTime: r.appointmentTimeLabel,
      appointmentNo: r.appointmentNo,
      billNumber: r.billNumber,
      status: r.statusLabel,
      patientName: r.patientName,
      patientPhone: r.patientPhone,
      creator: r.creatorLabel.replace(/\n/g, ' '),
      hospitalFee: formatReceiptAmount(r.hospitalFee),
      doctorFee: formatReceiptAmount(r.doctorFee),
      discount: formatReceiptAmount(r.discount),
      totalFee: formatReceiptAmount(r.totalFee),
    }));
    rows.push({
      idx: detailRows.length,
      agentNameWithCode: 'Total',
      agentRef: '—',
      consultantNameWithCode: '—',
      appointmentDate: '—',
      appointmentTime: '—',
      appointmentNo: '—',
      billNumber: '—',
      status: '—',
      patientName: '—',
      patientPhone: '—',
      creator: '—',
      hospitalFee: formatReceiptAmount(detailTotals.hospitalFee),
      doctorFee: formatReceiptAmount(detailTotals.doctorFee),
      discount: formatReceiptAmount(detailTotals.discount),
      totalFee: formatReceiptAmount(detailTotals.totalFee),
    });
    return { success: true, data: rows };
  }, [
    reportMeta,
    reportType,
    summaryRows,
    detailRows,
    monthColumns,
    summaryMonthTotals,
    summaryGrandTotal,
    detailTotals,
  ]);

  const summaryYearGroups = useMemo(
    () => groupMonthColumnsByYear(monthColumns),
    [monthColumns]
  );

  return (
    <div className="container mx-auto py-3 space-y-4">
      <div className="flex justify-end">
        <BackButton href="/reports" className="w-fit" />
      </div>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">
                Agent Wise Appointments - Summary and Detail
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Agent channel booking events by receipt/refund transaction date,
                with summary counts per month or full detail.
              </CardDescription>
            </div>
            <div className="no-print">
              <ExportWrapper<AgentWiseExportRow>
                serverData={exportServerData}
                columns={exportColumns}
                keys={exportKeys}
                title={exportTitle}
                fileName="agent-wise-appointments-report"
                showPrintButton
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 no-print">
            <div className="flex flex-col gap-1.5">
              <DateTimeRangePicker
                label="Date and Time Range"
                from={fromDateTime}
                to={toDateTime}
                onChange={({ from, to }) => {
                  setFromDateTime(from ?? '');
                  setToDateTime(to ?? '');
                }}
              />
            </div>
            {/* <Selector
              label="Institution"
              options={institutionOptions}
              value={institutionId}
              onChange={(v) => setInstitutionId(v)}
              className={{ trigger: 'w-[220px]' }}
            /> */}
            <Combobox
              label="Branch (site)"
              options={branchOpts}
              value={locationId}
              defaultValue="__all__"
              clearable
              onChange={(v) => setLocationId(v ?? '__all__')}
            />
            {/* <Combobox
              label="Department"
              options={departmentOptions}
              value={departmentId}
              defaultValue="__all__"
              clearable
              onChange={(v) => setDepartmentId(v ?? '__all__')}
            /> */}
            <ReportAgentSelect
              agentOptions={agencyOptions}
              value={agencyId}
              onChange={setAgencyId}
              clearable
            />
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">
                Report type
              </label>
              <Select
                value={reportType}
                onValueChange={(v) =>
                  setReportType(v as AgentWiseAppointmentsReportType)
                }
              >
                <SelectTrigger className="w-[140px] font-semibold hover:bg-accent hover:text-accent-foreground cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">Summary</SelectItem>
                  <SelectItem value="detail">Detail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                onClick={runSearch}
                disabled={loading}
                className="h-10 gap-2"
              >
                <SearchIcon className="h-4 w-4" />
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                disabled={loading}
                className="h-10"
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {!reportMeta && (
        <Card className="border-dashed">
          <CardContent className="py-8">
            <p className="text-xs font-medium text-muted-foreground">
              Select filters and click Search to generate the report.
            </p>
          </CardContent>
        </Card>
      )}

      {reportMeta && (
        <Card className="bg-muted/20">
          <CardHeader className="py-2">
            <CardTitle className="text-base">
              Agent Wise Appointments - Summary and Detail
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {reportMeta.reportType === 'detail' ? 'Detail' : 'Summary'} view
              for the selected filters.
            </CardDescription>
            <ReportGenerationDetailsCard
              items={[
                {
                  label: 'Filters',
                  value: (
                    <>
                      Range:{' '}
                      {formatReportRangeLabel(reportMeta.from, reportMeta.to)} |
                      Institution: {reportMeta.institutionLabel} | Branch:{' '}
                      {reportMeta.branchLabel} | Department:{' '}
                      {reportMeta.departmentLabel} | Agent:{' '}
                      {reportMeta.agentLabel} | Type:{' '}
                      {reportMeta.reportType === 'detail'
                        ? 'Detail'
                        : 'Summary'}
                    </>
                  ),
                  smColSpan: 2
                },
                {
                  label: 'Generated by',
                  value: (
                    <span className="font-semibold">
                      {reportMeta.generatedBy}
                    </span>
                  )
                },
                {
                  label: 'Generated at',
                  value: (
                    <span className="font-semibold">
                      {reportMeta.generatedAt}
                    </span>
                  )
                }
              ]}
            />
          </CardHeader>
          <CardContent className="space-y-3 py-2">
            {loading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading…
              </div>
            ) : reportMeta.reportType === 'summary' ? (
              <div className="rounded-md border overflow-x-auto">
                <Table className={tableCompact}>
                  <TableHeader>
                    {monthColumns.length === 0 ? (
                      <TableRow>
                        <TableHead>Agent name</TableHead>
                        <TableHead>Agent code</TableHead>
                        <TableHead className="text-right tabular-nums">
                          Grand total
                        </TableHead>
                      </TableRow>
                    ) : (
                      <>
                        <TableRow>
                          <TableHead rowSpan={2}>Agent name</TableHead>
                          <TableHead rowSpan={2}>Agent code</TableHead>
                          {summaryYearGroups.map(({ year, columns }) => (
                            <TableHead
                              key={year}
                              colSpan={columns.length}
                              className="text-center align-top border-b bg-muted/40 px-2 py-1.5 font-semibold"
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="tabular-nums">{year}</span>
                                <span className="max-w-56 whitespace-normal text-center text-[10px] font-normal leading-snug text-muted-foreground">
                                  {formatReportRangeOrdinalClipToYear(
                                    year,
                                    reportMeta.from,
                                    reportMeta.to
                                  )}
                                </span>
                              </div>
                            </TableHead>
                          ))}
                          <TableHead
                            rowSpan={2}
                            className="text-right tabular-nums align-bottom"
                          >
                            Grand total
                          </TableHead>
                        </TableRow>
                        <TableRow>
                          {monthColumns.map((c) => (
                            <TableHead
                              key={c.key}
                              className="text-right tabular-nums whitespace-nowrap"
                            >
                              {monthSubLabelFromKey(c.key)}
                            </TableHead>
                          ))}
                        </TableRow>
                      </>
                    )}
                  </TableHeader>
                  <TableBody>
                    {summaryRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3 + monthColumns.length}
                          className="text-center text-muted-foreground"
                        >
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {summaryRows.map((r) => (
                          <TableRow key={r.agencyId}>
                            <TableCell className="whitespace-nowrap">
                              {r.agentNameWithCode}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.agentCode || '—'}
                            </TableCell>
                            {monthColumns.map((c) => (
                              <TableCell
                                key={c.key}
                                className="text-right tabular-nums"
                              >
                                {r.monthCounts[c.key] ?? 0}
                              </TableCell>
                            ))}
                            <TableCell className="text-right tabular-nums font-medium">
                              {r.grandTotal}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-medium text-sm">
                          <TableCell colSpan={2}>Total</TableCell>
                          {monthColumns.map((c) => (
                            <TableCell
                              key={c.key}
                              className="text-right tabular-nums"
                            >
                              {summaryMonthTotals[c.key] ?? 0}
                            </TableCell>
                          ))}
                          <TableCell className="text-right tabular-nums">
                            {summaryGrandTotal}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table className={tableCompact}>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-right">#</TableHead>
                      <TableHead>Agent name</TableHead>
                      <TableHead>Agent ref</TableHead>
                      <TableHead>Consultant</TableHead>
                      <TableHead>Appointment date</TableHead>
                      <TableHead>Appointment time</TableHead>
                      <TableHead className="text-right">Appt. no</TableHead>
                      <TableHead>Bill no</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Patient name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="min-w-[140px]">Creator</TableHead>
                      <TableHead className="text-right">Hospital fee</TableHead>
                      <TableHead className="text-right">Doctor fee</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={16}
                          className="text-center text-muted-foreground"
                        >
                          No records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {detailRows.map((r, idx) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-right tabular-nums">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.agentNameWithCode}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.agentRef}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.consultantNameWithCode}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.appointmentDateLabel}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.appointmentTimeLabel}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {r.appointmentNo}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.billNumber}
                            </TableCell>
                            <TableCell>{r.statusLabel}</TableCell>
                            <TableCell className="min-w-[140px]">
                              {r.patientName}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {r.patientPhone}
                            </TableCell>
                            <TableCell className="min-w-[140px]">
                              <CreatorDisplay creatorLabel={r.creatorLabel} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatReceiptAmount(r.hospitalFee)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatReceiptAmount(r.doctorFee)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatReceiptAmount(r.discount)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatReceiptAmount(r.totalFee)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-medium text-sm">
                          <TableCell className="text-right tabular-nums">
                            {detailRows.length}
                          </TableCell>
                          <TableCell colSpan={10}>Total</TableCell>
                          <TableCell />
                          <TableCell className="text-right tabular-nums">
                            {formatReceiptAmount(detailTotals.hospitalFee)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatReceiptAmount(detailTotals.doctorFee)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatReceiptAmount(detailTotals.discount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatReceiptAmount(detailTotals.totalFee)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
