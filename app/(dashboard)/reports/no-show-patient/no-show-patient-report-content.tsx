'use client';

import React, { useMemo, useState } from 'react';
import moment from 'moment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateTimeRangePicker } from '@/components/common/date-time-range-picker';
import { Combobox } from '@/components/common/combobox';
import { Selector } from '@/components/common/selector';
import { Download, Printer, SearchIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/hooks/use-toast';
import { ReportEmptyStateCard } from '@/components/common/report-empty-state';
import { ReportGenerationDetailsCard } from '@/components/common/report-generation-details';
import { formatReportRangeLabel } from '@/lib/format-report-range-label';
import { withAllBranchesOptions } from '@/lib/report-branch-options';
import {
  exportNoShowPatientReportData,
  getNoShowPatientReportData,
} from '@/app/actions/reports/no-show-patient.report.action';
import type {
  NoShowPatientReportContentProps,
  NoShowPatientReportQuery,
  NoShowPatientReportRow,
  NoShowPatientReportType,
} from '@/types/reports/no-show-patient';

const REPORT_TYPE_OPTIONS = [
  { id: 'by_date', name: 'By Date' },
  { id: 'by_month', name: 'By Month' },
] as const;

/** Default from = today 00:00, to = today 23:59 (local) in YYYY-MM-DDTHH:mm for datetime-local */
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

export default function NoShowPatientReportContent({
  currentUserName,
  institutionOptions,
  locationOptions,
  departmentOptions,
  specialityOptions,
  doctorOptions,
}: NoShowPatientReportContentProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<NoShowPatientReportRow[]>([]);
  const [periodKeys, setPeriodKeys] = useState<string[]>([]);
  const [periodLabels, setPeriodLabels] = useState<Record<string, string>>({});
  const [columnTotals, setColumnTotals] = useState<Record<string, number>>({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const [reportMeta, setReportMeta] = useState<{
    fromDate: string;
    toDate: string;
    institutionLabel: string;
    branchLabel: string;
    departmentLabel: string;
    specialityLabel: string;
    doctorLabel: string;
    reportTypeLabel: string;
    generatedBy: string;
    generatedAt: string;
  } | null>(null);

  const [fromDateTime, setFromDateTime] = useState<string>(getDefaultDateTimeRange().from);
  const [toDateTime, setToDateTime] = useState<string>(getDefaultDateTimeRange().to);
  const [institutionId, setInstitutionId] = useState('__all__');
  const [locationId, setLocationId] = useState('__all__');
  const [departmentId, setDepartmentId] = useState('__all__');
  const [specialityId, setSpecialityId] = useState('__all__');
  const [doctorId, setDoctorId] = useState('__all__');
  const [reportType, setReportType] = useState<NoShowPatientReportType>('by_date');

  const branchOptions = withAllBranchesOptions(locationOptions);
  const optionListsLoading = false;

  const buildQuery = (): NoShowPatientReportQuery => ({
    fromDate: fromDateTime,
    toDate: toDateTime,
    institutionId: institutionId !== '__all__' ? institutionId : undefined,
    locationId: locationId !== '__all__' ? locationId : undefined,
    departmentId: departmentId !== '__all__' ? departmentId : undefined,
    specialityId: specialityId !== '__all__' ? specialityId : undefined,
    doctorId: doctorId !== '__all__' ? doctorId : undefined,
    reportType,
  });

  const labels = useMemo(
    () => ({
      institution: institutionOptions.find((o) => o.id === institutionId)?.name ?? 'All Institutions',
      branch: branchOptions.find((o) => o.id === locationId)?.name ?? 'All Branches',
      department: departmentOptions.find((o) => o.id === departmentId)?.name ?? 'All Departments',
      speciality: specialityOptions.find((o) => o.id === specialityId)?.name ?? 'All Specialities',
      doctor: doctorOptions.find((o) => o.id === doctorId)?.name ?? 'All Doctors',
      reportType: reportType === 'by_month' ? 'By Month' : 'By Date',
    }),
    [
      institutionId,
      locationId,
      departmentId,
      specialityId,
      doctorId,
      reportType,
      institutionOptions,
      branchOptions,
      departmentOptions,
      specialityOptions,
      doctorOptions,
    ]
  );

  const onSearch = async () => {
    if (optionListsLoading) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await getNoShowPatientReportData(buildQuery());
      if (!res.success) {
        toast({ variant: 'destructive', title: 'Error', description: res.message || 'Failed to load report' });
        setRows([]);
        setPeriodKeys([]);
        setPeriodLabels({});
        setColumnTotals({});
        setGrandTotal(0);
        setReportMeta(null);
        return;
      }
      setRows(res.data ?? []);
      setPeriodKeys(res.periodKeys ?? []);
      setPeriodLabels(res.periodLabels ?? {});
      setColumnTotals(res.columnTotals ?? {});
      setGrandTotal(res.grandTotal ?? 0);
      setReportMeta({
        fromDate: fromDateTime,
        toDate: toDateTime,
        institutionLabel: labels.institution,
        branchLabel: labels.branch,
        departmentLabel: labels.department,
        specialityLabel: labels.speciality,
        doctorLabel: labels.doctor,
        reportTypeLabel: labels.reportType,
        generatedBy: currentUserName,
        generatedAt: new Date().toLocaleString(),
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to load report';
      toast({ variant: 'destructive', title: 'Error', description: msg });
      setRows([]);
      setPeriodKeys([]);
      setPeriodLabels({});
      setColumnTotals({});
      setGrandTotal(0);
      setReportMeta(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadCsv = async () => {
    if (!hasSearched) {
      toast({ variant: 'destructive', title: 'No data', description: 'Run a search first to download CSV.' });
      return;
    }
    const result = await exportNoShowPatientReportData(buildQuery());
    if (!result.success || !result.data?.length) {
      toast({ variant: 'destructive', title: 'No data', description: result.message || 'No data available.' });
      return;
    }

    const dynamicHeaderKeys = periodKeys.map((k) => periodLabels[k] ?? k);
    const headerKeys = ['speciality', 'doctorName', ...dynamicHeaderKeys, 'total'];
    const headers = ['Speciality', 'Doctor Name', ...dynamicHeaderKeys, 'Total'];
    const lines: string[] = [];
    lines.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

    for (const row of result.data) {
      const rowVals = headerKeys.map((k) => String(row[k] ?? ''));
      lines.push(rowVals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `no-show-patient-report-${moment().format('YYYY-MM-DD')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderReportMetaCard = () =>
    reportMeta ? (
      <ReportGenerationDetailsCard
        items={[
          {
            label: 'Report',
            value: <span className="font-semibold">No Show Patient Report</span>,
          },
          {
            label: 'Filters',
            value: (
              <>
                <div>
                  Range: {formatReportRangeLabel(reportMeta.fromDate, reportMeta.toDate)} | Institution:{' '}
                  {reportMeta.institutionLabel} | Branch: {reportMeta.branchLabel} | Department:{' '}
                  {reportMeta.departmentLabel}
                </div>
                <div>
                  Speciality: {reportMeta.specialityLabel} | Doctor: {reportMeta.doctorLabel} | Report Type:{' '}
                  {reportMeta.reportTypeLabel}
                </div>
              </>
            ),
            smColSpan: 2,
          },
          {
            label: 'Generated by',
            value: <span className="font-semibold">{reportMeta.generatedBy}</span>,
          },
          {
            label: 'Generated at',
            value: <span className="font-semibold">{reportMeta.generatedAt}</span>,
          },
        ]}
      />
    ) : null;

  return (
    <div className="container mx-auto py-3 space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-xl font-bold">No Show Patient Report</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                No-show patient counts by speciality and doctor, summarized by date or month.
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
          <div className="flex flex-wrap items-end gap-4 mb-4 pb-3 border-b no-print">
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
            <Combobox
              label="Institution"
              options={institutionOptions}
              value={institutionId}
              defaultValue="__all__"
              onChange={(v) => setInstitutionId(v ?? '__all__')}
            />
            <Combobox
              label="Branch"
              options={branchOptions}
              value={locationId}
              defaultValue="__all__"
              onChange={(v) => setLocationId(v ?? '__all__')}
            />
            <Combobox
              label="Department"
              options={departmentOptions}
              value={departmentId}
              defaultValue="__all__"
              onChange={(v) => setDepartmentId(v ?? '__all__')}
            />
            <Combobox
              label="Speciality"
              options={specialityOptions}
              value={specialityId}
              defaultValue="__all__"
              onChange={(v) => setSpecialityId(v ?? '__all__')}
            />
            <Combobox
              label="Doctor"
              options={doctorOptions}
              value={doctorId}
              defaultValue="__all__"
              onChange={(v) => setDoctorId(v ?? '__all__')}
            />
            <Selector
              label="Report Type"
              options={REPORT_TYPE_OPTIONS.map((x) => ({ id: x.id, name: x.name }))}
              value={reportType}
              showDefaultOption={false}
              onChange={(v) => setReportType((v as NoShowPatientReportType) ?? 'by_date')}
            />
            <Button onClick={onSearch} disabled={loading || !fromDateTime || !toDateTime} className="gap-2">
              <SearchIcon className="h-4 w-4" />
              Search
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : !hasSearched ? (
            <ReportEmptyStateCard
              title="Run a search to view results"
              description="No no-show patients found. Select filters and click Search."
            />
          ) : rows.length === 0 ? (
            <div className="space-y-3">
              {renderReportMetaCard()}
              <ReportEmptyStateCard
                title="No results"
                description="No no-show patients found for the selected filters."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {renderReportMetaCard()}
              <div className="rounded-md border overflow-x-auto">
                <Table className="text-[11px] [&_th]:px-1.5 [&_td]:px-1.5 [&_th]:border-r [&_th:last-child]:border-r-0 [&_td]:border-r [&_td:last-child]:border-r-0">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead className="text-left">Speciality</TableHead>
                      <TableHead className="text-left">Doctor Name</TableHead>
                      {periodKeys.map((k) => (
                        <TableHead key={k} className="text-center">
                          {periodLabels[k] ?? k}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.rowId} className="border-b border-border/50">
                        <TableCell>{row.speciality}</TableCell>
                        <TableCell>{row.doctorName}</TableCell>
                        {periodKeys.map((k) => (
                          <TableCell key={`${row.rowId}-${k}`} className="text-center tabular-nums">
                            {row.periodCounts[k] ?? 0}
                          </TableCell>
                        ))}
                        <TableCell className="text-center tabular-nums font-semibold">{row.total}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted/50">
                      <TableCell></TableCell>
                      <TableCell>Total</TableCell>
                      {periodKeys.map((k) => (
                        <TableCell key={`total-${k}`} className="text-center tabular-nums">
                          {columnTotals[k] ?? 0}
                        </TableCell>
                      ))}
                      <TableCell className="text-center tabular-nums">{grandTotal}</TableCell>
                    </TableRow>
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
