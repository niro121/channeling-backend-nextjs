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
import { BackButton } from '@/components/common/back-button';
import { useToast } from '@/components/hooks/use-toast';
import Loading from '@/app/(dashboard)/loading'
import { ReportEmptyStateCard } from '@/components/common/report-empty-state';
import { ReportGenerationDetailsCard } from '@/components/common/report-generation-details';
import { cn } from '@/lib/utils';

type FilterValues = Record<string, string | undefined>;

function getReportColumnKey<T>(column: ColumnDef<T>): string {
  const acc = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
  const accStr = typeof acc === 'string' ? acc : '';
  return String(column.id ?? accStr ?? '');
}

export type ReportColumnMeta = {
  headerClassName?: string;
  cellClassName?: string;
};

function getReportColumnMeta<T>(column: ColumnDef<T>): ReportColumnMeta {
  return (column.meta as ReportColumnMeta | undefined) ?? {};
}

function coerceNumberForTotal(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(String(v).replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

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
  /** Optional: override the PDF print generation for this report only. */
  customPrintPdf?: (args: {
    title: string;
    data: E[];
    columns: string[];
    keys: (keyof E)[];
  }) => void | Promise<void>;
  /** Optional: override the PDF download generation for this report only. */
  customDownloadPdf?: (args: {
    title: string;
    data: E[];
    columns: string[];
    keys: (keyof E)[];
    fileName?: string;
  }) => void | Promise<void>;
  /** Optional: override the Excel download generation for this report only. */
  customDownloadExcel?: (args: {
    title: string;
    data: E[];
    columns: string[];
    keys: (keyof E)[];
    fileName?: string;
  }) => void | Promise<void>;
  /** Empty state message */
  emptyMessage?: string;
  /** When skipFetchWhenNoParams is true, message shown before first search (no URL params yet). */
  initialEmptyMessage?: string;
  /** When true, do not fetch data on initial load when URL has no filter params. Fetch only after user applies filters. */
  skipFetchWhenNoParams?: boolean;
  /** Optional: initial filter values used only when the URL has no query params (e.g. prefill date range without fetching). */
  initialFilterValues?: FilterValues;
  /** Optional: group rows by this key. When provided, renders group headers between row groups. */
  groupBy?: (row: T) => string;
  /** Optional: render group header. Receives group key and rows in that group. Only used when groupBy is provided. */
  renderGroupHeader?: (groupKey: string, rows: T[]) => React.ReactNode;
  /** Optional: render a table footer row (e.g. totals). Receives current data set. */
  footerRow?: (rows: T[]) => React.ReactNode;
  /**
   * Optional: auto-render a single totals footer row for these column ids/keys.
   * Column id resolution uses `column.id` first, then string `accessorKey`.
   */
  totalColumnIds?: string[];
  /** Optional label for the totals row (default: "Total"). */
  totalRowLabel?: React.ReactNode;
  /** Optional: compute numeric value for a given row+columnId for totals. */
  getTotalNumericValue?: (row: T, columnId: string) => number;
  /** Optional: format totals cell value. */
  formatTotalValue?: (columnId: string, sum: number) => React.ReactNode;
  /** Optional: return rowSpan per cell; return 0 to suppress rendering that cell. */
  getCellRowSpan?: (row: T, columnId: string, rowIndex: number, rows: T[]) => number | undefined;
  /** Back button destination (default: /reports) */
  backHref?: string;
  /** Show/hide the back button (default: true). */
  showBackButton?: boolean;
  /** Override the outer wrapper className for spacing. */
  containerClassName?: string;
  /** Optional className for the report table element. */
  tableClassName?: string;
  /** Optional: show standardized "Report Generation Details" after a search run. */
  generationDetails?: {
    /** "Generated by" label value, typically the current user display name. */
    generatedBy: string;
    /** Convert filter values into a readable summary (shown under "Filters"). */
    formatFilters: (values: FilterValues) => React.ReactNode;
  };
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
  customPrintPdf,
  customDownloadPdf,
  customDownloadExcel,
  emptyMessage = 'No data found',
  initialEmptyMessage,
  skipFetchWhenNoParams = false,
  initialFilterValues,
  groupBy,
  renderGroupHeader,
  footerRow,
  totalColumnIds,
  totalRowLabel = 'Total',
  getTotalNumericValue,
  formatTotalValue,
  getCellRowSpan,
  backHref = '/reports',
  showBackButton = true,
  containerClassName = 'container mx-auto py-3 space-y-4',
  tableClassName,
  generationDetails,
}: ReportTemplateProps<T, E>) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const lastFetchedParamsRef = React.useRef<string | null>(null);
  const [lastRun, setLastRun] = useState<{
    values: FilterValues;
    generatedAt: string;
  } | null>(null);

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

  const paramsKey = searchParams.toString();
  const isInitialNoParams = skipFetchWhenNoParams && !paramsKey;
  const effectiveEmptyMessage =
    isInitialNoParams && initialEmptyMessage ? initialEmptyMessage : emptyMessage;

  const paramsToValues = React.useCallback((params: URLSearchParams): FilterValues => {
    const vals: FilterValues = {};
    params.forEach((value, key) => {
      vals[key] = value;
    });
    return vals;
  }, []);

  const fetchReportDataWithParams = React.useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    try {
      const result = await fetchData(params);
      if (result.success) {
        setData(result.data);
        setTotalRecords(result.totalRecords);
        // Treat any successful fetch as a "run" so meta shows even for 0 results.
        if (generationDetails) {
          setLastRun({
            values: paramsToValues(params),
            generatedAt: new Date().toLocaleString(),
          });
        }
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
  }, [fetchData, toast, generationDetails, paramsToValues]);

  useEffect(() => {
    if (skipFetchWhenNoParams && !paramsKey) {
      setLoading(false);
      setData([]);
      setTotalRecords(0);
      lastFetchedParamsRef.current = null;
      setLastRun(null);
      return;
    }
    // Skip if we just fetched with these params via onApplyClick (avoids duplicate fetch)
    if (lastFetchedParamsRef.current === paramsKey) {
      return;
    }
    lastFetchedParamsRef.current = paramsKey;
    fetchReportDataWithParams(searchParams);
    // fetchReportDataWithParams omitted to avoid re-run when fetchData prop identity changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const accessorPathByColumnKey = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) {
      const key = getReportColumnKey(col);
      const acc = (col as ColumnDef<T> & { accessorKey?: string }).accessorKey;
      if (typeof acc === 'string' && acc) map.set(key, acc);
    }
    return map;
  }, [columns]);

  const columnTotalSums = React.useMemo(() => {
    const ids = totalColumnIds;
    if (!ids?.length) return {} as Record<string, number>;
    const sums: Record<string, number> = {};
    for (const colId of ids) {
      let sum = 0;
      for (const row of data) {
        let n: number;
        if (getTotalNumericValue) {
          n = getTotalNumericValue(row, colId);
        } else {
          const path = accessorPathByColumnKey.get(colId);
          n = path ? coerceNumberForTotal(getNestedValue(row, path)) : 0;
        }
        sum += Number.isFinite(n) ? n : 0;
      }
      sums[colId] = sum;
    }
    return sums;
  }, [data, totalColumnIds, getTotalNumericValue, accessorPathByColumnKey, getNestedValue]);

  const defaultFormatTotal = React.useCallback((_columnId: string, sum: number) => {
    return sum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  return (
    <div className={containerClassName}>
      {showBackButton && (
        <div className="flex justify-end">
          <BackButton href={backHref} className="w-fit" />
        </div>
      )}
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
              customPrintPdf={customPrintPdf}
              customDownloadPdf={customDownloadPdf}
              customDownloadExcel={customDownloadExcel}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-end mb-6 pb-4 border-b">
            <FilterWrapper
              key={searchParams.toString()}
              initialValues={initialValues}
              buttonLabel={filterButtonLabel}
              onApplyClick={(params) => {
                if (params) {
                  lastFetchedParamsRef.current = params.toString();
                  fetchReportDataWithParams(params);
                } else {
                  setLoading(true);
                }
              }}
              showClearButton
              searchButton={{
                variant: "default"
              }}
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

            {generationDetails && lastRun && !isInitialNoParams && (
              <ReportGenerationDetailsCard
                items={[
                  { label: 'Report', value: <span className="font-semibold">{title}</span> },
                  {
                    label: 'Filters',
                    value: generationDetails.formatFilters(lastRun.values),
                    smColSpan: 2,
                  },
                  {
                    label: 'Generated by',
                    value: <span className="font-semibold">{generationDetails.generatedBy}</span>,
                  },
                  {
                    label: 'Generated at',
                    value: <span className="font-semibold">{lastRun.generatedAt}</span>,
                  },
                ]}
              />
            )}

            {loading ? (
              <Loading />
            ) : data.length === 0 ? (
              <ReportEmptyStateCard
                title={isInitialNoParams ? 'Run a search to view results' : 'No results'}
                description={effectiveEmptyMessage}
              />
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table className={tableClassName}>
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
                        const colMeta = getReportColumnMeta(column);
                        return (
                          <TableHead
                            key={column.id ?? accKey ?? String(header)}
                            className={cn(colMeta.headerClassName)}
                          >
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
                                    className="font-semibold text-muted-foreground py-2"
                                  >
                                    {renderGroupHeader(groupKey, rows)}
                                  </TableCell>
                                </TableRow>
                              ) : null;
                            const dataRows = rows.map((row, idx) => (
                              <TableRow key={getRowId(row)}>
                                {groupBy && groupBy !== undefined && (
                                  <TableCell className="w-0 p-0" aria-hidden />
                                )}
                                {columns.map((column) => {
                                  const accessorKey = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
                                  const columnKey = getReportColumnKey(column);
                                  const rowSpan = getCellRowSpan?.(row, columnKey, idx, rows);
                                  if (rowSpan === 0) return null;
                                  const cell =
                                    typeof column.cell === 'function'
                                      ? column.cell({
                                          row: {
                                            getValue: (key: string) => getNestedValue(row, key),
                                            original: row,
                                            index: idx
                                          } as never
                                        } as never)
                                      : accessorKey ? getNestedValue(row, accessorKey) : undefined;
                                  const colMeta = getReportColumnMeta(column);
                                  return (
                                    <TableCell
                                      key={column.id ?? accessorKey ?? ''}
                                      rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                                      className={cn(colMeta.cellClassName)}
                                    >
                                      {cell != null && cell !== '' ? cell : '-'}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ));
                            return headerRow ? [headerRow, ...dataRows] : dataRows;
                          });
                        })()
                      : data.map((row, idx) => (
                          <TableRow key={getRowId(row)}>
                            {columns.map((column) => {
                              const accessorKey = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
                              const columnKey = getReportColumnKey(column);
                              const rowSpan = getCellRowSpan?.(row, columnKey, idx, data);
                              if (rowSpan === 0) return null;
                              const cell =
                                typeof column.cell === 'function'
                                  ? column.cell({
                                      row: {
                                        getValue: (key: string) => getNestedValue(row, key),
                                        original: row,
                                        index: idx
                                      } as never
                                    } as never)
                                  : accessorKey ? getNestedValue(row, accessorKey) : undefined;
                              const colMeta = getReportColumnMeta(column);
                              return (
                                <TableCell
                                  key={column.id ?? accessorKey ?? ''}
                                  rowSpan={rowSpan && rowSpan > 1 ? rowSpan : undefined}
                                  className={cn(colMeta.cellClassName)}
                                >
                                  {cell != null && cell !== '' ? cell : '-'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                  </TableBody>
                  {(footerRow || (totalColumnIds && totalColumnIds.length > 0)) && (
                    <TableFooter>
                      {footerRow ? footerRow(data) : null}
                      {totalColumnIds && totalColumnIds.length > 0 && (
                        <TableRow className="hover:bg-muted/50 font-normal [&_td]:align-middle">
                          {groupBy && <TableCell className="w-0 p-0" aria-hidden />}
                          {(() => {
                            const idSet = new Set(totalColumnIds);
                            return columns.map((column, colIndex) => {
                              const colKey = getReportColumnKey(column);
                              const isTotalCol = idSet.has(colKey);
                              let content: React.ReactNode = null;
                              if (colIndex === 0) {
                                content = totalRowLabel;
                              } else if (isTotalCol) {
                                const sum = columnTotalSums[colKey] ?? 0;
                                content = formatTotalValue
                                  ? formatTotalValue(colKey, sum)
                                  : defaultFormatTotal(colKey, sum);
                              }
                              const colMeta = getReportColumnMeta(column);
                              return (
                                <TableCell
                                  key={column.id ?? (colKey || colIndex)}
                                  className={cn(
                                    'whitespace-nowrap',
                                    colIndex === 0 && 'text-left font-bold',
                                    isTotalCol && 'text-right tabular-nums font-bold',
                                    colMeta.cellClassName
                                  )}
                                >
                                  {isTotalCol && content != null ? (
                                    <span className="block w-full text-right tabular-nums">{content}</span>
                                  ) : (
                                    content
                                  )}
                                </TableCell>
                              );
                            });
                          })()}
                        </TableRow>
                      )}
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
