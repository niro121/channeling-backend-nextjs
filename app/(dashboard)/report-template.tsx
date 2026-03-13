'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
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
  emptyMessage = 'No data found'
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
    return vals;
  }, [searchParams]);

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
    fetchReportData();
  }, [searchParams.toString()]);

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
                    {data.map((row) => (
                      <TableRow key={getRowId(row)}>
                        {columns.map((column) => {
                          const accessorKey = (column as ColumnDef<T> & { accessorKey?: string }).accessorKey;
                          let value: unknown;
                          if (accessorKey) {
                            value = getNestedValue(row, accessorKey);
                          } else {
                            value = undefined;
                          }

                          const cell =
                            typeof column.cell === 'function'
                              ? column.cell({
                                  row: {
                                    getValue: (key: string) => getNestedValue(row, key),
                                    original: row
                                  } as never
                                } as never)
                              : value;

                          return (
                            <TableCell key={column.id ?? accessorKey ?? ''}>
                              {cell != null && cell !== '' ? cell : '-'}
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

export function ReportTemplate<T, E = T>(props: ReportTemplateProps<T, E>) {
  return (
    <Suspense fallback={<Loading />}>
      <ReportTemplateContent<T, E> {...props} />
    </Suspense>
  );
}
