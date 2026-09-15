'use client';

import { useState } from 'react';
import { formatExportFileName, printPdfUtil } from '@/lib/utils';
import { ExportButtons } from '@/components/common/export-btns';
import { useToast } from '@/components/hooks/use-toast';
import {
  downloadBrandedReportExcel,
  downloadBrandedReportPdf,
  type BrandedPdfSummaryItem,
} from '@/components/common/report-print';

export type ExportWrapperProps<T> = {
  serverData: () => Promise<{ success: boolean; data?: T[]; message?: string }>;
  data?: T[];
  columns: string[];
  keys: (keyof T)[];
  title?: string;
  fileName?: string;
  /** When true, shows the Print button (optional; wrapper is used in other components) */
  showPrintButton?: boolean;
  /**
   * When provided, Print uses browser printing (e.g. window.print + ReportPrintLayout)
   * instead of generating a jsPDF document.
   */
  onBrowserPrint?: () => void | Promise<void>;
  /** Optional: custom print handler (PDF generation). When not provided, uses default `printPdfUtil`. */
  customPrintPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
  }) => void | Promise<void>;
  /** Optional: custom PDF download handler. When not provided, uses branded hospital PDF. */
  customDownloadPdf?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
    fileName?: string;
  }) => void | Promise<void>;
  /**
   * Report Summary cells for branded PDF/Excel download (same structure as print header).
   * Ignored when the matching custom download handler is provided.
   */
  pdfSummaryItems?: BrandedPdfSummaryItem[] | (() => BrandedPdfSummaryItem[]);
  /** Timestamp shown in branded PDF/Excel footer / summary. Defaults to now. */
  pdfGeneratedAt?: string;
  /**
   * Optional: custom Excel download handler.
   * When not provided, uses branded hospital Excel (logo + Report Summary + table).
   */
  customDownloadExcel?: (args: {
    title: string;
    data: T[];
    columns: string[];
    keys: (keyof T)[];
    fileName?: string;
  }) => void | Promise<void>;
};

function resolveSummaryItems(
  pdfSummaryItems: BrandedPdfSummaryItem[] | (() => BrandedPdfSummaryItem[]) | undefined,
  generatedAt: string,
  recordCount: number
): BrandedPdfSummaryItem[] {
  const resolved =
    typeof pdfSummaryItems === 'function' ? pdfSummaryItems() : pdfSummaryItems;
  if (resolved?.length) return resolved;
  return [
    { label: 'Generated At', value: generatedAt },
    { label: 'Total Records', value: String(recordCount) },
  ];
}

export const ExportWrapper = <T,>({
  serverData,
  data,
  columns,
  keys,
  title = 'Report',
  fileName = 'report',
  showPrintButton = false,
  onBrowserPrint,
  customPrintPdf,
  customDownloadPdf,
  pdfSummaryItems,
  pdfGeneratedAt,
  customDownloadExcel
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

      if (onBrowserPrint) {
        await onBrowserPrint();
        return;
      }

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

      if (customDownloadPdf) {
        await customDownloadPdf({
          title,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.pdf`
        });
      } else {
        const generatedAt = pdfGeneratedAt ?? new Date().toLocaleString();
        await downloadBrandedReportPdf({
          reportName: title,
          summaryItems: resolveSummaryItems(pdfSummaryItems, generatedAt, response.data.length),
          generatedAt,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.pdf`,
        });
      }
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

      if (customDownloadExcel) {
        await customDownloadExcel({
          title,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.xlsx`
        });
      } else {
        const generatedAt = pdfGeneratedAt ?? new Date().toLocaleString();
        await downloadBrandedReportExcel({
          reportName: title,
          summaryItems: resolveSummaryItems(pdfSummaryItems, generatedAt, response.data.length),
          generatedAt,
          data: response.data,
          columns,
          keys,
          fileName: `${formattedFileName}.xlsx`,
          sheetName: title.slice(0, 31),
        });
      }
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
