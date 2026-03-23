'use client';

import { useState } from 'react';
import { downloadExcelUtil, downloadPdfUtil, formatExportFileName, printPdfUtil } from '@/lib/utils';
import { ExportButtons } from '@/components/common/export-btns';
import { useToast } from '@/components/hooks/use-toast';

export type ExportWrapperProps<T> = {
  serverData: () => Promise<{ success: boolean; data?: T[]; message?: string }>;
  data?: T[];
  columns: string[];
  keys: (keyof T)[];
  title?: string;
  fileName?: string;
  /** When true, shows the Print button (optional; wrapper is used in other components) */
  showPrintButton?: boolean;
  /** Optional: custom print handler (PDF generation). When not provided, uses default `printPdfUtil`. */
  customPrintPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
  }) => void | Promise<void>;
};

export const ExportWrapper = <T,>({
  serverData,
  data,
  columns,
  keys,
  title = 'Report',
  fileName = 'report',
  showPrintButton = false,
  customPrintPdf
}: ExportWrapperProps<T>) => {
  const { toast } = useToast();
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPrint, setLoadingPrint] = useState(false);

  // Format the file name with the standard suffix
  const formattedFileName = formatExportFileName(fileName);

  const handlePrint = async () => {
    try {
      setLoadingPrint(true);
      const response = await serverData();

      if (!response.success || !response.data?.length) {
        toast({
          variant: 'destructive',
          title: 'No data to print',
          description: response.message || 'No data available for printing'
        });
        return;
      }

      if (customPrintPdf) {
        await customPrintPdf({
          title,
          data: response.data,
          columns,
          keys
        });
      } else {
        printPdfUtil({
          title,
          data: response.data,
          columns,
          keys
        });
      }
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to print'
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
        console.error(response.message || 'No data available');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'No data available'
        });
        return;
      }

      downloadPdfUtil({
        title,
        data: response.data,
        columns,
        keys,
        fileName: `${formattedFileName}.pdf`
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to export PDF'
      });
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleExcelDownload = async () => {
    try {
      setLoadingExcel(true);
      const response = await serverData()

      if (!response.success || !response.data?.length) {
        console.error(response.message || 'No data available');
        toast({
          variant: 'destructive',
          title: 'Error',
          description: response.message || 'No data available'
        });
        return;
      }

      downloadExcelUtil({
        title,
        data: response.data,
        columns,
        keys,
        fileName: `${formattedFileName}.xlsx`
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to export Excel'
      });
    } finally {
      setLoadingExcel(false);
    }
  }

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
};
