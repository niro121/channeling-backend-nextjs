'use client';

import { useState } from 'react';
import { SearchIcon } from 'lucide-react';
import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@archmage/ui';
import {
  getPatientExcessReportAction,
  getPatientExcessReportExportAction,
} from '@/app/actions/reports/reports.actions';
import { ExportWrapper } from '../../export-wrapper';
import { formatLkr } from '@/lib/patient-bills/calculations';
import type {
  PatientExcessReportExportRow,
  PatientExcessReportRow,
} from '@/types/reports';
import { ReportDateRangeFields } from '../report-date-range-fields';
import { patientExcessReportColumns } from './columns';

export default function PatientExcessReportContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PatientExcessReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalExcess, setTotalExcess] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const fetchReportData = async () => {
    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both from date and to date',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getPatientExcessReportAction({
        keyword: keyword.trim() || undefined,
        dateFrom: fromDate,
        dateTo: toDate,
      });
      setRows(result.data);
      setTotalRecords(result.totalRecords);
      setTotalExcess(result.totalExcess);
      setHasMore(result.hasMore);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch report data',
      });
      setRows([]);
      setTotalRecords(0);
      setTotalExcess(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both from date and to date',
      });
      return { success: false, message: 'Please select date range' };
    }

    return getPatientExcessReportExportAction({
      keyword: keyword.trim() || undefined,
      dateFrom: fromDate,
      dateTo: toDate,
    });
  };

  const exportColumns = [
    'Bill No',
    'BHT No',
    'Patient',
    'Admission Date',
    'Total',
    'Paid',
    'Excess',
    'Status',
  ];
  const exportKeys: (keyof PatientExcessReportExportRow)[] = [
    'billNumber',
    'bxtNumber',
    'patientName',
    'admissionDate',
    'totalAmount',
    'paidAmount',
    'excessAmount',
    'status',
  ];

  return (
    <div className="space-y-6">
      <BackButton href="/reports" label="Back to Reports" />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Patient Excess Report</CardTitle>
              <CardDescription className="mt-1">
                Patients who paid more than the bill total (over paid). Display is capped at
                10,000 records; use Export for PDF/Excel/Print.
              </CardDescription>
            </div>
            <div className="shrink-0">
              <ExportWrapper
                serverData={handleExport}
                columns={exportColumns}
                keys={exportKeys}
                title="Patient Excess Report"
                fileName={`patient-excess-${fromDate || 'from'}-to-${toDate || 'to'}`}
                showPrintButton
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="excess-keyword">Search</Label>
              <Input
                id="excess-keyword"
                placeholder="Bill no, BHT, or patient"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
                className="h-9 w-[240px]"
              />
            </div>

            <ReportDateRangeFields
              idPrefix="patient-excess"
              dateFrom={fromDate ?? ''}
              dateTo={toDate ?? ''}
              onDateFromChange={setFromDate}
              onDateToChange={setToDate}
            />

            <Button
              onClick={fetchReportData}
              disabled={loading || !fromDate || !toDate}
              className="gap-2"
            >
              <SearchIcon className="h-4 w-4" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Overpaid balances</CardTitle>
              <CardDescription>
                {loading
                  ? 'Loading...'
                  : totalRecords > 0
                    ? `Showing ${rows.length} of ${totalRecords} bill${totalRecords === 1 ? '' : 's'}${
                        hasMore ? ' (capped at 10,000 — use Export)' : ''
                      }`
                    : 'No data. Select a date range and click Search.'}
              </CardDescription>
            </div>
            {rows.length > 0 ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Total Excess </span>
                <span className="font-bold tabular-nums text-teal-800">
                  {formatLkr(totalExcess)}
                </span>
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-medium">No results</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select From / To dates and click Search to load overpaid bills.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {patientExcessReportColumns.map((col, idx) => {
                      const accessorKey = (col as { accessorKey?: string }).accessorKey;
                      return (
                        <TableHead key={col.id || accessorKey || idx}>
                          {typeof col.header === 'string' ? col.header : ''}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.id}>
                      {patientExcessReportColumns.map((col, colIdx) => {
                        const accessorKey = (col as { accessorKey?: string }).accessorKey;
                        let cellValue: React.ReactNode = '—';

                        if (col.cell && typeof col.cell === 'function') {
                          const mockRow = {
                            original: row,
                            getValue: (key: string) =>
                              (row as Record<string, unknown>)[key.split('.')[0]],
                            index,
                          };
                          cellValue = col.cell({
                            row: mockRow as never,
                            column: col as never,
                            table: {} as never,
                            cell: col.cell as never,
                            getValue: mockRow.getValue as never,
                            renderValue: mockRow.getValue as never,
                          });
                        } else if (
                          accessorKey &&
                          row[accessorKey as keyof PatientExcessReportRow] != null
                        ) {
                          cellValue = String(
                            (row as Record<string, unknown>)[accessorKey]
                          );
                        }

                        return (
                          <TableCell key={col.id || accessorKey || colIdx}>
                            {cellValue}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
