'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/common/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getAgentDetailReportData, exportAgentDetailReportData } from '@/app/actions/reports/agent-detail.action';
import { Agency } from '@/types/agency';
import { ExportAgentDetailData } from '@/types/report';
import { AgentDetailReportColumns } from './columns';
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
import { SearchIcon, Printer } from 'lucide-react';
import { ExportWrapper } from '../../export-wrapper';
import { useSearchParams } from 'next/navigation';

type AgentDetailReportContentProps = {
  initialStatusOptions: Array<{ id: string; name: string }>;
};

export default function AgentDetailReportContent({
  initialStatusOptions
}: AgentDetailReportContentProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Filter states from URL params
  const [fromDate, setFromDate] = useState<string | undefined>(
    searchParams.get('fromDate') || undefined
  );
  const [toDate, setToDate] = useState<string | undefined>(
    searchParams.get('toDate') || undefined
  );
  const [agencyName, setAgencyName] = useState<string>(
    searchParams.get('agencyName') || ''
  );
  const [agencyCode, setAgencyCode] = useState<string>(
    searchParams.get('agencyCode') || ''
  );
  const [status, setStatus] = useState<string>(
    searchParams.get('status') || '__all__'
  );

  // Options
  const [statusOptions] = useState(initialStatusOptions);

  // Fetch data on mount if filters are present
  useEffect(() => {
    if (fromDate && toDate) {
      fetchReportData();
    }
  }, []);

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
      const result = await getAgentDetailReportData({
        fromDate,
        toDate,
        agencyName: agencyName && agencyName.trim() !== '' ? agencyName.trim() : undefined,
        agencyCode: agencyCode && agencyCode.trim() !== '' ? agencyCode.trim() : undefined,
        status: status && status !== '__all__' ? status : undefined
      });

      if (result.success) {
        setAgencies(result.data);
        setTotalRecords(result.totalRecords);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setAgencies([]);
        setTotalRecords(0);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch report data';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage
      });
      setAgencies([]);
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

    return await exportAgentDetailReportData({
      fromDate,
      toDate,
      agencyName: agencyName && agencyName.trim() !== '' ? agencyName.trim() : undefined,
      agencyCode: agencyCode && agencyCode.trim() !== '' ? agencyCode.trim() : undefined,
      status: status && status !== '__all__' ? status : undefined
    });
  };

  // Export columns and keys for ExportWrapper
  const exportColumns = [
    'Created',
    'Agent Code',
    'Agent Name',
    'Status',
    'Address',
    'Phone',
    'Fax',
    'E-Mail',
    'Contact Person',
    'Contact Phone',
    'Contact Person E-mail',
    'Standard Credit Limit',
    'Allowed Credit Limit',
    'Allowed Maximin Credit Limit',
    'Balance'
  ];

  const exportKeys: (keyof ExportAgentDetailData)[] = [
    'created',
    'agentCode',
    'agentName',
    'status',
    'address',
    'phone',
    'fax',
    'email',
    'contactPerson',
    'contactPhone',
    'contactPersonEmail',
    'standardCreditLimit',
    'allowedCreditLimit',
    'allowedMaximinCreditLimit',
    'balance'
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">Agent Detail Report</CardTitle>
              <CardDescription>
                View agent information with filters
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportWrapper
                serverData={handleExport}
                columns={exportColumns}
                keys={exportKeys}
                title="Agent Detail Report"
                fileName={`agent-detail-report-${fromDate ? fromDate : 'report'}`}
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
          <div className="flex flex-wrap items-end gap-4">
            {/* Date Range Filter */}
            <div className="flex-shrink-0">
              <label className="text-sm text-black font-semibold mb-2 block">
                Date Range
              </label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onChange={({ from, to }) => {
                  setFromDate(from);
                  setToDate(to);
                }}
              />
            </div>

            {/* Agency Name Search */}
            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Agency Name
              </label>
              <Input
                id="agencyName"
                placeholder="Enter agency name"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>

            {/* Agency Code Search */}
            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Agency Code
              </label>
              <Input
                id="agencyCode"
                placeholder="Enter agency code"
                value={agencyCode}
                onChange={(e) => setAgencyCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
            </div>

            {/* Status Selector */}
            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm text-black font-semibold mb-2 block">
                Status
              </label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
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
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Agent Details</CardTitle>
              <CardDescription>
                {totalRecords > 0 ? `Showing 1 to ${totalRecords} of ${totalRecords} entries` : 'Showing 0 to 0 of 0 entries'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available. Please apply filters and search.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {AgentDetailReportColumns.map((column, colIndex) => {
                      const header = typeof column.header === 'string' 
                        ? column.header 
                        : typeof column.header === 'function'
                          ? column.header({ column: column as any, header: {} as any, table: {} as any })
                          : '-';
                      const accessorKey = (column as any).accessorKey;
                      const isCreatedColumn = accessorKey === 'createdAt';
                      return (
                        <TableHead 
                          key={column.id || accessorKey || colIndex}
                          className={isCreatedColumn ? 'min-w-[140px]' : ''}
                        >
                          {header}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agencies.map((agency, index) => (
                    <TableRow key={agency.id || index}>
                      {AgentDetailReportColumns.map((column, colIndex) => {
                        let cellValue: React.ReactNode = '-';
                        const accessorKey = (column as any).accessorKey;
                        const isCreatedColumn = accessorKey === 'createdAt';
                        
                        if (column.cell && typeof column.cell === 'function') {
                          // Create a mock row object for the cell renderer
                          const mockRow = {
                            original: agency,
                            getValue: (key: string) => {
                              const keys = key.split('.');
                              let value: any = agency;
                              for (const k of keys) {
                                value = value?.[k];
                              }
                              return value;
                            },
                            index
                          };
                          const cellContext = {
                            row: mockRow as any,
                            column: column as any,
                            table: {} as any,
                            cell: column.cell,
                            getValue: mockRow.getValue,
                            renderValue: mockRow.getValue
                          };
                          cellValue = column.cell(cellContext as any);
                        } else if (accessorKey) {
                          const keys = (accessorKey as string).split('.');
                          let value: any = agency;
                          for (const key of keys) {
                            value = value?.[key];
                          }
                          cellValue = value ?? '-';
                        }
                        
                        return (
                          <TableCell 
                            key={column.id || accessorKey || colIndex}
                            className={isCreatedColumn ? 'min-w-[140px]' : ''}
                          >
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
