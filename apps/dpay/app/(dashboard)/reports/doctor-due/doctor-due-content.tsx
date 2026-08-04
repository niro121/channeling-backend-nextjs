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
  getDoctorDuePaymentReportAction,
  getDoctorDuePaymentReportExportAction,
} from '@/app/actions/reports/reports.actions';
import { ExportWrapper } from '../../export-wrapper';
import { formatLkr } from '@/lib/patient-bills/calculations';
import type {
  DoctorDuePaymentReportExportRow,
  DoctorDuePaymentReportRow,
} from '@/types/reports';
import { ReportDateRangeFields } from '../report-date-range-fields';
import { doctorDuePaymentReportColumns } from './columns';

export default function DoctorDueReportContent() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<DoctorDuePaymentReportRow[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
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
      const result = await getDoctorDuePaymentReportAction({
        keyword: keyword.trim() || undefined,
        dateFrom: fromDate,
        dateTo: toDate,
      });
      setRows(result.data);
      setTotalRecords(result.totalRecords);
      setTotalDue(result.totalDue);
      setHasMore(result.hasMore);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to fetch report data',
      });
      setRows([]);
      setTotalRecords(0);
      setTotalDue(0);
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

    return getDoctorDuePaymentReportExportAction({
      keyword: keyword.trim() || undefined,
      dateFrom: fromDate,
      dateTo: toDate,
    });
  };

  const exportColumns = [
    'Doctor',
    'Bill No',
    'BHT No',
    'Patient',
    'Admission Date',
    'Due',
    'Bill Status',
  ];
  const exportKeys: (keyof DoctorDuePaymentReportExportRow)[] = [
    'doctorName',
    'billNumber',
    'bxtNumber',
    'patientName',
    'admissionDate',
    'dueAmount',
    'billStatus',
  ];

  return (
    <div className="space-y-6">
      <BackButton href="/reports" label="Back to Reports" />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Doctor Due Payment Report</CardTitle>
              <CardDescription className="mt-1">
                Doctors still owed for unpaid bill line items. Display is capped at 10,000
                records; use Export for PDF/Excel/Print.
              </CardDescription>
            </div>
            <div className="shrink-0">
              <ExportWrapper
                serverData={handleExport}
                columns={exportColumns}
                keys={exportKeys}
                title="Doctor Due Payment Report"
                fileName={`doctor-due-${fromDate || 'from'}-to-${toDate || 'to'}`}
                showPrintButton
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctor-due-keyword">Search</Label>
              <Input
                id="doctor-due-keyword"
                placeholder="Doctor, bill no, BHT, or patient"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
                className="h-9 w-[280px]"
              />
            </div>

            <ReportDateRangeFields
              idPrefix="doctor-due"
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
              <CardTitle>Due doctor payments</CardTitle>
              <CardDescription>
                {loading
                  ? 'Loading...'
                  : totalRecords > 0
                    ? `Showing ${rows.length} of ${totalRecords} row${totalRecords === 1 ? '' : 's'}${
                        hasMore ? ' (capped at 10,000 — use Export)' : ''
                      }`
                    : 'No data. Select a date range and click Search.'}
              </CardDescription>
            </div>
            {rows.length > 0 ? (
              <div className="text-sm">
                <span className="text-muted-foreground">Total Due </span>
                <span className="font-bold tabular-nums text-amber-800">
                  {formatLkr(totalDue)}
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
                Select From / To dates and click Search to load unpaid doctor fees.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {doctorDuePaymentReportColumns.map((col, idx) => {
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
                      {doctorDuePaymentReportColumns.map((col, colIdx) => {
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
                          row[accessorKey as keyof DoctorDuePaymentReportRow] != null
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
