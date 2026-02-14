'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelector } from '@/components/common/searchable-selector';
import CustomDatePickerField from '@/components/common/custom-date-picker-field';
import { getChannelAgentReferenceBookReportData, exportChannelAgentReferenceBookReportData } from '@/app/actions/reports/report.action';
import { AgencyBook } from '@/types/agencybook';
import { ChannelAgentReferenceBookReportColumns } from './columns';
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

type ChannelAgentReferenceBookReportContentProps = {
  initialAgencyOptions: Array<{ id: string; name: string }>;
};

export default function ChannelAgentReferenceBookReportContent({
  initialAgencyOptions
}: ChannelAgentReferenceBookReportContentProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<AgencyBook[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter states
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [agencyId, setAgencyId] = useState<string>('');
  const [bookNumber, setBookNumber] = useState<string>('');
  
  // Options - initialized from server props
  const [agencyOptions] = useState(initialAgencyOptions);

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
      const result = await getChannelAgentReferenceBookReportData({
        fromDate: fromDate.toISOString().split('T')[0],
        toDate: toDate.toISOString().split('T')[0],
        agencyId: agencyId && agencyId !== '__all__' ? agencyId : undefined,
        bookNumber: bookNumber && bookNumber.trim() !== '' ? bookNumber.trim() : undefined
      });

      if (result.success) {
        setBooks(result.data);
        setTotalRecords(result.totalRecords);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setBooks([]);
        setTotalRecords(0);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report data';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
      setBooks([]);
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

    return await exportChannelAgentReferenceBookReportData({
      fromDate: fromDate.toISOString().split('T')[0],
      toDate: toDate.toISOString().split('T')[0],
      agencyId: agencyId && agencyId !== '__all__' ? agencyId : undefined,
      bookNumber: bookNumber && bookNumber.trim() !== '' ? bookNumber.trim() : undefined
    });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Channel Agent Reference Book</CardTitle>
              <CardDescription>
                View channel agent reference book information with filters
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportWrapper
                serverData={handleExport}
                columns={[
                  'S.No',
                  'Agent',
                  'Book Number',
                  'Utilized Page Count',
                  'Starting Reference Number',
                  'Ending Reference Number',
                  'Created By',
                  'Created Date',
                  'Updated By',
                  'Updated Date',
                  'Active'
                ]}
                keys={[
                  'sNo',
                  'agent',
                  'bookNumber',
                  'utilizedPageCount',
                  'startingReferenceNumber',
                  'endingReferenceNumber',
                  'createdBy',
                  'createdDate',
                  'updatedBy',
                  'updatedDate',
                  'active'
                ]}
                title="Channel Agent Reference Book Report"
                fileName={`channel-agent-reference-book-${fromDate ? fromDate.toISOString().split('T')[0] : 'report'}`}
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
                Agent
              </label>
              <SearchableSelector
                label="All Agency"
                options={agencyOptions}
                value={agencyId || '__all__'}
                onChange={(v) => setAgencyId(v)}
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
                Book Number
              </label>
              <Input
                id="bookNumber"
                placeholder="Enter book number"
                value={bookNumber}
                onChange={(e) => setBookNumber(e.target.value)}
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
            ) : books.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No data available in table
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {ChannelAgentReferenceBookReportColumns.map((column) => {
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
                    {books.map((book, index) => (
                      <TableRow key={book.id || index}>
                        {ChannelAgentReferenceBookReportColumns.map((column) => {
                          const accessorKey = (column as any).accessorKey;
                          let value: any;
                          
                          if (accessorKey) {
                            const keys = accessorKey.split('.');
                            value = book;
                            for (const k of keys) {
                              value = value?.[k];
                            }
                          }

                          const cell = typeof column.cell === 'function'
                            ? column.cell({
                                row: {
                                  getValue: (key: string) => {
                                    const k = key.split('.');
                                    let v: any = book;
                                    for (const kk of k) {
                                      v = v?.[kk];
                                    }
                                    return v;
                                  },
                                  original: book,
                                  index: index
                                },
                                table: {
                                  getSortedRowModel: () => ({
                                    flatRows: books.map((b, i) => ({
                                      original: b,
                                      index: i
                                    }))
                                  })
                                } as any
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
