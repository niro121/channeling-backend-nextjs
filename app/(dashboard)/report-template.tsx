'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { FilterWrapper } from '@/app/(dashboard)/filter-wrapper';
import { ExportWrapper } from '@/app/(dashboard)/export-wrapper';
import { useToast } from '@/components/hooks/use-toast';
import Loading from '@/app/(dashboard)/loading'

type FilterValues = Record<string, string | undefined>;

export interface ReportTemplateProps<T, E = T> {
  /** Report title */
  title: string;
  /** Report description */
  description?: string;
  /** Filter section - receives FilterWrapper's values and setValue */
  filterContent: (props: {
    values: FilterValues;
    setValue: (key: string, value?: string) => void;
  }) => React.ReactNode;
  /** Custom filter button label (default: "Apply") */
  filterButtonLabel?: string;
  /** Fetch report data - receives current URL params */
  fetchData: (
    searchParams: URLSearchParams
  ) => Promise<{
    success: boolean;
    data: T[];
    totalRecords: number;
    message?: string;
  }>;
  /** Export data for PDF/Excel (can use different shape E for flattened export rows) */
  exportData: () => Promise<{
    success: boolean;
    data?: E[];
    message?: string;
  }>;
  /** TanStack Table column definitions */
  columns: ColumnDef<T>[];
  /** Export column headers (for PDF/Excel) */
  exportColumns: string[];
  /** Export data keys (for PDF/Excel) */
  exportKeys: (keyof E)[];
  /** Export title (default: uses report title) */
  exportTitle?: string;
  /** Export file name base (default: slugified title) */
  exportFileName?: string;
  /** Get unique row id */
  getRowId: (row: T) => string;
  /** Show Print button (optional, default: true for reports) */
  showPrintButton?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** When true, do not fetch data on initial load when URL has no filter params. Fetch only after user applies filters. */
  skipFetchWhenNoParams?: boolean;
  /** Optional: initial filter values used only when the URL has no query params (e.g. prefill date range without fetching). */
  initialFilterValues?: FilterValues;
  /** Optional: group rows by this key. When provided, renders group headers between row groups. */
  groupBy?: (row: T) => string;
  /** Optional: render group header. Receives group key and rows in that group. Only used when groupBy is provided. */
  renderGroupHeader?: (groupKey: string, rows: T[]) => React.ReactNode;
  /** Optional: render totals row. Receives all data rows and column count. Returns a TableRow to render after the data. */
  renderTotalsRow?: (data: T[], columnCount: number) => React.ReactNode;
}

function ReportTemplateContent<T, E = T>({
  title,
  description,
  filterContent,
  filterButtonLabel = 'Apply',
  fetchData,
  exportData,
  columns,
  exportColumns,
  exportKeys,
  exportTitle,
  exportFileName,
  getRowId,
  showPrintButton = true,
  emptyMessage = 'No data found',
  skipFetchWhenNoParams = false,
  initialFilterValues,
  groupBy,
  renderGroupHeader,
  renderTotalsRow
}: ReportTemplateProps<T, E>) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  const initialValues = React.useMemo(() => {
    const vals: FilterValues = {};
    searchParams.forEach((value, key) => {
      vals[key] = value;
    });
    // If URL has no params, allow caller to provide initial values (without triggering a fetch).
    if (!searchParams.toString() && initialFilterValues) {
      return { ...initialFilterValues };
    }
    return vals;
  }, [searchParams, initialFilterValues]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const result = await fetchData(searchParams);
      if (result.success) {
        setData(result.data);
        setTotalRecords(result.totalRecords);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.message || 'Failed to fetch report data'
        });
        setData([]);
        setTotalRecords(0);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to fetch report data';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: msg
      });
      setData([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (skipFetchWhenNoParams && !searchParams.toString()) {
      setLoading(false);
      setData([]);
      setTotalRecords(0);
      return;
    }
    fetchReportData();
  }, [searchParams.toString(), skipFetchWhenNoParams]);

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  const effectiveExportTitle = exportTitle ?? title;
  const effectiveExportFileName =
    exportFileName ?? `${slugify(title)}-${new Date().toISOString().split('T')[0]}`;

  const getNestedValue = (obj: T, path: string): unknown => {
    const keys = path.split('.');
    let v: unknown = obj;
    for (const k of keys) {
      v = (v as Record<string, unknown>)?.[k];
    }
    return v;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-bold">{title}</CardTitle>
              {description && (
                <CardDescription>{description}</CardDescription>
              )}
            </div>
            <ExportWrapper<E>
              serverData={exportData}
              columns={exportColumns}
              keys={exportKeys}
              title={effectiveExportTitle}
              fileName={effectiveExportFileName}
              showPrintButton={showPrintButton}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 pb-4 border-b">
            <FilterWrapper
              key={searchParams.toString()}
              initialValues={initialValues}
              buttonLabel={filterButtonLabel}
              onApplyClick={() => {
                setLoading(true);
              }}
              showClearButton
            >
              {filterContent}
            </FilterWrapper>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Total Records: {totalRecords}
              </p>
            </div>

            {loading ? (
              <Loading />
            ) : data.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {groupBy && (
                        <TableHead className="w-0 opacity-0" aria-hidden />
                      )}
                      {columns.map((column) => {
                        let header: React.ReactNode;
                        const accKey = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
                        if (typeof column.header === 'function') {
                          try {
                            const headerResult = column.header({
                              table: {
                                getIsAllPageRowsSelected: () => false,
                                getIsSomePageRowsSelected: () => false,
                                toggleAllPageRowsSelected: () => {}
                              } as never,
                              column: {} as never,
                              header: {} as never
                            } as never);
                            header = (headerResult != null && (typeof headerResult === 'string' || typeof headerResult === 'number' || typeof headerResult === 'boolean' || React.isValidElement(headerResult as React.ReactElement)))
                              ? headerResult
                              : '';
                          } catch {
                            const raw = (column as { header?: unknown }).header;
                            header = (raw !== null && raw !== undefined && (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' || React.isValidElement(raw as React.ReactElement))
                              ? (raw as React.ReactNode)
                              : '') as React.ReactNode;
                          }
                        } else {
                          const raw = column.header;
                          header = (raw !== null && raw !== undefined && (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean' || React.isValidElement(raw as React.ReactElement)))
                            ? (raw as React.ReactNode)
                            : '';
                        }
                        const safeHeader: React.ReactNode =
                          header == null ||
                          (typeof header === 'object' && !React.isValidElement(header as React.ReactElement))
                            ? ''
                            : header;
                        return (
                          <TableHead key={column.id ?? accKey ?? String(header)}>
                            {safeHeader}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupBy
                      ? (() => {
                          const groups = new Map<string, T[]>();
                          for (const row of data) {
                            const key = groupBy(row);
                            if (!groups.has(key)) groups.set(key, []);
                            groups.get(key)!.push(row);
                          }
                          const entries = Array.from(groups.entries());
                          return entries.flatMap(([groupKey, rows]) => {
                            const headerRow =
                              renderGroupHeader ? (
                                <TableRow key={`group-${groupKey}`} className="bg-muted/50 hover:bg-muted/50">
                                  <TableCell
                                    colSpan={columns.length + (groupBy !== undefined ? 1 : 0)}
                                    className="font-semibold py-2"
                                  >
                                    {renderGroupHeader(groupKey, rows)}
                                  </TableCell>
                                </TableRow>
                              ) : null;
                            const dataRows = rows.map((row) => (
                              <TableRow key={getRowId(row)}>
                                {groupBy && groupBy !== undefined && (
                                  <TableCell className="w-0 p-0" aria-hidden />
                                )}
                                {columns.map((column) => {
                                  const accessorKey = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
                                  const cell =
                                    typeof column.cell === 'function'
                                      ? column.cell({
                                          row: {
                                            getValue: (key: string) => getNestedValue(row, key),
                                            original: row
                                          } as never
                                        } as never)
                                      : accessorKey ? getNestedValue(row, accessorKey) : undefined;
                                  return (
                                    <TableCell key={column.id ?? accessorKey ?? ''}>
                                      {cell != null && cell !== '' ? cell : '-'}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ));
                            return headerRow ? [headerRow, ...dataRows] : dataRows;
                          });
                        })()
                      : data.map((row) => (
                          <TableRow key={getRowId(row)}>
                            {columns.map((column) => {
                              const accessorKey = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
                              const cell =
                                typeof column.cell === 'function'
                                  ? column.cell({
                                      row: {
                                        getValue: (key: string) => getNestedValue(row, key),
                                        original: row
                                      } as never
                                    } as never)
                                  : accessorKey ? getNestedValue(row, accessorKey) : undefined;
                              return (
                                <TableCell key={column.id ?? accessorKey ?? ''}>
                                  {cell != null && cell !== '' ? cell : '-'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                  </TableBody>
                  {renderTotalsRow && data.length > 0 && (
                    <TableFooter>
                      {renderTotalsRow(data, columns.length + (groupBy ? 1 : 0))}
                    </TableFooter>
                  )}
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ReportTemplate<T, E = T>(props: ReportTemplateProps<T, E>) {
  return (
    <Suspense fallback={<Loading />}>
      <ReportTemplateContent<T, E> {...props} />
    </Suspense>
  );
}
