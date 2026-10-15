'use client';

import { useState } from 'react';
import { ExportButtons, useToast } from '@archmage/ui';
import {
  downloadExcelUtil,
  downloadPdfUtil,
  formatExportFileName,
  printPdfUtil,
} from '@/lib/export-utils';

export type ExportWrapperProps<T> = {
  serverData: () => Promise<{ success: boolean; data?: T[]; message?: string }>;
  columns: string[];
  keys: (keyof T)[];
  title?: string;
  fileName?: string;
  showPrintButton?: boolean;
};

export function ExportWrapper<T>({
  serverData,
  columns,
  keys,
  title = 'Report',
  fileName = 'report',
  showPrintButton = false,
}: ExportWrapperProps<T>) {
  const { toast } = useToast();
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);

  const formattedFileName = formatExportFileName(fileName);

  const handlePrint = async () => {
    try {
      setLoadingPrint(true);
      const response = await serverData();

      if (!response.success || !response.data?.length) {
        toast({
          variant: 'destructive',
          title: 'No data to print',
          description: response.message || 'No data available for printing',
        });
        return;
      }

      printPdfUtil({ title, data: response.data, columns, keys });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to print',
      });
    } finally {
      setLoadingPrint(false);
    }
  };

  const handlePdfDownload = async () => {
    try {
      setLoadingPdf(true);
      const response = await serverData();

      if (!response.success || !response.data?.length) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'No data available',
        });
        return;
      }

      downloadPdfUtil({
        title,
        data: response.data,
        columns,
        keys,
        fileName: `${formattedFileName}.pdf`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export PDF',
      });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExcelDownload = async () => {
    try {
      setLoadingExcel(true);
      const response = await serverData();

      if (!response.success || !response.data?.length) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'No data available',
        });
        return;
      }

      await downloadExcelUtil({
        title,
        data: response.data,
        columns,
        keys,
        fileName: `${formattedFileName}.xlsx`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to export Excel',
      });
    } finally {
      setLoadingExcel(false);
    }
  };

  return (
    <ExportButtons
      onPdfExport={handlePdfDownload}
      onExcelExport={handleExcelDownload}
      onPrintExport={handlePrint}
      loadingPdf={loadingPdf}
      loadingExcel={loadingExcel}
      loadingPrint={loadingPrint}
      showPrintButton={showPrintButton}
    />
  );
}
