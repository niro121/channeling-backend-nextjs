'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Selector } from '@/components/common/selector';
import { SearchableSelector } from '@/components/common/searchable-selector';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { getDoctorArrivalsReportData, exportDoctorArrivalsReportData } from '@/app/actions/reports/report.action';
import { Session } from '@/types/booking.dashboard';
import { DoctorArrivalsReportColumns } from './columns';
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
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { SearchIcon } from '@/components/icons';
import { Printer } from 'lucide-react';
import { ExportWrapper } from '../../export-wrapper';

type DoctorArrivalsReportContentProps = {
  initialDoctorOptions: Array<{ id: string; name: string }>;
  initialLocationOptions: Array<{ id: string; name: string }>;
};

export default function DoctorArrivalsReportContent({
  initialDoctorOptions,
  initialLocationOptions
}: DoctorArrivalsReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter states
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [doctorId, setDoctorId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  
  // Options - initialized from server props, no useEffect needed
  const [doctorOptions] = useState(initialDoctorOptions);
  const [locationOptions] = useState(initialLocationOptions);

  const fetchReportData = async () => {
    // Validate required fields
    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both from date and to date'
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getDoctorArrivalsReportData({
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0],
        doctorId: doctorId && doctorId !== '__all__' ? doctorId : undefined,
        locationId: locationId && locationId !== '__all__' ? locationId : undefined
      });

      if (result.success) {
        setSessions(result.data);
        setTotalRecords(result.totalRecords);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setSessions([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch report data'
      });
      setSessions([]);
      setTotalRecords(0);
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

  const handleExport = async () => {
    if (!fromDate || !toDate) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please select both from date and to date'
      });
      return { success: false, message: 'Please select date range' };
    }

    return await exportDoctorArrivalsReportData({
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      doctorId: doctorId && doctorId !== '__all__' ? doctorId : undefined,
      locationId: locationId && locationId !== '__all__' ? locationId : undefined
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Doctor Arrivals Report</CardTitle>
              <CardDescription>
                View doctor arrival information based on sessions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportWrapper
                serverData={handleExport}
                columns={[
                  'Consultant Name',
                  'Room Allocated By',
                  'Session Date',
                  'Session Time',
                  'Session Status',
                  'Arrival Time',
                  'Departure Time',
                  'Room Release By',
                  'Room Number'
                ]}
                keys={[
                  'consultantName',
                  'roomAllocatedBy',
                  'sessionDate',
                  'sessionTime',
                  'sessionStatus',
                  'arrivalTime',
                  'departureTime',
                  'roomReleaseBy',
                  'roomNumber'
                ]}
                title="Doctor Arrivals Report"
                fileName={`doctor-arrivals-report-${fromDate ? fromDate.toISOString().split('T')[0] : 'report'}`}
              />
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
          {/* Filters - Horizontal Layout */}
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 pb-4 border-b">
            <div className="flex-shrink-0" style={{ minWidth: '320px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Select Doctor
              </label>
              <SearchableSelector
                label="All Doctors"
                options={doctorOptions}
                value={doctorId || '__all__'}
                onChange={(v) => setDoctorId(v)}
                className="w-full"
              />
            </div>

            <div className="flex-shrink-0" style={{ minWidth: '140px' }}>
              <CustomDatePickerField
                id="fromDate"
                placeholder="From Date"
                value={fromDate}
                onChange={(date) => setFromDate(date || null)}
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

            <div className="flex-shrink-0" style={{ minWidth: '140px' }}>
              <CustomDatePickerField
                id="toDate"
                placeholder="To Date"
                value={toDate}
                onChange={(date) => setToDate(date || null)}
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
                Select Branch
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
                disabled={loading || !fromDate || !toDate}
                className="gap-2"
              >
                <SearchIcon />
                Search
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {totalRecords > 0 ? `Showing 1 to ${totalRecords} of ${totalRecords} entries` : 'Showing 0 to 0 of 0 entries'}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available in table
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {DoctorArrivalsReportColumns.map((column) => {
                        let header: any;
                        if (typeof column.header === 'function') {
                          try {
                            header = column.header({
                              table: {
                                getIsAllPageRowsSelected: () => false,
                                getIsSomePageRowsSelected: () => false,
                                toggleAllPageRowsSelected: () => {}
                              } as any,
                              column: {} as any,
                              header: {} as any
                            } as any);
                          } catch {
                            header = column.header;
                          }
                        } else {
                          header = column.header;
                        }
                        return (
                          <TableHead key={column.id || (column as any).accessorKey}>
                            {header || ''}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        {DoctorArrivalsReportColumns.map((column) => {
                          const accessorKey = (column as any).accessorKey;
                          let value: any;
                          
                          if (accessorKey) {
                            const keys = accessorKey.split('.');
                            value = session;
                            for (const k of keys) {
                              value = value?.[k];
                            }
                          }

                          const cell = typeof column.cell === 'function'
                            ? column.cell({
                                row: {
                                  getValue: (key: string) => {
                                    const k = key.split('.');
                                    let v: any = session;
                                    for (const kk of k) {
                                      v = v?.[kk];
                                    }
                                    return v;
                                  },
                                  original: session
                                }
                              } as any)
                            : value;

                          return (
                            <TableCell key={column.id || accessorKey}>
                              {cell || '-'}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
