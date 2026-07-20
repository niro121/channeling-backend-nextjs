'use client';

import { useState } from 'react';
import { List, Printer, SearchIcon } from 'lucide-react';
import {
  BackButton,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DateRangePicker,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@archmage/ui';
import {
  exportUserActivityReportData,
  getUserActivityReportData,
} from '@/app/actions/reports/user-activity.action';
import { ExportWrapper } from '../../export-wrapper';
import { KNOWN_ACTIVITY_ACTIONS } from '@/lib/activity-actions';
import type { ExportUserActivityData } from '@/types/user-activity-report';
import { UserActivityReportColumns, type UserActivityRow } from './columns';

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
  const [userId, setUserId] = useState('__all__');
  const [action, setAction] = useState('');

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
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch report data',
      });
      setRows([]);
      setTotalReturned(0);
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

    const response = await exportUserActivityReportData({
      userId: userId === '__all__' ? undefined : userId,
      action: action.trim() || undefined,
      dateFrom: fromDate,
      dateTo: toDate,
    });

    if (response.hasMore && response.success) {
      toast({
        title: 'Export complete',
        description:
          'Exported first 10,000 records. More records exist for this range.',
      });
    }

    return {
      success: response.success,
      data: response.data,
      message: response.message,
    };
  };

  const exportColumns = [
    'Date & Time',
    'User',
    'Action',
    'Entity Type',
    'Entity ID',
    'IP Address',
    'Importance',
  ];
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
    <div className="space-y-6">
      <BackButton href="/reports" label="Back to Reports" />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">User Activity Report</CardTitle>
              <CardDescription className="mt-1">
                View user activity by user and date range. Display is capped at 10,000
                records; use Export to download.
              </CardDescription>
            </div>
            <div className="flex gap-2 shrink-0">
              <ExportWrapper
                serverData={handleExport}
                columns={exportColumns}
                keys={exportKeys}
                title="User Activity Report"
                fileName={
                  `user-activity-${fromDate || 'from'}-to-${toDate || 'to'}`.replace(
                    /^-to-|-to$/g,
                    ''
                  ) || 'user-activity-report'
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-[220px] h-9">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All users</SelectItem>
                  {initialUserOptions.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="activity-action">Action</Label>
              <Input
                id="activity-action"
                placeholder="e.g. patient-bills, cancelled"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchReportData()}
                className="h-9 w-[240px] font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onChange={({ from, to }) => {
                  setFromDate(from);
                  setToDate(to);
                }}
              />
            </div>

            <Button
              onClick={fetchReportData}
              disabled={loading || !fromDate || !toDate}
              className="gap-2"
            >
              <SearchIcon className="h-4 w-4" />
              Search
            </Button>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5">
                <List className="h-4 w-4" />
                View all tracked actions
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[520px] max-h-[420px] overflow-y-auto" align="start">
              <p className="mb-3 text-xs text-muted-foreground">
                Tracked actions in DPAY. Type in the Action field above to filter (partial
                match).
              </p>
              <ul className="space-y-2 text-xs">
                {KNOWN_ACTIVITY_ACTIONS.map((item) => (
                  <li
                    key={item.action}
                    className="flex flex-col gap-0.5 border-b border-border/50 py-1 last:border-0"
                  >
                    <span className="font-mono text-foreground">{item.action}</span>
                    <span className="text-muted-foreground">
                      <span className="font-medium text-foreground/80">{item.importance}</span>
                      {' — '}
                      {item.when}
                    </span>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading...'
              : totalReturned > 0
                ? `Showing ${totalReturned} record${totalReturned === 1 ? '' : 's'}${
                    hasMore
                      ? ' (first 10,000; more records available — use Export)'
                      : ''
                  }`
                : 'No data. Select filters and click Search.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed px-6 py-10 text-center">
              <p className="text-sm font-medium">No results</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a date range and click Search to load activity.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
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
                          {typeof col.header === 'string' ? col.header : ''}
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
                          row[accessorKey as keyof UserActivityRow] != null
                        ) {
                          cellValue = String(
                            (row as Record<string, unknown>)[accessorKey]
                          );
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
