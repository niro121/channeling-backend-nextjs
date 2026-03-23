'use client';

import React, { useState, useEffect } from 'react';
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
import { Printer } from 'lucide-react';
import { ExportWrapper } from '../../export-wrapper';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { Selector } from '@/components/common/selector';
import { SearchIcon } from '@/components/icons';
import moment from 'moment';
import { printPdfUtilWithHeader } from '@/lib/utils';

type AllDoctorViewReportContentProps = {
  initialLocationOptions: Array<{ id: string; name: string }>;
};

export default function AllDoctorViewReportContent({
  initialLocationOptions
}: AllDoctorViewReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AllDoctorViewRowData[]>([]);
  const [totals, setTotals] = useState<AllDoctorViewTotals | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter states
  const [date, setDate] = useState<Date | null>(new Date());
  const [sessionType, setSessionType] = useState<string>('__all__');
  const [feeType, setFeeType] = useState<string>('__all__');
  const [locationId, setLocationId] = useState<string>('__all__');
  
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

  const fetchReportData = async () => {
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
  };

  const handleSearch = () => {
    fetchReportData();
  };

  const handlePrint = () => {
    type AllDoctorViewPrintRow = {
      no: string;
      consultant: string;
      notPaid: string;
      paid: string;
      cancel: string;
      hosRefund: string;
      proRefund: string;
      hosValid: string;
      proValid: string;
      nettValid: string;
      total: string;
      doctorSessionTime: string;
    };

    const sessionTypeLabel =
      sessionType === '__all__'
        ? 'All'
        : sessionTypeOptions.find((s) => s.id === sessionType)?.name ?? sessionType;

    const feeTypeLabel =
      feeType === '__all__'
        ? 'All'
        : feeTypeOptions.find((f) => f.id === feeType)?.name ?? feeType;

    const branchLabel =
      locationId === '__all__'
        ? 'All Branches'
        : locationOptions.find((l) => l.id === locationId)?.name ?? locationId;

    const headerLines = [
      `Date: ${date ? moment(date).format('YYYY-MM-DD') : ''}`,
      `Session Type: ${sessionTypeLabel}`,
      `Fee Type: ${feeTypeLabel}`,
      `Branch: ${branchLabel}`
    ].filter(Boolean);

    const mappedRows: AllDoctorViewPrintRow[] = rows.map((row) => ({
      no: String(row.no ?? ''),
      consultant: `${row.consultantName} (${row.consultantCode})`,
      notPaid: String(row.notPaid ?? ''),
      paid: String(row.paid ?? ''),
      cancel: String(row.cancel ?? ''),
      hosRefund: String(row.hosRefund ?? ''),
      proRefund: String(row.proRefund ?? ''),
      hosValid: String(row.hosValid ?? ''),
      proValid: String(row.proValid ?? ''),
      nettValid: String(row.nettValid ?? ''),
      total: formatCurrency(row.total),
      doctorSessionTime: row.doctorSessionTimes.join(' / ')
    }));

    if (totals) {
      mappedRows.push({
        no: String(totals.no ?? ''),
        consultant: 'Total',
        notPaid: '',
        paid: '',
        cancel: '',
        hosRefund: '',
        proRefund: '',
        hosValid: '',
        proValid: '',
        nettValid: '',
        total: formatCurrency(totals.total),
        doctorSessionTime: ''
      });
    }

    const columns = [
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
    ];

    const keys = [
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
    ] as (keyof AllDoctorViewPrintRow)[];

    printPdfUtilWithHeader<AllDoctorViewPrintRow>({
      title: 'All Doctor View Report',
      headerLines,
      data: mappedRows,
      columns,
      keys
    });
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
    <div className="container mx-auto py-6 space-y-6 print:py-2">
      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">All Doctor View (By Session Time)</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-2"
              >
                <Printer />
                Print
              </Button>
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
              <Selector
                label="All Branches"
                options={locationOptions}
                value={locationId || '__all__'}
                onChange={(v) => setLocationId(v)}
              />
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
            />
          </div>

          {/* Results Table */}
          <div className="mt-6">
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available. Please apply filters and search.
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full border-collapse">
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

          {/* Pagination Info */}
          <div className="mt-4 text-sm text-muted-foreground">
            {totalRecords > 0 
              ? `Showing 1 to ${totalRecords} of ${totalRecords} entries`
              : 'Showing 0 to 0 of 0 entries'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
