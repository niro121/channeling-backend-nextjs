'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { getAllDoctorViewReportData, exportAllDoctorViewReportData } from '@/app/actions/reports/all-doctor-view.action';
import { AllDoctorViewRowData, AllDoctorViewTotals } from '@/types/report';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { X } from 'lucide-react';
import { ExportWrapper } from '../../export-wrapper';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { Selector } from '@/components/common/selector';
import { SearchIcon } from '@/components/icons';
import moment from 'moment';
import { ReportPrintLayout, toBrandedPdfSummaryItems } from '@/components/common/report-print';
import type { ReportPrintSummaryItem } from '@/components/common/report-print';
import Loading from '@/app/(dashboard)/loading';

type AllDoctorViewReportContentProps = {
  initialLocationOptions: Array<{ id: string; name: string }>;
  initialFilters?: {
    date?: string;
    sessionType?: string;
    feeType?: string;
    locationId?: string;
  };
};

export default function AllDoctorViewReportContent({
  initialLocationOptions,
  initialFilters
}: AllDoctorViewReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AllDoctorViewRowData[]>([]);
  const [totals, setTotals] = useState<AllDoctorViewTotals | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter states
  const [date, setDate] = useState<Date | null>(() => {
    const rawDate = initialFilters?.date;
    if (!rawDate) return new Date();
    const parsed = moment(rawDate, 'YYYY-MM-DD', true);
    return parsed.isValid() ? parsed.toDate() : new Date();
  });
  const [sessionType, setSessionType] = useState<string>(
    initialFilters?.sessionType === 'morning' || initialFilters?.sessionType === 'evening'
      ? initialFilters.sessionType
      : '__all__'
  );
  const [feeType, setFeeType] = useState<string>(
    initialFilters?.feeType === 'hospital' || initialFilters?.feeType === 'professional'
      ? initialFilters.feeType
      : '__all__'
  );
  const [locationId, setLocationId] = useState<string>(initialFilters?.locationId || '__all__');
  
  // Options
  const [locationOptions] = useState(initialLocationOptions);
  
  const sessionTypeOptions = [
    { id: 'morning', name: 'Morining (From 12.00 AM to 11.59 AM)' },
    { id: 'evening', name: 'Evening (From 12.00 PM to 11.59 PM)' },
  ];

  const feeTypeOptions = [
    { id: 'hospital', name: 'Hospital Fee' },
    { id: 'professional', name: 'Professional Fee' },
  ];

  const hasAutoLoaded = useRef(false);

  const fetchReportData = useCallback(async () => {
    if (!date) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a date'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getAllDoctorViewReportData({
        date: moment(date).format('YYYY-MM-DD'),
        sessionType: sessionType !== '__all__' ? sessionType : undefined,
        feeType: feeType !== '__all__' ? feeType : undefined,
        locationId: locationId !== '__all__' ? locationId : undefined,
      });

      if (result.success) {
        setRows(result.data);
        setTotals(result.totals);
        setTotalRecords(result.totalRecords);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setRows([]);
        setTotals(null);
        setTotalRecords(0);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report data';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
      setRows([]);
      setTotals(null);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, [date, feeType, locationId, sessionType, toast]);

  useEffect(() => {
    if (hasAutoLoaded.current) return;
    hasAutoLoaded.current = true;
    void fetchReportData();
  }, [fetchReportData]);

  const handleSearch = () => {
    void fetchReportData();
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExport = async () => {
    if (!date) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select a date'
      });
      return { success: false, message: 'Please select a date' };
    }

    return await exportAllDoctorViewReportData({
      date: moment(date).format('YYYY-MM-DD'),
      sessionType: sessionType !== '__all__' ? sessionType : undefined,
      feeType: feeType !== '__all__' ? feeType : undefined,
      locationId: locationId !== '__all__' ? locationId : undefined,
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6 print:py-2 all-doctor-view-print-root">
      <style>{`
        @media print {
          /* Match branded PDF body: full content width under same page margins */
          .all-doctor-view-print-root,
          .all-doctor-view-print-root.container {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .all-doctor-view-print-root .rpt-print-root,
          .all-doctor-view-print-root .rpt-print-body,
          .all-doctor-view-print-root .rpt-print-header,
          .all-doctor-view-print-root .rpt-print-summary {
            width: 100% !important;
            max-width: none !important;
            box-sizing: border-box !important;
          }
          .all-doctor-view-print-root > div {
            width: 100% !important;
            max-width: none !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .all-doctor-view-print-root .overflow-x-auto,
          .all-doctor-view-print-root .overflow-auto,
          .all-doctor-view-print-root .overflow-hidden,
          .all-doctor-view-print-root .rounded-md {
            overflow: visible !important;
            width: 100% !important;
            max-width: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /* Body table — same proportions as compact PDF autoTable */
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table {
            table-layout: fixed !important;
            width: 100% !important;
            max-width: 100% !important;
            border-collapse: collapse !important;
            border: 0.5pt solid #000 !important;
          }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table col.adv-col-no { width: 4% !important; }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table col.adv-col-consultant { width: 22% !important; }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table col.adv-col-num { width: 5% !important; }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table col.adv-col-total { width: 10% !important; }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table col.adv-col-time { width: 24% !important; }

          .all-doctor-view-print-root .rpt-print-root table.adv-print-table th,
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table td {
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
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table thead th {
            font-size: 5pt !important;
            font-weight: 700 !important;
            background: #e8e8e8 !important;
            text-align: left !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Numeric + Total columns — like PDF compact body */
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table th:nth-child(n+3):nth-child(-n+11),
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table td:nth-child(n+3):nth-child(-n+11) {
            text-align: right !important;
            white-space: nowrap !important;
            font-variant-numeric: tabular-nums !important;
          }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table th:first-child,
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table td:first-child {
            text-align: center !important;
            border-left: 0.7pt solid #000 !important;
          }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table th:last-child,
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table td:last-child {
            border-right: 0.7pt solid #000 !important;
          }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table tbody tr:last-child td {
            font-weight: 700 !important;
            background: #f3f3f3 !important;
          }
          .all-doctor-view-print-root .rpt-print-root table.adv-print-table .text-green-600 {
            color: #000 !important;
          }
          .all-doctor-view-print-root .rpt-print-root tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">All Doctor View (By Session Time)</CardTitle>
            </div>

          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 pb-4 border-b print:hidden">
            <div className="flex-shrink-0" style={{ minWidth: '140px' }}>
              <CustomDatePickerField
                id="date"
                placeholder="Select Date"
                value={date}
                onChange={(d) => setDate(d || null)}
                onBlur={() => {}}
                required={true}
                useFormikError={false}
                styleClasses={{
                  parentDiv: '',
                  labelClassName: 'text-sm text-black font-semibold mb-2 block',
                  inputClassName: '[&>button]:hover:bg-background [&>button]:hover:text-foreground [&>button]:hover:border-gray-300'
                }}
              />
            </div>

            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Session Type
              </label>
              <Selector
                label="All"
                options={sessionTypeOptions}
                value={sessionType || '__all__'}
                onChange={(v) => setSessionType(v)}
              />
            </div>

            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Fee Type
              </label>
              <Selector
                label="All"
                options={feeTypeOptions}
                value={feeType || '__all__'}
                onChange={(v) => setFeeType(v)}
              />
            </div>

            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Branches
              </label>
              <div className="flex items-center gap-1">
                <Selector
                  label="All Branches"
                  options={locationOptions}
                  value={locationId || '__all__'}
                  onChange={(v) => setLocationId(v)}
                />
                {(locationId || '__all__') !== '__all__' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    aria-label="Clear branch"
                    onClick={() => setLocationId('__all__')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={handleSearch}
                disabled={loading || !date}
                className="gap-2"
              >
                <SearchIcon />
                Search
              </Button>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="mb-4 flex gap-2 print:hidden">
            <ExportWrapper
              serverData={handleExport}
              columns={[
                'No',
                'Consultant',
                'Not Paid',
                'Paid',
                'Cancel',
                'Hos Refund',
                'Pro Refund',
                'Hos Valid',
                'Pro Valid',
                'Nett Valid',
                'Total (Rs.)',
                'Doctor Session Time'
              ]}
              keys={[
                'no',
                'consultant',
                'notPaid',
                'paid',
                'cancel',
                'hosRefund',
                'proRefund',
                'hosValid',
                'proValid',
                'nettValid',
                'total',
                'doctorSessionTime'
              ]}
              title="All Doctor View Report"
              fileName={`all-doctor-view-report-${date ? moment(date).format('YYYY-MM-DD') : 'report'}`}
              onBrowserPrint={handlePrint}
              showPrintButton
              exportOrientation="portrait"
              compactTable
              pdfSummaryItems={toBrandedPdfSummaryItems([
                { label: 'Date', value: date ? moment(date).format('YYYY-MM-DD') : '—' },
                {
                  label: 'Session Type',
                  value:
                    sessionType === '__all__'
                      ? 'All'
                      : sessionTypeOptions.find((s) => s.id === sessionType)?.name ?? sessionType,
                },
                {
                  label: 'Fee Type',
                  value:
                    feeType === '__all__'
                      ? 'All'
                      : feeTypeOptions.find((f) => f.id === feeType)?.name ?? feeType,
                },
                {
                  label: 'Branch',
                  value:
                    locationId === '__all__'
                      ? 'All Branches'
                      : locationOptions.find((l) => l.id === locationId)?.name ?? locationId,
                },
              ])}
            />
          </div>

          {/* Results Table */}
          <ReportPrintLayout
            reportName="All Doctor View Report"
            pageSize="A4 portrait"
            pageMargins="7mm 5mm 18mm"
            generatedAt={new Date().toLocaleString()}
            summaryItems={[
              { label: 'Date', value: date ? moment(date).format('YYYY-MM-DD') : '—' },
              {
                label: 'Session Type',
                value:
                  sessionType === '__all__'
                    ? 'All'
                    : sessionTypeOptions.find((s) => s.id === sessionType)?.name ?? sessionType,
              },
              {
                label: 'Fee Type',
                value:
                  feeType === '__all__'
                    ? 'All'
                    : feeTypeOptions.find((f) => f.id === feeType)?.name ?? feeType,
              },
              {
                label: 'Branch',
                value:
                  locationId === '__all__'
                    ? 'All Branches'
                    : locationOptions.find((l) => l.id === locationId)?.name ?? locationId,
              },
            ] satisfies ReportPrintSummaryItem[]}
          >
          <div className="mt-6 print:mt-0">
            {loading ? (
              <Loading />
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground print:hidden">
                No data available. Please apply filters and search.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full border-collapse adv-print-table">
                  <colgroup>
                    <col className="adv-col-no" />
                    <col className="adv-col-consultant" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-num" />
                    <col className="adv-col-total" />
                    <col className="adv-col-time" />
                  </colgroup>
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left font-semibold">No</th>
                      <th className="border p-2 text-left font-semibold">Consultant</th>
                      <th className="border p-2 text-left font-semibold">Not Paid</th>
                      <th className="border p-2 text-left font-semibold">Paid</th>
                      <th className="border p-2 text-left font-semibold">Cancel</th>
                      <th className="border p-2 text-left font-semibold">Hos Refund</th>
                      <th className="border p-2 text-left font-semibold">Pro Refund</th>
                      <th className="border p-2 text-left font-semibold">Hos Valid</th>
                      <th className="border p-2 text-left font-semibold">Pro Valid</th>
                      <th className="border p-2 text-left font-semibold">Nett Valid</th>
                      <th className="border p-2 text-left font-semibold">Total (Rs.)</th>
                      <th className="border p-2 text-left font-semibold">Doctor Session Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.consultantId}>
                        <td className="border p-2">{row.no}</td>
                        <td className="border p-2">
                          {row.consultantName} ({row.consultantCode})
                        </td>
                        <td className="border p-2">{row.notPaid}</td>
                        <td className="border p-2">
                          <span className="text-green-600">{row.paid}</span>
                        </td>
                        <td className="border p-2">{row.cancel}</td>
                        <td className="border p-2">{row.hosRefund}</td>
                        <td className="border p-2">{row.proRefund}</td>
                        <td className="border p-2">
                          <span className="text-green-600">{row.hosValid}</span>
                        </td>
                        <td className="border p-2">
                          <span className="text-green-600">{row.proValid}</span>
                        </td>
                        <td className="border p-2">
                          <span className="text-green-600">{row.nettValid}</span>
                        </td>
                        <td className="border p-2">{formatCurrency(row.total)}</td>
                        <td className="border p-2">{row.doctorSessionTimes.join(' / ')}</td>
                      </tr>
                    ))}
                    {totals && (
                      <tr className="bg-muted font-semibold">
                        <td className="border p-2">{totals.no}</td>
                        <td className="border p-2">Total</td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2"></td>
                        <td className="border p-2">{formatCurrency(totals.total)}</td>
                        <td className="border p-2"></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </ReportPrintLayout>

          {/* Pagination Info */}
          <div className="mt-4 text-sm text-muted-foreground print:hidden">
            {totalRecords > 0 
              ? `Showing 1 to ${totalRecords} of ${totalRecords} entries`
              : 'Showing 0 to 0 of 0 entries'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
