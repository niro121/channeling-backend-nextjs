'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  ExpandedState,
  GroupingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
  type Row
} from '@tanstack/react-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
  useToast
} from '@archmage/ui';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CommonDataTableProvider,
  type CommonDataTableContextValue
} from './common-data-table-context';
import { CommonDataTablePagination } from './common-data-table-pagination';

export type CommonDataTableGroupHeaderContext<TData> = {
  value: unknown;
  columnId: string;
  subRowCount: number;
  row: Row<TData>;
};

interface CommonDataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  rowCount: number;
  heading?: string;
  subHeading?: string;
  limit?: string;
  page?: string;
  /** If false, hides pagination controls (useful for static lists). */
  showPagination?: boolean;
  /** Enables row selection + bulk-delete modal plumbing for toolbar features. */
  haveBulkDelete?: boolean;
  deleteServerAction?: (ids: string[]) => Promise<boolean>;
  getBulkDeleteDescription?: (ids: string[]) => Promise<string> | string;
  toolbarLeft?: React.ReactNode;
  toolbarMiddle?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  /** Renders on the right side of the card header next to the title. */
  headingRight?: React.ReactNode;
  onRowClick?: (row: TData) => void;
  /**
   * Optional column ids to group rows by (TanStack Table grouping).
   * When set, group header rows are rendered above each group's leaf rows.
   */
  groupBy?: string | string[];
  /** When grouping, expand all groups by default (default: true). */
  groupByDefaultExpanded?: boolean;
  /** Custom label for a group header row. */
  renderGroupHeader?: (
    ctx: CommonDataTableGroupHeaderContext<TData>
  ) => React.ReactNode;
}

function normalizeGroupBy(groupBy?: string | string[]): string[] {
  if (!groupBy) return [];
  return (Array.isArray(groupBy) ? groupBy : [groupBy]).filter(Boolean);
}

export function CommonDataTable<TData, TValue>({
  columns,
  data,
  rowCount,
  heading,
  subHeading,
  limit,
  page,
  showPagination = true,
  haveBulkDelete = false,
  deleteServerAction,
  getBulkDeleteDescription,
  toolbarLeft,
  toolbarMiddle,
  toolbarRight,
  headingRight,
  onRowClick,
  groupBy,
  groupByDefaultExpanded = true,
  renderGroupHeader
}: CommonDataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const groupingColumns = React.useMemo(
    () => normalizeGroupBy(groupBy),
    [groupBy]
  );
  const groupingEnabled = groupingColumns.length > 0;

  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [grouping, setGrouping] = React.useState<GroupingState>(groupingColumns);
  const [expanded, setExpanded] = React.useState<ExpandedState>(
    groupByDefaultExpanded && groupingEnabled ? true : {}
  );
  const [showDeleteConfirmation, setShowDelConfirmation] =
    React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fetchingDescription, setFetchingDescription] = React.useState(false);
  const [bulkDeleteDescription, setBulkDeleteDescription] = React.useState(
    'This action cannot be undone. This will permanently delete these records and remove the data from our servers.'
  );

  useEffect(() => {
    setGrouping(groupingColumns);
    setExpanded(
      groupByDefaultExpanded && groupingColumns.length > 0 ? true : {}
    );
    if (groupingColumns.length > 0) {
      setColumnVisibility((prev) => {
        const next = { ...prev };
        for (const columnId of groupingColumns) {
          next[columnId] = false;
        }
        return next;
      });
    }
  }, [groupingColumns, groupByDefaultExpanded]);

  const table = useReactTable({
    data,
    columns,
    rowCount,
    enableRowSelection: haveBulkDelete,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    ...(groupingEnabled
      ? {
          getGroupedRowModel: getGroupedRowModel(),
          getExpandedRowModel: getExpandedRowModel(),
          autoResetExpanded: false
        }
      : {}),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    state: {
      rowSelection,
      columnVisibility,
      ...(groupingEnabled ? { grouping, expanded } : {})
    }
  });

  const getNewSearchParams = (value: number, filter: string) => {
    const params = new URLSearchParams();

    if (searchParams && searchParams.keys()) {
      Array.from(searchParams.keys()).forEach((key: string) => {
        if (key !== filter) {
          params.set(key, String(searchParams.get(key)));
        }
      });
    }

    params.set(filter, String(value));

    if (filter === 'limit' && rowCount / value < 1) {
      params.delete('page');
    }

    return router.replace(`${pathname}/?${params.toString()}`);
  };

  const onLimitChange = (nextLimit: number) => {
    getNewSearchParams(nextLimit, 'limit');
  };

  const onPageChange = (nextPage: number) => {
    getNewSearchParams(nextPage, 'page');
  };

  const onDeleteConfirmation = async () => {
    const idsToDelete: string[] = [];

    Object.keys(rowSelection).forEach((item) => {
      const row = table.getRow(item).original as { id: string };
      if (row.id) {
        idsToDelete.push(row.id);
      }
    });

    if (!deleteServerAction) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Bulk Delete not available.'
      });
      return;
    }

    try {
      setLoading(true);
      const success = await deleteServerAction(idsToDelete);
      setShowDelConfirmation(false);

      if (!success) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Records could not be deleted. Please try again.'
        });
        return;
      }

      toast({
        variant: 'success',
        title: 'Success',
        description: 'Records were deleted successfully'
      });
      setRowSelection({});
      router.refresh();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          error.message ?? 'Error deleting records. please try again later.'
      });
    } finally {
      setLoading(false);
      setShowDelConfirmation(false);
    }
  };

  const showHideDeleteModal = async (value: boolean) => {
    if (value) {
      const idsToDelete: string[] = [];
      Object.keys(rowSelection).forEach((item) => {
        const row = table.getRow(item).original as { id: string };
        if (row.id) {
          idsToDelete.push(row.id);
        }
      });

      if (getBulkDeleteDescription && idsToDelete.length > 0) {
        setFetchingDescription(true);
        try {
          const description = await getBulkDeleteDescription(idsToDelete);
          setBulkDeleteDescription(description);
          setShowDelConfirmation(true);
        } catch {
          setBulkDeleteDescription(
            'This action cannot be undone. This will permanently delete these records and remove the data from our servers.'
          );
          setShowDelConfirmation(true);
        } finally {
          setFetchingDescription(false);
        }
      } else {
        setBulkDeleteDescription(
          'This action cannot be undone. This will permanently delete these records and remove the data from our servers.'
        );
        setShowDelConfirmation(true);
      }
    } else {
      setBulkDeleteDescription(
        'This action cannot be undone. This will permanently delete these records and remove the data from our servers.'
      );
      setShowDelConfirmation(false);
    }
  };

  const formatDescription = (text: string): React.ReactNode => {
    const lines = text.split('\n');
    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={index}>
            {index > 0 && <br />}
            {line}
          </React.Fragment>
        ))}
      </>
    );
  };

  const hasWarning =
    bulkDeleteDescription.includes('doctor(s)') ||
    bulkDeleteDescription.includes('linked to other system records');

  useEffect(() => {
    if (limit) {
      table.setPageSize(Number(limit));
    }

    if (page) {
      table.setPageIndex(Number(page));
    }
  }, [table, limit, page]);

  const contextValue = React.useMemo<CommonDataTableContextValue>(
    () => ({
      table: table as unknown as CommonDataTableContextValue['table'],
      rowSelection,
      showHideDeleteModal,
      fetchingDescription
    }),
    // columnVisibility / grouping / expanded must be listed so consumers re-render
    // when those states change (useReactTable keeps a stable `table` reference).
    [
      table,
      rowSelection,
      fetchingDescription,
      columnVisibility,
      grouping,
      expanded
    ]
  );

  const hasHeading = Boolean(heading || subHeading || headingRight);
  const hasToolbar = Boolean(toolbarLeft || toolbarMiddle || toolbarRight);
  const visibleColumnCount = table.getVisibleLeafColumns().length;

  const renderDefaultGroupHeader = (
    ctx: CommonDataTableGroupHeaderContext<TData>
  ) => {
    const label =
      ctx.value == null || ctx.value === '' ? 'Ungrouped' : String(ctx.value);
    return (
      <span className="font-semibold text-foreground">
        {label}
        <span className="ml-2 font-normal text-muted-foreground">
          ({ctx.subRowCount})
        </span>
      </span>
    );
  };

  return (
    <CommonDataTableProvider value={contextValue}>
      <Card className="rounded-lg border border-border shadow-sm overflow-hidden">
        {hasHeading ? (
          <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 space-y-1.5">
              {heading ? (
                <CardTitle className="text-lg font-semibold">{heading}</CardTitle>
              ) : null}
              {subHeading ? (
                <CardDescription className="text-muted-foreground">
                  {subHeading}
                </CardDescription>
              ) : null}
            </div>
            {headingRight != null ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 pt-0.5 sm:pt-1">
                {headingRight}
              </div>
            ) : null}
          </CardHeader>
        ) : null}

        {hasToolbar ? (
          <div className="flex flex-col gap-3 px-6 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3">
              {toolbarLeft ?? null}
            </div>
            <div className="flex min-w-0 flex-wrap items-start justify-center gap-3">
              {toolbarMiddle ?? null}
            </div>
            <div className="flex min-w-0 flex-wrap items-start justify-end gap-2">
              {toolbarRight ?? null}
            </div>
          </div>
        ) : null}

        <CardContent
          className={cn('px-0 pb-0', !hasHeading && !hasToolbar && 'pt-4')}
        >
          <div className="px-4 pb-4">
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      if (groupingEnabled && row.getIsGrouped()) {
                        const groupedColumnId = row.groupingColumnId ?? '';
                        const groupCtx: CommonDataTableGroupHeaderContext<TData> =
                          {
                            value: row.getValue(groupedColumnId),
                            columnId: groupedColumnId,
                            subRowCount: row.subRows.length,
                            row
                          };

                        return (
                          <TableRow
                            key={row.id}
                            className="bg-muted/40 hover:bg-muted/50"
                          >
                            <TableCell
                              colSpan={Math.max(visibleColumnCount, 1)}
                              className="py-2.5"
                            >
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 text-left"
                                onClick={row.getToggleExpandedHandler()}
                              >
                                {row.getIsExpanded() ? (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                                )}
                                {renderGroupHeader
                                  ? renderGroupHeader(groupCtx)
                                  : renderDefaultGroupHeader(groupCtx)}
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                          className={cn(
                            onRowClick && 'cursor-pointer hover:bg-muted/50',
                            groupingEnabled && 'bg-background'
                          )}
                          onClick={
                            onRowClick
                              ? () => onRowClick(row.original)
                              : undefined
                          }
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {cell.getIsGrouped() || cell.getIsPlaceholder()
                                ? null
                                : flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>

        {showPagination ? (
          <CardFooter>
            <div className="w-full">
              <CommonDataTablePagination
                table={table}
                onLimitChange={onLimitChange}
                onPageChange={onPageChange}
              />
            </div>
          </CardFooter>
        ) : null}
      </Card>

      {haveBulkDelete ? (
        <AlertDialog
          open={showDeleteConfirmation}
          onOpenChange={(open) => {
            void showHideDeleteModal(open);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription
                className={cn(hasWarning && 'text-destructive')}
              >
                {fetchingDescription ? (
                  <span>Loading...</span>
                ) : (
                  formatDescription(bulkDeleteDescription)
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                disabled={loading || fetchingDescription}
                className="cursor-pointer"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDeleteConfirmation}
                disabled={loading || fetchingDescription}
                className="relative cursor-pointer"
              >
                Continue
                {(loading || fetchingDescription) && (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </CommonDataTableProvider>
  );
}
