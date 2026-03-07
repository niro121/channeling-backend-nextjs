'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateRangePicker } from '@/components/common/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getUserActivityReportData,
  exportUserActivityReportData,
} from '@/app/actions/reports/user-activity.action';
import type { UserActivityRow } from './columns';
import { UserActivityReportColumns } from './columns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { useToast } from '@/components/hooks/use-toast';
import { SearchIcon, Printer, List } from 'lucide-react';
import { ExportWrapper } from '../../export-wrapper';
import type { ExportUserActivityData } from '@/types/report';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ACTIVITY_ACTIONS_AUDIT } from '@/lib/activity-actions-audit';

type UserActivityContentProps = {
  initialUserOptions: Array<{ id: string; name: string }>;
};

export default function UserActivityContent({
  initialUserOptions,
}: UserActivityContentProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<UserActivityRow[]>([]);
  const [totalReturned, setTotalReturned] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [userId, setUserId] = useState<string>('__all__');
  const [action, setAction] = useState<string>('');

  const userOptions = [{ id: '__all__', name: 'All Users' }, ...initialUserOptions];

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
      const result = await getUserActivityReportData({
        userId: userId === '__all__' ? undefined : userId,
        action: action.trim() || undefined,
        dateFrom: fromDate,
        dateTo: toDate,
      });

      if (result.success) {
        setRows(result.data);
        setTotalReturned(result.totalReturned);
        setHasMore(result.hasMore ?? false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data',
        });
        setRows([]);
        setTotalReturned(0);
        setHasMore(false);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch report data';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: msg,
      });
      setRows([]);
      setTotalReturned(0);
      setHasMore(false);
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
        description: 'Please select both from date and to date',
      });
      return { success: false, message: 'Please select date range' };
    }

    const response = await exportUserActivityReportData({
      userId: userId === '__all__' ? undefined : userId,
      action: action.trim() || undefined,
      dateFrom: fromDate,
      dateTo: toDate,
    });

    if (response.hasMore && response.success) {
      toast({
        title: 'Export complete',
        description: 'Exported first 10,000 records. More records exist for this range — see note in file.',
      });
    }
    return {
      success: response.success,
      data: response.data,
      message: response.message,
    };
  };

  const exportColumns = ['Date & Time', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Importance'];
  const exportKeys: (keyof ExportUserActivityData)[] = [
    'createdAt',
    'userName',
    'action',
    'entityType',
    'entityId',
    'ipAddress',
    'importance',
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">User Activity Report</CardTitle>
              <CardDescription>
                View user activity by user and date range. Display is capped at 10,000 records; use Export to download (PDF/CSV).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <ExportWrapper
                serverData={handleExport}
                columns={exportColumns}
                keys={exportKeys}
                title="User Activity Report"
                fileName={`user-activity-${fromDate ?? ''}-to-${toDate ?? ''}`.replace(/^-to-|-to$/g, '') || 'user-activity-report'}
              />
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
                <Printer />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-shrink-0">
              <label className="text-sm font-semibold mb-2 block">User</label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {userOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
              <label className="text-sm font-semibold mb-2 block">Action</label>
              <Input
                placeholder="e.g. doctors, exported, ledger"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="font-mono h-9 w-[220px] min-w-[220px]"
              />
            </div>
            <div className="flex-shrink-0">
              <label className="text-sm font-semibold mb-2 block">Date Range</label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onChange={({ from, to }) => {
                  setFromDate(from);
                  setToDate(to);
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                  <List className="h-4 w-4" />
                  View all tracked actions
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[520px] max-h-[420px] overflow-y-auto" align="start">
                <p className="text-xs text-muted-foreground mb-3">Tracked actions (from ACTIVITY_LOG_AUDIT). Type in the Action field above to filter (partial match).</p>
                <ul className="space-y-2 text-xs">
                  {ACTIVITY_ACTIONS_AUDIT.map((a) => (
                    <li key={a.action} className="flex flex-col gap-0.5 py-1 border-b border-border/50 last:border-0">
                      <span className="font-mono text-foreground">{a.action}</span>
                      <span className="text-muted-foreground">
                        <span className="font-medium text-foreground/80">{a.importance}</span> — {a.when}
                      </span>
                    </li>
                  ))}
                </ul>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Activity</CardTitle>
            <CardDescription>
              {loading
                ? 'Loading...'
                : totalReturned > 0
                  ? `Showing ${totalReturned} record${totalReturned === 1 ? '' : 's'}${hasMore ? ' (first 10,000; more records available — use Export)' : ''}`
                  : 'No data. Select filters and click Search.'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No data available. Please select date range and click Search.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {UserActivityReportColumns.map((col, idx) => {
                      const accessorKey = (col as { accessorKey?: string }).accessorKey;
                      return (
                        <TableHead
                          key={col.id || accessorKey || idx}
                          className={accessorKey === 'createdAt' ? 'min-w-[140px]' : ''}
                        >
                          {typeof col.header === 'string'
                            ? col.header
                            : col.header?.({ column: col as any, header: {} as any, table: {} as any }) ?? ''}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.id || index}>
                      {UserActivityReportColumns.map((col, colIdx) => {
                        const accessorKey = (col as { accessorKey?: string }).accessorKey;
                        let cellValue: React.ReactNode = '-';
                        if (col.cell && typeof col.cell === 'function') {
                          const mockRow = {
                            original: row,
                            getValue: (key: string) => {
                              const k = key.split('.')[0];
                              return (row as Record<string, unknown>)[k];
                            },
                            index,
                          };
                          cellValue = col.cell({
                            row: mockRow as any,
                            column: col as any,
                            table: {} as any,
                            cell: col.cell,
                            getValue: mockRow.getValue,
                            renderValue: mockRow.getValue,
                          } as any);
                        } else if (accessorKey && row[accessorKey as keyof UserActivityRow] != null) {
                          cellValue = String((row as Record<string, unknown>)[accessorKey]);
                        }
                        return (
                          <TableCell
                            key={col.id || accessorKey || colIdx}
                            className={accessorKey === 'createdAt' ? 'min-w-[140px]' : ''}
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
