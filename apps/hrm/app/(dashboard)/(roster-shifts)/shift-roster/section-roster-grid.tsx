'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Printer
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast
} from '@archmage/ui';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { usePermissions } from '@/components/hooks/use-permissions';
import type { RosterStaffRow, ShiftTypeChip } from '@/types/roster';
import RosterRecordActions from './record-actions';
import {
  RosterColumnHeader,
  type SortDirection
} from './roster-column-header';
import { ShiftChip } from './shift-chip';
import { ShiftLegend } from './shift-legend';
import { useShiftRosterUi } from './shift-roster-ui-context';

type SectionRosterGridProps = {
  weekLabel: string;
  dayIsos: string[];
  rows: RosterStaffRow[];
  totalRecords: number;
  staffMetaVisible: boolean;
  conflicts: number;
  shiftTypes: ShiftTypeChip[];
};

type RowStatus = RosterStaffRow['status'];

type SortableKey =
  | 'staffCode'
  | 'staffName'
  | 'department'
  | 'unit'
  | 'designation'
  | 'totalHours'
  | 'otHours'
  | 'status'
  | `day:${string}`;

type ColumnFilters = {
  staffCode: string;
  staffName: string;
  department: string;
  unit: string;
  designation: string;
  status: string;
  day: Record<string, string>;
};

const STATUS_STYLES: Record<RowStatus, string> = {
  published: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  draft: 'bg-muted text-muted-foreground hover:bg-muted',
  amended: 'bg-sky-100 text-sky-700 hover:bg-sky-100',
  none: 'bg-muted/40 text-muted-foreground hover:bg-muted/40'
};

const STATUS_LABELS: Record<RowStatus, string> = {
  published: 'Published',
  draft: 'Draft',
  amended: 'Amended',
  none: '—'
};

const LATER = 'Will be wired in a later phase.';
const CELL_SEP = 'border-r border-border';

function dayHeader(dayIso: string): string {
  return format(parseISO(dayIso), 'EEE dd MMM').toUpperCase();
}

function emptyFilters(dayIsos: string[]): ColumnFilters {
  return {
    staffCode: '',
    staffName: '',
    department: '',
    unit: '',
    designation: '',
    status: '',
    day: Object.fromEntries(dayIsos.map((d) => [d, '']))
  };
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base'
  });
}

function getSortValue(row: RosterStaffRow, key: SortableKey): string | number {
  if (key.startsWith('day:')) {
    const dayIso = key.slice(4);
    const shift = row.shifts[dayIso];
    if (!shift) return '';
    return `${shift.code} ${shift.label}`;
  }
  switch (key) {
    case 'staffCode':
      return row.staffCode;
    case 'staffName':
      return row.staffName;
    case 'department':
      return row.department;
    case 'unit':
      return row.unit;
    case 'designation':
      return row.designation;
    case 'totalHours':
      return row.totalHours;
    case 'otHours':
      return row.otHours;
    case 'status':
      return STATUS_LABELS[row.status];
    default:
      return '';
  }
}

function matchesFilter(value: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return value.toLowerCase().includes(q);
}

export default function SectionRosterGrid({
  weekLabel,
  dayIsos,
  rows,
  totalRecords,
  staffMetaVisible,
  conflicts,
  shiftTypes
}: SectionRosterGridProps) {
  const { toast } = useToast();
  const { has } = usePermissions();
  const { openAdd, openEdit } = useShiftRosterUi();
  const canEdit = has('shift-roster', 'edit');
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);
  const [leaveOverrides, setLeaveOverrides] = useState<Record<string, boolean>>(
    {}
  );
  const [sortKey, setSortKey] = useState<SortableKey | null>('staffCode');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>(() =>
    emptyFilters(dayIsos)
  );

  useEffect(() => {
    setColumnFilters((prev) => ({
      ...emptyFilters(dayIsos),
      staffCode: prev.staffCode,
      staffName: prev.staffName,
      department: prev.department,
      unit: prev.unit,
      designation: prev.designation,
      status: prev.status
    }));
  }, [dayIsos]);

  const processedRows = useMemo(() => {
    const filtered = rows.filter((row) => {
      if (!matchesFilter(row.staffCode, columnFilters.staffCode)) return false;
      if (!matchesFilter(row.staffName, columnFilters.staffName)) return false;
      if (!matchesFilter(row.department, columnFilters.department)) return false;
      if (!matchesFilter(row.unit, columnFilters.unit)) return false;
      if (!matchesFilter(row.designation, columnFilters.designation))
        return false;
      if (!matchesFilter(STATUS_LABELS[row.status], columnFilters.status))
        return false;

      for (const dayIso of dayIsos) {
        const dayQuery = columnFilters.day[dayIso] ?? '';
        if (!dayQuery.trim()) continue;
        const shift = row.shifts[dayIso];
        const hay = shift
          ? `${shift.code} ${shift.label} ${shift.timeRange}`
          : '';
        if (!matchesFilter(hay, dayQuery)) return false;
      }

      return true;
    });

    if (!sortKey) return filtered;

    const sorted = [...filtered].sort((a, b) => {
      const cmp = compareValues(
        getSortValue(a, sortKey),
        getSortValue(b, sortKey)
      );
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [rows, columnFilters, sortKey, sortDirection, dayIsos]);

  const pageCount = Math.max(1, Math.ceil(processedRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  useEffect(() => {
    setPageIndex(0);
  }, [columnFilters, sortKey, sortDirection, pageSize, rows]);

  const pageRows = useMemo(() => {
    const start = safePageIndex * pageSize;
    return processedRows.slice(start, start + pageSize);
  }, [processedRows, safePageIndex, pageSize]);

  const showingFrom =
    processedRows.length === 0 ? 0 : safePageIndex * pageSize + 1;
  const showingTo = Math.min(
    (safePageIndex + 1) * pageSize,
    processedRows.length
  );

  const notify = (title: string) => {
    toast({ title, description: LATER });
  };

  const toggleLeave = (staffId: string, dateIso: string, current: boolean) => {
    const key = `${staffId}:${dateIso}`;
    setLeaveOverrides((prev) => ({ ...prev, [key]: !current }));
  };

  const handleSort = (key: string) => {
    const nextKey = key as SortableKey;
    if (sortKey === nextKey) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection('asc');
  };

  const setTextFilter = (
    field: keyof Omit<ColumnFilters, 'day'>,
    value: string
  ) => {
    setColumnFilters((prev) => ({ ...prev, [field]: value }));
  };

  const setDayFilter = (dayIso: string, value: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      day: { ...prev.day, [dayIso]: value }
    }));
  };

  const hasActiveColumnFilters =
    Boolean(columnFilters.staffCode.trim()) ||
    Boolean(columnFilters.staffName.trim()) ||
    Boolean(columnFilters.department.trim()) ||
    Boolean(columnFilters.unit.trim()) ||
    Boolean(columnFilters.designation.trim()) ||
    Boolean(columnFilters.status.trim()) ||
    Object.values(columnFilters.day).some((v) => v.trim());

  return (
    <Card className="overflow-hidden rounded-lg border border-border shadow-sm">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1.5">
          <CardTitle className="text-lg font-semibold">
            {weekLabel || 'Shift Roster'}
          </CardTitle>
          <CardDescription>
            Drag a shift chip to another cell to reassign. Tick &apos;Leave&apos;
            to mark the cell as leave-covered.
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'weekly' ? 'default' : 'outline'}
            className="h-9"
            onClick={() => setViewMode('weekly')}
          >
            Weekly View
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            className="h-9"
            onClick={() => {
              setViewMode('monthly');
              notify('Monthly View');
            }}
          >
            Monthly View
          </Button>
          {canEdit ? (
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => openAdd()}
            >
              <Plus className="h-4 w-4" />
              Allocate Shift
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Print')}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Export Excel')}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export Excel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5"
            onClick={() => notify('Export PDF')}
          >
            <FileText className="h-3.5 w-3.5" />
            Export PDF
          </Button>
        </div>
      </CardHeader>

      <div className="px-6 pb-3">
        <ShiftLegend shiftTypes={shiftTypes} />
      </div>

      <CardContent className="px-0 pb-0">
        <div className="px-4 pb-4">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <Table className="[&_th]:align-top [&_td]:align-middle">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead
                      className={cn(
                        'sticky left-0 z-20 min-w-[8rem] bg-background',
                        CELL_SEP
                      )}
                    >
                      <RosterColumnHeader
                        label="Staff ID"
                        sortKey="staffCode"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        filterValue={columnFilters.staffCode}
                        onFilterChange={(v) => setTextFilter('staffCode', v)}
                        filterPlaceholder="ID…"
                      />
                    </TableHead>
                    <TableHead
                      className={cn(
                        'sticky left-[8rem] z-20 min-w-[10rem] bg-background',
                        CELL_SEP
                      )}
                    >
                      <RosterColumnHeader
                        label="Staff Name"
                        sortKey="staffName"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        filterValue={columnFilters.staffName}
                        onFilterChange={(v) => setTextFilter('staffName', v)}
                        filterPlaceholder="Name…"
                      />
                    </TableHead>
                    {staffMetaVisible ? (
                      <>
                        <TableHead className={cn('min-w-[8rem]', CELL_SEP)}>
                          <RosterColumnHeader
                            label="Department"
                            sortKey="department"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            filterValue={columnFilters.department}
                            onFilterChange={(v) =>
                              setTextFilter('department', v)
                            }
                            filterPlaceholder="Dept…"
                          />
                        </TableHead>
                        <TableHead className={cn('min-w-[7rem]', CELL_SEP)}>
                          <RosterColumnHeader
                            label="Unit"
                            sortKey="unit"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            filterValue={columnFilters.unit}
                            onFilterChange={(v) => setTextFilter('unit', v)}
                            filterPlaceholder="Unit…"
                          />
                        </TableHead>
                        <TableHead className={cn('min-w-[9rem]', CELL_SEP)}>
                          <RosterColumnHeader
                            label="Designation"
                            sortKey="designation"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSort={handleSort}
                            filterValue={columnFilters.designation}
                            onFilterChange={(v) =>
                              setTextFilter('designation', v)
                            }
                            filterPlaceholder="Role…"
                          />
                        </TableHead>
                      </>
                    ) : null}
                    {dayIsos.map((dayIso) => (
                      <TableHead
                        key={dayIso}
                        className={cn('min-w-[9rem]', CELL_SEP)}
                      >
                        <RosterColumnHeader
                          label={dayHeader(dayIso)}
                          sortKey={`day:${dayIso}`}
                          activeSortKey={sortKey}
                          sortDirection={sortDirection}
                          onSort={handleSort}
                          filterValue={columnFilters.day[dayIso] ?? ''}
                          onFilterChange={(v) => setDayFilter(dayIso, v)}
                          filterPlaceholder="D / E / N…"
                        />
                      </TableHead>
                    ))}
                    <TableHead className={cn('min-w-[7rem]', CELL_SEP)}>
                      <RosterColumnHeader
                        label="Total Hours"
                        sortKey="totalHours"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className={cn('min-w-[6rem]', CELL_SEP)}>
                      <RosterColumnHeader
                        label="OT Hours"
                        sortKey="otHours"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </TableHead>
                    <TableHead className={cn('min-w-[9rem]', CELL_SEP)}>
                      <RosterColumnHeader
                        label="Status"
                        sortKey="status"
                        activeSortKey={sortKey}
                        sortDirection={sortDirection}
                        onSort={handleSort}
                        filterValue={columnFilters.status}
                        onFilterChange={(v) => setTextFilter('status', v)}
                        filterPlaceholder="Status…"
                      />
                    </TableHead>
                    <TableHead className="min-w-[7.5rem] text-right">
                      <RosterColumnHeader label="Actions" align="right" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length ? (
                    pageRows.map((row) => (
                      <TableRow key={row.staffId}>
                        <TableCell
                          className={cn(
                            'sticky left-0 z-10 bg-background font-medium',
                            CELL_SEP
                          )}
                        >
                          {row.staffCode}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'sticky left-[8rem] z-10 bg-background',
                            CELL_SEP
                          )}
                        >
                          {row.staffName}
                        </TableCell>
                        {staffMetaVisible ? (
                          <>
                            <TableCell className={CELL_SEP}>
                              {row.department}
                            </TableCell>
                            <TableCell className={CELL_SEP}>{row.unit}</TableCell>
                            <TableCell className={CELL_SEP}>
                              {row.designation}
                            </TableCell>
                          </>
                        ) : null}
                        {dayIsos.map((dayIso) => {
                          const shift = row.shifts[dayIso];
                          const leaveKey = `${row.staffId}:${dayIso}`;
                          if (!shift) {
                            return (
                              <TableCell
                                key={dayIso}
                                className={cn(
                                  'text-xs text-muted-foreground',
                                  CELL_SEP
                                )}
                              >
                                {canEdit ? (
                                  <button
                                    type="button"
                                    className="w-full rounded-md px-1 py-2 text-left hover:bg-muted/50"
                                    onClick={() =>
                                      openAdd({ row, dateIso: dayIso })
                                    }
                                    aria-label={`Allocate shift for ${row.staffName} on ${dayIso}`}
                                  >
                                    —
                                  </button>
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                            );
                          }
                          const isLeave =
                            leaveOverrides[leaveKey] ?? shift.isLeave;
                          return (
                            <TableCell
                              key={dayIso}
                              className={cn('align-top', CELL_SEP)}
                            >
                              <ShiftChip
                                shift={{ ...shift, isLeave }}
                                onLeaveToggle={() =>
                                  toggleLeave(row.staffId, dayIso, isLeave)
                                }
                                onClick={
                                  canEdit
                                    ? () =>
                                        openEdit({
                                          row,
                                          dateIso: dayIso,
                                          shift
                                        })
                                    : undefined
                                }
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className={cn('tabular-nums', CELL_SEP)}>
                          {row.totalHours.toFixed(1)}
                        </TableCell>
                        <TableCell className={cn('tabular-nums', CELL_SEP)}>
                          {row.otHours.toFixed(1)}
                        </TableCell>
                        <TableCell className={CELL_SEP}>
                          <Badge
                            className={cn(
                              'rounded-full border-0 font-medium',
                              STATUS_STYLES[row.status]
                            )}
                          >
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <RosterRecordActions
                            record={row}
                            dayIsos={dayIsos}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={
                          (staffMetaVisible ? 5 : 2) + dayIsos.length + 4
                        }
                        className="h-24 text-center text-muted-foreground"
                      >
                        {hasActiveColumnFilters
                          ? 'No rows match the column filters.'
                          : 'No results found. Adjust filters and Load Roster.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground">
              <p>
                Drag a shift chip to another cell to reassign. Tick
                &apos;Leave&apos; to mark the cell as leave-covered.
              </p>
              {hasActiveColumnFilters ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setColumnFilters(emptyFilters(dayIsos))}
                >
                  Clear column filters
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {showingFrom}-{showingTo} of {processedRows.length} filtered
            ({totalRecords} total)
          </span>
          <Badge
            variant="outline"
            className={cn(
              'rounded-full',
              conflicts === 0
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-orange-200 bg-orange-50 text-orange-700'
            )}
          >
            {conflicts} conflicts
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium whitespace-nowrap">
              Rows per page
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="h-8 w-16 focus-visible:outline-0!">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 30].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={safePageIndex <= 0}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            >
              Prev
            </Button>
            {Array.from({ length: Math.min(pageCount, 3) }, (_, i) => (
              <Button
                key={i}
                type="button"
                size="sm"
                variant={safePageIndex === i ? 'default' : 'outline'}
                className="h-8 w-8 p-0"
                onClick={() => setPageIndex(i)}
              >
                {i + 1}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              disabled={safePageIndex >= pageCount - 1}
              onClick={() =>
                setPageIndex((p) => Math.min(pageCount - 1, p + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
