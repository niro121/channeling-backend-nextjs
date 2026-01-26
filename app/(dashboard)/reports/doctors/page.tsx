'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { getDoctorReportData, exportDoctorReportData } from '@/app/actions/report.action';
import { Doctor } from '@/types/doctor';
import { DoctorReportColumns } from './columns';
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

function AllDoctorsReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter states
  const [date, setDate] = useState<Date>(new Date());
  const [doctorName, setDoctorName] = useState(searchParams.get('doctorName') || '');
  const [doctorCode, setDoctorCode] = useState(searchParams.get('doctorCode') || '');

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const result = await getDoctorReportData({
        date: date,
        doctorName: doctorName || undefined,
        doctorCode: doctorCode || undefined
      });

      if (result.success) {
        setDoctors(result.data);
        setTotalRecords(result.totalRecords);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setDoctors([]);
        setTotalRecords(0);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to fetch report data'
      });
      setDoctors([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleSearch = () => {
    // Update URL params
    const params = new URLSearchParams();
    if (doctorName) params.set('doctorName', doctorName);
    if (doctorCode) params.set('doctorCode', doctorCode);
    
    router.push(`/reports/doctors?${params.toString()}`);
    fetchReportData();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = async () => {
    return await exportDoctorReportData({
      date: date,
      doctorName: doctorName || undefined,
      doctorCode: doctorCode || undefined
    });
  };

  const styleClasses = {
    parentDiv: 'grid grid-cols-1 items-center gap-4 sm:grid-cols-4',
    labelClassName: 'text-sm text-black font-semibold capitalize',
    inputClassName: 'col-span-full sm:col-span-3'
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">All Doctors Report</CardTitle>
              <CardDescription>
                View comprehensive list of all doctors with filters
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportWrapper
                serverData={handleExport}
                columns={[
                  'Doctor Code',
                  'Doctor Name',
                  'Reg. Number',
                  'Updated By',
                  'Updated Date',
                  'Created By',
                  'Created Date',
                  'Published'
                ]}
                keys={[
                  'code',
                  'name',
                  'registrationNumber',
                  'updatedBy',
                  'updatedDate',
                  'createdBy',
                  'createdDate',
                  'published'
                ]}
                title="All Doctors Report"
                fileName={`doctors-report-${date.toISOString().split('T')[0]}`}
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
            <div className="flex-1 min-w-[200px]">
              <CustomDatePickerField
                id="date"
                placeholder="Select Date"
                value={date}
                onChange={(selectedDate) => {
                  if (selectedDate) {
                    setDate(selectedDate);
                  }
                }}
                onBlur={() => {}}
                required={true}
                useFormikError={false}
                styleClasses={{
                  parentDiv: '',
                  labelClassName: 'text-sm text-black font-semibold mb-2 block',
                  inputClassName: ''
                }}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Input
                id="doctorName"
                placeholder="Enter doctor name"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Input
                id="doctorCode"
                placeholder="Enter doctor code (e.g., DR001)"
                value={doctorCode}
                onChange={(e) => setDoctorCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={handleSearch}
                disabled={loading}
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
                Total Records: {totalRecords}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No doctors found
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {DoctorReportColumns.map((column) => {
                        let header: any;
                        if (typeof column.header === 'function') {
                          // For function headers, try to render with minimal props
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
                    {doctors.map((doctor) => (
                      <TableRow key={doctor.id}>
                        {DoctorReportColumns.map((column) => {
                          const accessorKey = (column as any).accessorKey;
                          let value: any;
                          
                          if (accessorKey) {
                            const keys = accessorKey.split('.');
                            value = doctor;
                            for (const k of keys) {
                              value = value?.[k];
                            }
                          }

                          const cell = typeof column.cell === 'function'
                            ? column.cell({
                                row: {
                                  getValue: (key: string) => {
                                    const k = key.split('.');
                                    let v: any = doctor;
                                    for (const kk of k) {
                                      v = v?.[kk];
                                    }
                                    return v;
                                  },
                                  original: doctor
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

export default function AllDoctorsReportPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-6">Loading...</div>}>
      <AllDoctorsReportContent />
    </Suspense>
  );
}
